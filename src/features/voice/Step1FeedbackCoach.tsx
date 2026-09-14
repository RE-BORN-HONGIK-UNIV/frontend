import { Text } from '@/components/ui';
import type { AnalyzeResult } from '@/lib/api/types';
import { useFeedback } from './queries';
import { buildFallbackFeedback } from './feedback';

/**
 * Step 1 · AI 코칭 피드백.
 * 백엔드 /analyze/feedback(LLM) 문단을 표시하고, 실패·키 없음 시 결정론적 폴백 문단을 그대로 보여준다.
 */
export function Step1FeedbackCoach({ result }: { result: AnalyzeResult }) {
  const q = useFeedback(result);
  const llm = q.data?.feedback ?? null;
  const fallback = buildFallbackFeedback(result);

  return (
    <Text
      fz={13}
      style={{
        lineHeight: 1.9,
        color: 'var(--rb-ink)',
        paddingTop: 12,
        borderTop: '1px solid var(--rb-line)',
      }}
    >
      {llm ?? fallback}
      {q.isLoading && !llm && (
        <Text component="span" c="var(--rb-primary-strong)">
          {' '}
          · AI 코치가 분석 중…
        </Text>
      )}
    </Text>
  );
}
