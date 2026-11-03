/** 0~100 점수의 세 구간 — 75+ 양호 · 55+ 보통 · 그 미만 보완. 색(scoreColor)과 최종 리포트의 상태 칩이 같은 경계를 쓴다. */
export type ScoreTier = 'good' | 'mid' | 'low';

export function scoreTier(v: number): ScoreTier {
  if (v >= 75) return 'good';
  if (v >= 55) return 'mid';
  return 'low';
}

/** 75+ 양호(green) · 55+ 보통(amber) · 그 미만 보완(red) — status colour, not brand.
 * Shared across step features (voice, face, …) that render a 0~100 score. */
export function scoreColor(v: number): string {
  return { good: '#1e8a57', mid: '#b07a00', low: '#a32d2d' }[scoreTier(v)];
}
