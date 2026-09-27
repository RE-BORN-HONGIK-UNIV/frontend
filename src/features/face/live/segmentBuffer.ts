/**
 * backend/step2/gaze_analyzer.py의 _merge_short_segments(구간 병합) 포팅.
 * 백엔드는 "구간이 끝나봐야 짧았는지 안다"는 회고적 로직이라 실시간
 * 스트리밍에 그대로 못 씀 — 계획 문서 §2에서 정한 대로 "상태가 바뀌면
 * 곧바로 확정하지 않고 min_segment_sec(기본 0.3초) 보류 → 그 안에 원래
 * 타입으로 되돌아오면 흡수, 0.3초를 버티면 그때 확정" 방식의 지연 버퍼로
 * 재구성했다.
 *
 * mergeShortSegmentsBatch/rawSegmentsBatch/detectSegmentsBatch는 이 스트리밍
 * 재구성이 백엔드의 회고적 알고리즘과 동등한 결과를 내는지 테스트로
 * 검증하기 위한 배치 버전 — segmentBuffer.test.ts에서만 쓰인다.
 *
 * 시선(gaze, 2-상태: fixation/aversion)뿐 아니라 표정(Phase 3, 3-상태)에서도
 * 재사용할 수 있게 type은 string으로 일반화.
 */

export interface Segment {
  type: string;
  start: number;
  end: number;
}

export interface SegmentBufferState {
  committed: Segment[];
  activeType: string | null;
  activeStart: number;
  lastT: number;
  pendingType: string | null;
  pendingStart: number;
}

export function createSegmentBufferState(): SegmentBufferState {
  return {
    committed: [],
    activeType: null,
    activeStart: 0,
    lastT: 0,
    pendingType: null,
    pendingStart: 0,
  };
}

/** 프레임 하나(t, type)를 반영한다. 새로 확정(닫힘)된 구간이 생기면 그
 * 구간을, 아니면 null을 반환한다. */
export function stepSegmentBuffer(
  state: SegmentBufferState,
  t: number,
  type: string,
  minSegmentSec = 0.3,
): Segment | null {
  state.lastT = t;

  if (state.activeType === null) {
    state.activeType = type;
    state.activeStart = t;
    return null;
  }

  if (state.pendingType === null) {
    if (type !== state.activeType) {
      state.pendingType = type;
      state.pendingStart = t;
    }
    return null;
  }

  if (type === state.activeType) {
    // pending이 확정되기 전에 원래 타입으로 되돌아옴 — 짧은 구간으로 보고 흡수
    state.pendingType = null;
    return null;
  }

  if (type === state.pendingType) {
    if (t - state.pendingStart >= minSegmentSec) {
      const closed: Segment = { type: state.activeType, start: state.activeStart, end: state.pendingStart };
      state.activeType = state.pendingType;
      state.activeStart = state.pendingStart;
      state.pendingType = null;
      state.committed.push(closed);
      return closed;
    }
    return null;
  }

  // 세 번째 타입(2개 초과 상태 — 예: 표정) — pending이 확정되지 못한 채 새 후보로 교체
  state.pendingType = type;
  state.pendingStart = t;
  return null;
}

/** 스트림 종료 시 마지막까지 열려있던 구간을 확정한다. */
export function flushSegmentBuffer(state: SegmentBufferState): Segment | null {
  if (state.activeType === null) return null;
  const closed: Segment = { type: state.activeType, start: state.activeStart, end: state.lastT };
  state.committed.push(closed);
  state.activeType = null;
  return closed;
}

/** backend _merge_short_segments의 1:1 포팅 — 동등성 검증(배치 vs 스트리밍)용. */
export function mergeShortSegmentsBatch(segments: Segment[], minDuration = 0.3): Segment[] {
  if (segments.length === 0) return segments;
  const merged: Segment[] = [{ ...segments[0] }];
  for (let i = 1; i < segments.length; i++) {
    const seg = segments[i];
    const prev = merged[merged.length - 1];
    const tooShort = seg.end - seg.start < minDuration;
    const sameType = seg.type === prev.type;
    if (tooShort || sameType) {
      prev.end = seg.end;
    } else {
      merged.push({ ...seg });
    }
  }
  return merged;
}

/** 원시 (t, type) 프레임 시퀀스 → 병합 없이 상태 변화 그대로 쪼갠 구간
 * (backend detect_gaze_segments의 병합 전 단계와 동일 — 동등성 검증용). */
export function rawSegmentsBatch(frames: [number, string][]): Segment[] {
  const segments: Segment[] = [];
  let currentType: string | null = null;
  let segStart = 0;
  let lastT = 0;
  for (const [t, type] of frames) {
    if (type !== currentType) {
      if (currentType !== null) {
        segments.push({ type: currentType, start: segStart, end: t });
      }
      currentType = type;
      segStart = t;
    }
    lastT = t;
  }
  if (currentType !== null) {
    segments.push({ type: currentType, start: segStart, end: lastT });
  }
  return segments;
}

/** 원시 프레임 시퀀스를 지연 버퍼 스트리밍으로 통과시킨 결과 (동등성 검증용). */
export function detectSegmentsBatch(frames: [number, string][], minSegmentSec = 0.3): Segment[] {
  const state = createSegmentBufferState();
  for (const [t, type] of frames) {
    stepSegmentBuffer(state, t, type, minSegmentSec);
  }
  flushSegmentBuffer(state);
  return state.committed;
}
