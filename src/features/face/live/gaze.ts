import { isLookingAtCamera, type VerticalBoundary, type VerticalChannel } from './headPose';
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
  /** 두 단계 캘리브레이션의 위아래 경계(makeVerticalBoundary). 없으면 예전 판정 */
  vertical: VerticalBoundary | null = null,
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
      vertical,
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
 * 두 단계 캘리브레이션(하루의 눈 3초 → 하루의 어깨 2초, calibration.ts calibStepAt)으로 위아래 경계를 만든다 — 2026-11.
 *
 * 팀 결정: 하루의 얼굴(눈 근처)을 보면 "본다", 몸을 보면 "시선 이탈". 사회불안이 있는 사람은 상대의 눈·얼굴을
 * 피한다는 연구(Horley, Williams, Gonsalvez & Gordon, 2003, J Anxiety Disord 17:33–44)에 맞춰, 훈련에서 보는 대상을
 * "얼굴"로 둔다. 웹캠 시선 추적은 정밀도가 낮아(Semmelmann & Weigelt, 2018, Behav Res Methods 50:451–465)
 * 눈·코·입까지 나누지 않고 얼굴과 몸(노트북 거리에서 약 10° 차이)만 나눈다. 화면 크기·거리·안경이 사람마다 달라
 * 고정 숫자 대신 사람마다 두 위치를 재고, 그 가운데를 경계로 쓴다.
 *
 * 안전장치(예전 녹화에는 몸 값이 없어 3명으로 확인하지 못했으므로):
 * - 얼굴·몸 차이가 캘리브레이션 중 흔들림(표준편차)의 2배보다 작은 채널은 안 쓴다 — 제대로 옮겨 보지 않았거나
 *   흔들림 속에 묻힌 값이면 경계가 의미 없어서. 두 채널 다 안 되면 null(예전 판정 그대로).
 * - 경계(가운데)가 예전 기준의 절반(고개 5°, 눈동자 0.075)보다 얼굴 쪽에 가까워지지 않게 한다 — 대답하며 고개를
 *   끄덕이는 정도(3명 실측: 하루를 보며 대답할 때 pitch 변화 최대 약 6°)로 이탈이 잡히지 않게.
 */
export const BODY_MIN_SEPARATION_SD = 2;
export const BODY_MIN_MARGIN = { pitch: 5, oy: 0.075 } as const;

const sd = (v: number[]) => {
  if (v.length < 2) return 0;
  const m = v.reduce((a, b) => a + b, 0) / v.length;
  return Math.sqrt(v.reduce((a, b) => a + (b - m) ** 2, 0) / (v.length - 1));
};

export function makeVerticalBoundary(
  facePoses: ({ pitch: number; oy: number } | null)[],
  face: { pitch: number; oy: number },
  body: { pitch: number; oy: number } | null,
): VerticalBoundary | null {
  if (!body) return null;
  const detected = facePoses.filter((p): p is { pitch: number; oy: number } => p !== null);
  const channel = (key: 'pitch' | 'oy'): VerticalChannel | undefined => {
    const gap = body[key] - face[key];
    const noise = sd(detected.map((p) => p[key]));
    if (Math.abs(gap) <= BODY_MIN_SEPARATION_SD * noise || gap === 0) return undefined;
    // 가운데(gap/2)가 최소 여유보다 가까우면, 여유만큼 떨어진 곳이 경계가 되도록 몸 값을 밀어 둔다
    const half = Math.max(Math.abs(gap) / 2, BODY_MIN_MARGIN[key]);
    return { face: face[key], body: face[key] + Math.sign(gap) * half * 2 };
  };
  const out: VerticalBoundary = {};
  const pitch = channel('pitch');
  const oy = channel('oy');
  if (pitch) out.pitch = pitch;
  if (oy) out.oy = oy;
  return pitch || oy ? out : null;
}

/**
 * 0.4초 넘게 눈이 감긴 구간(blink.ts MAX_BLINK_DURATION)을 시선 이탈로 바꾼다 — 2026-11.
 * 아래를 보면 눈꺼풀이 따라 내려가 eyeBlink가 올라가고(Becker & Fuchs, 1988), 고개·눈동자 값은 기준 안에 남아
 * "하루를 봄"으로 잡히던 문제(3명 중 1명이 대답 중 아래를 본 3.3초가 그대로 "봄"이었음). 웃거나 찡그려서 눈이
 * 가늘어진 건 호출하는 쪽에서 미리 뺀다(미소 중 감김은 넘기지 않음 — useLiveFaceSession).
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
