import type { FaceLandmarks, Point2D } from './types';

/**
 * backend/step2/blink_analyzer.py 포팅. 원본은 "프레임 리스트 전체 → 결과"인
 * 배치 함수들이지만, 실시간은 프레임이 한 번에 하나씩 들어오므로 상태(state)를
 * 직접 들고 있다가 프레임마다 한 스텝씩 전진하는 FSM 형태로 바꿨다 — 판정
 * 로직(임계값 비교, 지속시간 체크) 자체는 바꾸지 않았다.
 *
 * 두 FSM(EAR 방식/blendshape 방식) 모두 원본과 동일하게:
 * - 값이 null(얼굴 미검출)인 프레임은 완전히 건너뛴다 (깜빡임을 열거나 닫지 않음)
 * - 지속시간이 min_blink_duration보다 짧으면 버린다
 * - 스트림이 끝날 때 아직 안 끝난 깜빡임은 절대 flush하지 않는다(원본 그대로의
 *   동작 — 실시간에서도 그대로 유지: 세션 종료 시 열려있는 깜빡임은 버려짐)
 */

const DEFAULT_MIN_BLINK_DURATION = 0.08;

function dist(a: Point2D, b: Point2D): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/** eyePts: [outer, top1, top2, inner, bottom1, bottom2] 순서 6점.
 * backend/step2/blink_analyzer.py의 eye_aspect_ratio와 동일. */
export function eyeAspectRatio(eyePts: Point2D[]): number {
  const [p1, p2, p3, p4, p5, p6] = eyePts;
  const vertical = dist(p2, p6) + dist(p3, p5);
  const horizontal = dist(p1, p4);
  return vertical / (2.0 * horizontal + 1e-6);
}

/** 한 프레임의 landmark → 좌우 평균 EAR. 얼굴 미검출이면 null.
 * backend의 compute_ear_series(프레임 하나 분량)와 동일. */
export function computeEarForFrame(
  landmarks: FaceLandmarks,
  leftIdx: number[],
  rightIdx: number[],
): number | null {
  if (!landmarks) return null;
  const leftPts = leftIdx.map((i) => landmarks[i]);
  const rightPts = rightIdx.map((i) => landmarks[i]);
  return (eyeAspectRatio(leftPts) + eyeAspectRatio(rightPts)) / 2;
}

/** 한 프레임의 blendshape → eyeBlinkLeft/Right 평균. blendshape 없으면 null.
 * backend의 compute_blink_blendshape_series(프레임 하나 분량)와 동일. */
export function computeBlinkBlendshapeScore(
  blendshapes: Record<string, number> | null,
): number | null {
  if (!blendshapes) return null;
  const left = blendshapes.eyeBlinkLeft ?? 0;
  const right = blendshapes.eyeBlinkRight ?? 0;
  return (left + right) / 2;
}

export interface Blink {
  start: number;
  end: number;
}

export interface BlinkFsmState {
  inBlink: boolean;
  blinkStart: number | null;
}

export function createBlinkFsmState(): BlinkFsmState {
  return { inBlink: false, blinkStart: null };
}

/** EAR 방식 깜빡임 판정 한 스텝. backend의 detect_blinks와 동일 —
 * ear < threshold로 "떨어지면" 깜빡임 시작, threshold 이상으로 "돌아오면" 종료. */
export function stepEarBlink(
  state: BlinkFsmState,
  t: number,
  ear: number | null,
  threshold: number,
  minBlinkDuration = DEFAULT_MIN_BLINK_DURATION,
): Blink | null {
  if (ear === null) return null;
  if (ear < threshold && !state.inBlink) {
    state.inBlink = true;
    state.blinkStart = t;
    return null;
  }
  if (ear >= threshold && state.inBlink) {
    state.inBlink = false;
    const start = state.blinkStart as number;
    state.blinkStart = null;
    const duration = t - start;
    if (duration >= minBlinkDuration) {
      return { start, end: t };
    }
  }
  return null;
}

/** blendshape 방식 깜빡임 판정 한 스텝. backend의 detect_blinks_from_blendshape와
 * 동일 — EAR와 반대 방향(score가 threshold "이상"으로 올라가면 깜빡임 시작). */
export function stepBlendshapeBlink(
  state: BlinkFsmState,
  t: number,
  score: number | null,
  threshold = 0.5,
  minBlinkDuration = DEFAULT_MIN_BLINK_DURATION,
): Blink | null {
  if (score === null) return null;
  if (score >= threshold && !state.inBlink) {
    state.inBlink = true;
    state.blinkStart = t;
    return null;
  }
  if (score < threshold && state.inBlink) {
    state.inBlink = false;
    const start = state.blinkStart as number;
    state.blinkStart = null;
    const duration = t - start;
    if (duration >= minBlinkDuration) {
      return { start, end: t };
    }
  }
  return null;
}

/** 테스트/오프라인 검증용 배치 래퍼 — 스트리밍 스텝 함수를 시리즈 전체에 돌려서
 * backend pytest 픽스처와 그대로 비교할 수 있게 한다. */
export function detectBlinksEarBatch(
  series: [number, number | null][],
  baselineEar: number,
  dropRatio = 0.7,
  minBlinkDuration = DEFAULT_MIN_BLINK_DURATION,
): Blink[] {
  const threshold = baselineEar * dropRatio;
  const state = createBlinkFsmState();
  const blinks: Blink[] = [];
  for (const [t, ear] of series) {
    const blink = stepEarBlink(state, t, ear, threshold, minBlinkDuration);
    if (blink) blinks.push(blink);
  }
  return blinks;
}

export function detectBlinksFromBlendshapeBatch(
  series: [number, number | null][],
  threshold = 0.5,
  minBlinkDuration = DEFAULT_MIN_BLINK_DURATION,
): Blink[] {
  const state = createBlinkFsmState();
  const blinks: Blink[] = [];
  for (const [t, score] of series) {
    const blink = stepBlendshapeBlink(state, t, score, threshold, minBlinkDuration);
    if (blink) blinks.push(blink);
  }
  return blinks;
}

/**
 * 깜빡임으로 셀 최대 길이(초) — 2026-11 추가.
 *
 * 근거: 사람의 깜빡임 한 번은 0.1~0.4초다(Schiffman, *Sensation and Perception: An Integrated Approach*, 2001 —
 * Harvard BioNumbers ID 100706에 수록). 이보다 오래 감긴 건 일반 깜빡임과 다른 현상으로 따로 다룬다(Caffier,
 * Erdmann & Ullsperger, 2003, Eur J Appl Physiol 89:319–325 — 긴 눈 감김은 졸림 지표로 별도 분석).
 * 실측(2단계 하루 통화 3명, 영상과 장면 값 대조 — backend step2/ACCURACY_NOTES.md "2026-11 하루 통화 재검증"):
 * 0.4초 이하로 잡힌 깜빡임은 영상에서도 실제 깜빡임이었고, 0.4초를 넘긴 6건은 모두 깜빡임이 아니었다
 * (아래를 봄 3.3초·1.0초, 찡그려 눈이 가늘어짐 1.45초, 웃어 눈이 가늘어짐 0.5초 등).
 * 아래를 보면 눈꺼풀이 눈을 따라 내려가서(Becker & Fuchs, 1988, J Neurophysiol 60:1227–1252, "lid saccade")
 * eyeBlink 값이 감은 것처럼 올라가기 때문 — 그래서 긴 감김은 시선 쪽에서 "딴 곳 봄"으로 다룬다(gaze.ts markClosuresAsAversion).
 */
export const MAX_BLINK_DURATION = 0.4;

export const isBlinkLength = (b: Blink, max = MAX_BLINK_DURATION) => b.end - b.start <= max;
