import type { AnalyzeResult } from '@/lib/api/types';

export function overallScore(scores: AnalyzeResult['scores']): number {
  const vals = Object.values(scores);
  return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
}
