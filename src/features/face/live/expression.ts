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
export function summarizeExpression(
  series: [number, number | null, number | null][],
  /** 이 시간(초) 넘게 이어진 긴장만 센다(TENSION_MIN_SEC). 기본 0 = backend와 같음 */
  minTensionSec = 0,
  tensionThreshold = TENSION_THRESHOLD,
): ExpressionSummary {
  const valid = series.filter((s): s is [number, number, number] => s[1] !== null);
  if (valid.length === 0) {
    return { smileRatio: 0.0, tensionRatio: 0.0, frameCount: 0 };
  }
  const smileHits = valid.filter(([, smile]) => smile >= SMILE_THRESHOLD).length;
  const tensionHits = countSustained(valid.map(([t, , tension]) => [t, tension >= tensionThreshold]), minTensionSec);
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

/**
 * 미소 비율 = (대답 중 미소 프레임 + 하루 말을 들을 때 미소 프레임) / (둘의 프레임 수) — 2026-11.
 *
 * 2단계를 "대답하는 동안만" 재게 바꾸면서 미소는 거의 입을 벌린 프레임에서만 재게 됐고, 입 벌림 규칙
 * (JAW_OPEN_GATE — 말하는 입 모양 오탐을 20건→5건으로 줄인 검증된 규칙, backend ACCURACY_NOTES.md)에 걸려
 * 말하며 웃는 미소를 대부분 놓쳤다(3명 중 1명은 영상에서 계속 웃는데 9%만 잡힘). 규칙·숫자는 그대로 두고, 그
 * 규칙이 검증된 상황(입을 다문 때)이 많은 "하루 말을 들을 때"도 미소만 함께 잰다. 긴장·시선·깜빡임은 여전히 대답 중만.
 * 3명 녹화로 확인: 웃지 않고 대답한 질문에서 미소로 잘못 잡힌 프레임 0개(입 벌림 규칙이 말하는 입 모양을 막음).
 */
export function combineSmileRatio(answer: ExpressionSummary, listenSmileHits: number, listenFrames: number): number {
  const n = answer.frameCount + listenFrames;
  if (n === 0) return 0;
  if (listenFrames === 0) return answer.smileRatio;
  return pyRound((Math.round(answer.smileRatio * answer.frameCount) + listenSmileHits) / n, 4);
}

/**
 * 찡그림(긴장) 판정 구조 — 2026-11.
 *
 * 1) 평소 얼굴 대비: 미간 값(browDown, AU4)에서 그 사람의 평소 값(캘리브레이션 "하루의 눈 보기" 동안의 중앙값,
 *    calibration.ts calibrateBaselineTension)을 뺀 값으로 판정한다(computeExpressionForFrame의 baselineTension).
 *    9월 검증에서 기준을 0.4→0.3으로 못 낮춘 이유가 "원래 미간이 좁은 인상(resting face)인 사람의 무표정이 긴장으로
 *    잡힘"이었는데(backend step2/ACCURACY_NOTES.md 1차 검증), 사람마다 무표정 값을 빼면 이 문제가 없어진다
 *    (Baltrušaitis, Mahmoud & Robinson, 2015, IEEE FG — 사람별 무표정 정규화가 표정(AU) 판정 정확도를 높임).
 * 2) 이어진 시간: 말할 때 억양을 따라 눈썹이 잠깐 움직이는 것과 구분하려고, TENSION_MIN_SEC 넘게 이어진 것만 센다.
 *
 * 숫자(평소 대비 얼마나 = TENSION_THRESHOLD, 얼마나 오래 = TENSION_MIN_SEC)는 여러 사람의 찡그림 녹화로 정한다.
 * "숫자 없이"(그 사람 캘리브레이션 흔들림의 몇 배 같은 통계 기준)는 3명 녹화로 확인해 보니 쓸 수 없었다 —
 * 무표정 흔들림이 사람마다 0.001~0.011로 크게 다르고, 말할 때 흔들림이 캘리브레이션(말 안 함)보다 3배 커서
 * 2명은 평범하게 말하기만 해도 긴장으로 잡혔다. 그래서 지금은 예전 판정과 같은 값(0.4, 0초)으로 두고 녹화 뒤 바꾼다.
 */
export const TENSION_MIN_SEC = 0;

/** [시각, 넘었는지] 시리즈에서 minSec 넘게 이어진 "넘음" 프레임 수. 0.25초 넘게 비면(대답 사이 등) 끊긴 것으로 본다 */
export function countSustained(series: [number, boolean][], minSec: number, maxGapSec = 0.25): number {
  if (minSec <= 0) return series.filter(([, on]) => on).length;
  let total = 0;
  let run: number[] = [];
  const close = () => {
    if (run.length && run[run.length - 1] - run[0] >= minSec) total += run.length;
    run = [];
  };
  let lastT: number | null = null;
  for (const [t, on] of series) {
    if (lastT !== null && t - lastT > maxGapSec) close();
    if (on) run.push(t);
    else close();
    lastT = t;
  }
  close();
  return total;
}
