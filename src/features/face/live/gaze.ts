import { isLookingAtCamera } from './headPose';
import {
  createSegmentBufferState,
  flushSegmentBuffer,
  stepSegmentBuffer,
  type Segment,
  type SegmentBufferState,
} from './segmentBuffer';

export type GazeState = 'fixation' | 'aversion';

export interface SmoothedGaze {
  yaw: number;
  pitch: number;
  ox: number;
  oy: number;
}

/** backend _smooth(EMA 스무딩)의 1:1 포팅 — 프레임 잡음으로 인한 순간적인
 * fixation/aversion 뒤집힘(flicker)을 줄인다. */
export function smoothGaze(prev: SmoothedGaze | null, next: SmoothedGaze, alpha = 0.3): SmoothedGaze {
  if (prev === null) return next;
  return {
    yaw: alpha * next.yaw + (1 - alpha) * prev.yaw,
    pitch: alpha * next.pitch + (1 - alpha) * prev.pitch,
    ox: alpha * next.ox + (1 - alpha) * prev.ox,
    oy: alpha * next.oy + (1 - alpha) * prev.oy,
  };
}

export interface GazeFsmState {
  smoothed: SmoothedGaze | null;
  segmentBuffer: SegmentBufferState;
}

export function createGazeFsmState(): GazeFsmState {
  return { smoothed: null, segmentBuffer: createSegmentBufferState() };
}

/**
 * 한 프레임 처리. raw가 null이면(얼굴 미검출) 무조건 aversion으로 취급한다
 * (backend와 동일 — "화면 밖으로 나간 것도 회피로 봄"). 검출됐으면 EMA
 * 스무딩 후 isLookingAtCamera로 판정해서 segmentBuffer에 흘려보내고, 새로
 * 확정된 구간이 있으면 반환한다.
 */
export function stepGaze(
  state: GazeFsmState,
  t: number,
  raw: { yaw: number; pitch: number; ox: number; oy: number } | null,
  baselineYaw = 0,
  baselinePitch = 0,
  smoothingAlpha = 0.3,
  minSegmentSec = 0.3,
  /** 캘리브레이션 눈동자 기준(calibrateBaselineIris). 기본 0 = 예전 판정 */
  baselineIrisX = 0,
  baselineIrisY = 0,
): Segment | null {
  let gazeState: GazeState;
  if (raw === null) {
    gazeState = 'aversion';
  } else {
    state.smoothed = smoothGaze(state.smoothed, raw, smoothingAlpha);
    const looking = isLookingAtCamera(
      state.smoothed.yaw,
      state.smoothed.pitch,
      state.smoothed.ox,
      state.smoothed.oy,
      baselineYaw,
      baselinePitch,
      undefined,
      undefined,
      undefined,
      baselineIrisX,
      baselineIrisY,
    );
    gazeState = looking ? 'fixation' : 'aversion';
  }
  return stepSegmentBuffer(state.segmentBuffer, t, gazeState, minSegmentSec);
}

export function flushGaze(state: GazeFsmState): Segment | null {
  return flushSegmentBuffer(state.segmentBuffer);
}

/** 배치 래퍼 — backend detect_gaze_segments와 같은 입력 형태(raw 시리즈)를
 * 순서대로 재생해서 최종 구간 리스트를 낸다. 테스트/동등성 검증용. */
export function detectGazeSegmentsBatch(
  series: [number, { yaw: number; pitch: number; ox: number; oy: number } | null][],
  baselineYaw = 0,
  baselinePitch = 0,
  smoothingAlpha = 0.3,
  minSegmentSec = 0.3,
): Segment[] {
  const state = createGazeFsmState();
  for (const [t, raw] of series) {
    stepGaze(state, t, raw, baselineYaw, baselinePitch, smoothingAlpha, minSegmentSec);
  }
  flushGaze(state);
  return state.segmentBuffer.committed;
}

/**
 * 0.4초 넘게 눈이 감긴 구간(blink.ts MAX_BLINK_DURATION)을 시선 이탈로 바꾼다 — 2026-11.
 * 아래를 보면 눈꺼풀이 따라 내려가 eyeBlink가 올라가고(Becker & Fuchs, 1988), 고개·눈동자 값은 기준 안에 남아
 * "하루를 봄"으로 잡히던 문제(3명 중 1명이 대답 중 아래를 본 3.3초가 그대로 "봄"이었음). 웃거나 찡그려서 눈이
 * 가늘어진 건 호출하는 쪽에서 미리 뺀다(미소 중 감김은 넘기지 않음 — useLiveFaceSession).
 *
 * (하루의 몸을 보는 것도 이탈로 보려고 "하루의 어깨 보기" 캘리브레이션 경계를 만들었다가 뺐다 — 고개 없이 눈만 내리면
 * 웹캠이 구분하지 못해 경계가 항상 꺼졌다. backend step2/ACCURACY_NOTES.md 참고)
 */
export function markClosuresAsAversion(segments: Segment[], closures: { start: number; end: number }[]): Segment[] {
  if (!closures.length) return segments;
  const pieces: Segment[] = [];
  for (const seg of segments) {
    if (seg.type !== 'fixation') {
      pieces.push({ ...seg });
      continue;
    }
    let cursor = seg.start;
    const cuts = closures
      .filter((c) => c.end > seg.start && c.start < seg.end)
      .sort((a, b) => a.start - b.start);
    for (const c of cuts) {
      const a = Math.max(c.start, seg.start);
      const b = Math.min(c.end, seg.end);
      if (a > cursor) pieces.push({ type: 'fixation', start: cursor, end: a });
      if (b > Math.max(a, cursor)) pieces.push({ type: 'aversion', start: Math.max(a, cursor), end: b });
      cursor = Math.max(cursor, b);
    }
    if (seg.end > cursor) pieces.push({ type: 'fixation', start: cursor, end: seg.end });
  }
  // 이어 붙은 같은 종류는 합친다
  const merged: Segment[] = [];
  for (const p of pieces) {
    const last = merged[merged.length - 1];
    if (last && last.type === p.type && Math.abs(last.end - p.start) < 1e-9) last.end = p.end;
    else merged.push({ ...p });
  }
  return merged;
}
