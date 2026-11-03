import type { AnalyzeResult } from '@/lib/api/types';
import type { AxisKey } from './constants';

/** 모델이 준비된(null이 아닌) 축만 [축, 점수]로 돌려준다. */
export function readyScores(scores: AnalyzeResult['scores']): [AxisKey, number][] {
  return (Object.entries(scores) as [AxisKey, number | null][]).filter(
    (e): e is [AxisKey, number] => e[1] !== null,
  );
}

export function overallScore(scores: AnalyzeResult['scores']): number {
  const vals = readyScores(scores).map(([, v]) => v);
  return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
}
