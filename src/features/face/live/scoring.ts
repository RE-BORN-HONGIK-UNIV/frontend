/**
 * backend/step2/scoring.py 포팅. 임계값·공식은 그쪽 문서(코드 주석, 필요하면
 * step2/ACCURACY_NOTES.md)에 근거가 있는 값이라 여기서 재논의/재조정하지
 * 않는다 — 이 파일은 그대로 옮기는 것만 담당.
 */

/** Python 3의 round(x, ndigits)와 동일한 반올림(round-half-to-even, "banker's
 * rounding") — JS Math.round는 항상 올림이라 .x5 경계에서 값이 달라질 수 있어서
 * 백엔드와 다른 결과가 나올 수 있음. 두 언어 다 IEEE754 double이라 실제 경계
 * 케이스는 드물지만, 이 포팅의 목표가 "수치까지 동일"이라 정확히 맞춰둠. */
export function pyRound(v: number, ndigits: number): number {
  const factor = 10 ** ndigits;
  const scaled = v * factor;
  const floor = Math.floor(scaled);
  const diff = scaled - floor;
  let rounded: number;
  if (diff > 0.5) rounded = floor + 1;
  else if (diff < 0.5) rounded = floor;
  else rounded = floor % 2 === 0 ? floor : floor + 1;
  return rounded / factor;
}

export type BlinkStatus = '정상' | '빈번' | '과응시';

export interface BlinkScoreResult {
  ratePerMin: number;
  status: BlinkStatus;
  score: number;
}

/** backend의 score_blink_rate와 동일. */
export function scoreBlinkRate(blinkCount: number, durationSec: number): BlinkScoreResult {
  const ratePerMin = blinkCount / (durationSec / 60);
  let status: BlinkStatus;
  let score: number;
  if (ratePerMin > 30) {
    status = '빈번';
    score = Math.max(0, 100 - (ratePerMin - 30) * 5);
  } else if (ratePerMin < 10) {
    status = '과응시';
    score = Math.max(0, 100 - (10 - ratePerMin) * 5);
  } else {
    status = '정상';
    score = 100;
  }
  return {
    ratePerMin: pyRound(ratePerMin, 1),
    status,
    score: pyRound(score, 1),
  };
}

export interface GazeSegmentScoreResult {
  avgFixationSec: number;
  score: number;
}

/** backend의 score_gaze_segment와 동일 — 3~5초를 이상적 구간으로 보는 근거는
 * backend/step2/scoring.py 주석 참고(Binetti et al. 2016). */
export function scoreGazeSegment(durationSec: number): number {
  if (durationSec < 3) return (durationSec / 3) * 70;
  if (durationSec <= 5) return 100;
  return Math.max(50, 100 - (durationSec - 5) * 10);
}

/** backend의 score_gaze_segments와 동일 — fixation 구간들의 평균 지속시간·평균 점수. */
export function scoreGazeSegments(
  segments: { type: string; start: number; end: number }[],
): GazeSegmentScoreResult {
  const durations = segments.filter((s) => s.type === 'fixation').map((s) => s.end - s.start);
  if (durations.length === 0) {
    return { avgFixationSec: 0, score: 0 };
  }
  const scores = durations.map(scoreGazeSegment);
  const avg = durations.reduce((a, b) => a + b, 0) / durations.length;
  const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
  return {
    avgFixationSec: pyRound(avg, 2),
    score: pyRound(avgScore, 1),
  };
}
