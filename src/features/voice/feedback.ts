import type { AnalyzeResult } from '@/lib/api/types';
import { AXES, TRAINING_TIPS, type AxisKey } from './constants';

export function overallScore(scores: AnalyzeResult['scores']): number {
  const vals = Object.values(scores);
  return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
}

/** Deterministic coaching paragraph — shown until (or instead of) the LLM response. */
export function buildFallbackFeedback(result: AnalyzeResult): string {
  const entries = Object.entries(result.scores) as [AxisKey, number][];
  const best = entries.reduce((a, b) => (a[1] >= b[1] ? a : b));
  const worst = entries.reduce((a, b) => (a[1] <= b[1] ? a : b));
  const bestAxis = AXES.find((a) => a.key === best[0])!;
  const worstAxis = AXES.find((a) => a.key === worst[0])!;
  const ov = overallScore(result.scores);

  const lead = `${bestAxis.label}이 ${best[1]}점으로 가장 안정적이었고, ${worstAxis.label}은 ${worst[1]}점으로 함께 연습해볼 부분이에요.`;
  const close =
    ov >= 75
      ? ' 전체적으로 준비가 잘 되어 있어요. 다음 단계로 넘어가도 좋습니다.'
      : ' 안전한 공간에서 천천히 반복하면 충분히 나아질 수 있어요.';

  return `${lead}${close} ${TRAINING_TIPS[worst[0]]}`;
}
