/** 75+ 양호(green) · 55+ 보통(amber) · 그 미만 보완(red) — status colour, not brand.
 * Shared across step features (voice, face, …) that render a 0~100 score. */
export function scoreColor(v: number): string {
  if (v >= 75) return '#1e8a57';
  if (v >= 55) return '#b07a00';
  return '#a32d2d';
}
