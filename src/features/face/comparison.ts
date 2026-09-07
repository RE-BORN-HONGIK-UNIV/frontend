import type { GazeBlinkResult } from '@/lib/api/types';
import type { Stage2Entry, Stage2Metrics } from '@/features/progress/localProgress';
import type { MetricKey } from './constants';

export function extractMetrics(result: GazeBlinkResult): Stage2Metrics {
  return {
    blinkRatePerMin: result.blink.rate_per_min,
    avgFixationSec: result.gaze.avg_fixation_sec,
    smileRatio: result.expression.smile_ratio,
    tensionRatio: result.expression.tension_ratio,
  };
}

const FIRST_TIME_TEXT: Record<MetricKey, string> = {
  blink: '이번이 첫 기록이에요. 다음번엔 오늘과 비교해서 변화를 보여드릴게요.',
  gaze: '이번이 첫 기록이에요. 다음번엔 오늘과 비교해서 변화를 보여드릴게요.',
  expression: '이번이 첫 기록이에요. 다음번엔 오늘과 비교해서 변화를 보여드릴게요.',
};

/** 변화의 방향은 말해주되, "좋다/나쁘다" 평가는 하지 않는다 — 그저 지난번과 다른 점만 짚어준다. */
function trendPhrase(delta: number, threshold: number, up: string, down: string, same: string): string {
  if (Math.abs(delta) < threshold) return same;
  return delta > 0 ? up : down;
}

export function buildBlinkComparison(current: Stage2Metrics, previous: Stage2Entry | null): string {
  if (!previous) return FIRST_TIME_TEXT.blink;
  const delta = current.blinkRatePerMin - previous.blinkRatePerMin;
  const trend = trendPhrase(delta, 3, '조금 더 자주 깜빡였어요', '조금 더 편안하게 깜빡였어요', '지난번과 비슷한 정도였어요');
  return `이번엔 분당 ${current.blinkRatePerMin}회 깜빡였어요 (지난번 ${previous.blinkRatePerMin}회) — ${trend}.`;
}

export function buildGazeComparison(current: Stage2Metrics, previous: Stage2Entry | null): string {
  if (!previous) return FIRST_TIME_TEXT.gaze;
  const delta = current.avgFixationSec - previous.avgFixationSec;
  const trend = trendPhrase(delta, 1, '시선을 조금 더 길게 유지했어요', '시선을 조금 더 자주 옮겼어요', '지난번과 비슷하게 유지했어요');
  return `이번엔 평균 ${current.avgFixationSec}초 동안 시선을 유지했어요 (지난번 ${previous.avgFixationSec}초) — ${trend}.`;
}

export function buildExpressionComparison(current: Stage2Metrics, previous: Stage2Entry | null): string {
  if (!previous) return FIRST_TIME_TEXT.expression;
  const smileDelta = current.smileRatio - previous.smileRatio;
  const tensionDelta = current.tensionRatio - previous.tensionRatio;
  const smileTrend = trendPhrase(smileDelta, 0.05, '미소 짓는 순간이 늘었어요', '미소 짓는 순간이 줄었어요', '미소는 비슷했어요');
  const tensionTrend = trendPhrase(tensionDelta, 0.05, '긴장한 순간이 조금 늘었어요', '긴장한 순간이 조금 줄었어요', '긴장도는 비슷했어요');
  return `${smileTrend}, ${tensionTrend}.`;
}

export const COMPARISON_BUILDERS: Record<MetricKey, (c: Stage2Metrics, p: Stage2Entry | null) => string> = {
  blink: buildBlinkComparison,
  gaze: buildGazeComparison,
  expression: buildExpressionComparison,
};
