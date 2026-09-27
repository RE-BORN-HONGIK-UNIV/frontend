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
