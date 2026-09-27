import { createSegmentBufferState, flushSegmentBuffer, stepSegmentBuffer, type Segment, type SegmentBufferState } from './segmentBuffer';
import { pyRound } from './scoring';

/**
 * backend/step2/expression_analyzer.py 포팅 — 미소(mouthSmile)/긴장(browDown)
 * blendshape 기반 판정. 임계값·게이팅 로직의 근거는 backend 파일 상단
 * docstring(FACS Action Unit 문헌, 자체 라벨링 검증 이력)에 있는 값 그대로라
 * 여기서 재논의하지 않고 옮기기만 한다.
 */

export const SMILE_KEYS = ['mouthSmileLeft', 'mouthSmileRight'] as const;
export const TENSION_KEYS = ['browDownLeft', 'browDownRight'] as const;
export const JAW_OPEN_KEY = 'jawOpen';

export const SMILE_THRESHOLD = 0.35;
export const TENSION_THRESHOLD = 0.4;
export const JAW_OPEN_GATE = 0.05;
export const SMILE_HIGH_CONFIDENCE_BYPASS = 0.5;

export type Blendshapes = Record<string, number>;

/** backend _avg의 1:1 포팅. */
export function avgBlendshape(blendshapes: Blendshapes, keys: readonly string[]): number {
  const vals = keys.map((k) => blendshapes[k] ?? 0.0);
  return vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0.0;
}

export interface ExpressionFrame {
  smile: number;
  tension: number;
}

/**
 * backend compute_expression_series의 한 프레임 계산 부분을 포팅 — 말하느라
 * 입을 벌린 순간(jawOpen)의 미소 오탐을 게이팅하되, 원본 미소 점수가
 * SMILE_HIGH_CONFIDENCE_BYPASS 이상으로 확실히 높으면 게이팅을 건너뛴다.
 * tension은 baselineTension(캘리브레이션 구간 평균, 기본 0 — backend app.py도
 * 이 인자를 넘기지 않고 절대 임계값처럼 씀) 대비 편차.
 */
export function computeExpressionForFrame(
  blendshapes: Blendshapes | null,
  baselineTension = 0,
): ExpressionFrame | null {
  if (blendshapes === null) return null;
  const smileRaw = avgBlendshape(blendshapes, SMILE_KEYS);
  const jawOpen = blendshapes[JAW_OPEN_KEY] ?? 0.0;
  const smile = smileRaw >= SMILE_HIGH_CONFIDENCE_BYPASS || jawOpen <= JAW_OPEN_GATE ? smileRaw : 0.0;
  const tension = avgBlendshape(blendshapes, TENSION_KEYS) - baselineTension;
  return { smile, tension };
}

/** 배치 래퍼 — backend compute_expression_series와 같은 (t, smile, tension)
 * 튜플 시리즈를 낸다. 테스트/동등성 검증용. */
export function computeExpressionSeriesBatch(
  frames: [number, Blendshapes | null][],
  baselineTension = 0,
): [number, number | null, number | null][] {
  return frames.map(([t, bs]) => {
    const frame = computeExpressionForFrame(bs, baselineTension);
    return [t, frame ? frame.smile : null, frame ? frame.tension : null];
  });
}

export interface ExpressionSummary {
  smileRatio: number;
  tensionRatio: number;
  frameCount: number;
}

/** backend summarize_expression의 1:1 포팅 — 전체 구간에서 미소/긴장 임계값을
 * 넘긴 프레임 비율. round(x, 4) 정밀도까지 backend와 맞춤. */
export function summarizeExpression(series: [number, number | null, number | null][]): ExpressionSummary {
  const valid = series.filter((s): s is [number, number, number] => s[1] !== null);
  if (valid.length === 0) {
    return { smileRatio: 0.0, tensionRatio: 0.0, frameCount: 0 };
  }
  const smileHits = valid.filter(([, smile]) => smile >= SMILE_THRESHOLD).length;
  const tensionHits = valid.filter(([, , tension]) => tension >= TENSION_THRESHOLD).length;
  const n = valid.length;
  return {
    smileRatio: pyRound(smileHits / n, 4),
    tensionRatio: pyRound(tensionHits / n, 4),
    frameCount: n,
  };
}

export type ExpressionState = 'smile' | 'tension' | 'neutral';

/** backend detect_expression_segments 루프 본문의 상태 분류 부분 — 같은
 * 프레임에서 미소·긴장 둘 다 임계값을 넘기면 미소를 우선한다. */
export function classifyExpressionState(smile: number | null, tension: number): ExpressionState {
  if (smile === null) return 'neutral';
  if (smile >= SMILE_THRESHOLD) return 'smile';
  if (tension >= TENSION_THRESHOLD) return 'tension';
  return 'neutral';
}

/** 배치 래퍼 — backend detect_expression_segments와 같은 입력(이미 계산된
 * (t, smile, tension) 시리즈)을 받아 segmentBuffer로 재생. 테스트/동등성
 * 검증용. */
export function detectExpressionSegmentsBatch(
  series: [number, number | null, number][],
  minSegmentSec = 0.3,
): Segment[] {
  const state = createSegmentBufferState();
  for (const [t, smile, tension] of series) {
    stepSegmentBuffer(state, t, classifyExpressionState(smile, tension), minSegmentSec);
  }
  flushSegmentBuffer(state);
  return state.committed;
}

export interface ExpressionFsmState {
  segmentBuffer: SegmentBufferState;
}

export function createExpressionFsmState(): ExpressionFsmState {
  return { segmentBuffer: createSegmentBufferState() };
}

/** 실시간 한 프레임 처리 — blendshapes(얼굴 미검출이면 null)를 받아 상태를
 * 판정하고 segmentBuffer에 흘려보낸다. 새로 확정된 구간이 있으면 반환. */
export function stepExpression(
  state: ExpressionFsmState,
  t: number,
  blendshapes: Blendshapes | null,
  baselineTension = 0,
  minSegmentSec = 0.3,
): Segment | null {
  const frame = computeExpressionForFrame(blendshapes, baselineTension);
  const exprState = classifyExpressionState(frame ? frame.smile : null, frame ? frame.tension : 0);
  return stepSegmentBuffer(state.segmentBuffer, t, exprState, minSegmentSec);
}

export function flushExpression(state: ExpressionFsmState): Segment | null {
  return flushSegmentBuffer(state.segmentBuffer);
}
