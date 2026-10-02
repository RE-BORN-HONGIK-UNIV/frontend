import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Button, Stack, Text } from '@/components/ui';
import { api } from '@/lib/api/client';
import type { DifficultyTier } from '../difficulty';
import { getInterviewer } from '../interviewers';
import { summarizeResult, type InterviewResult } from '../resultSummary';

const KIND_LABEL = { main: '기본 질문', follow_up: '꼬리질문' } as const;

/**
 * 3단계 면접 결과 화면.
 * 점수·평가는 일부러 넣지 않는다 — 면접에는 아직 분석 점수가 없고, 근거 없는 평가는 발화·사회불안
 * 사용자에게 해롭다. 대신 끝까지 해낸 것을 알아주고, 오늘 나눈 질문과 내 답변을 다시 볼 수 있게 한다.
 *
 * 질문·답변은 면접 중 메모리에 모아둔 것(result.turns)으로 그린다 — 서버 저장이 실패했거나 로그인이
 * 풀렸어도 결과는 보여야 하기 때문. 서버에 저장된 면접(sessionId가 있을 때)은 여기서 삭제할 수 있다.
 */
export function ResultView({
  result,
  tier,
  onRetry,
}: {
  result: InterviewResult;
  tier: DifficultyTier;
  onRetry: () => void;
}) {
  const navigate = useNavigate();
  const interviewer = getInterviewer(tier);
  const { questionCount, answeredCount, minutes } = summarizeResult(result);

  const [deleted, setDeleted] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(false);

  const allAnswered = questionCount > 0 && answeredCount === questionCount;

  const handleDelete = async () => {
    if (result.sessionId === null) return;
    if (!window.confirm('이 면접의 질문과 답변 기록을 삭제할까요?\n삭제하면 되돌릴 수 없어요.')) return;
    setDeleting(true);
    setDeleteError(false);
    try {
      await api.deleteInterviewSession(result.sessionId);
      setDeleted(true); // 삭제했으면 화면에서도 내용을 치운다
    } catch {
      setDeleteError(true);
    }
    setDeleting(false);
  };

  return (
    <Stack align="center" gap={24} style={{ paddingTop: 32, paddingInline: 16, paddingBottom: 24 }}>
      <Stack align="center" gap={10} ta="center">
        <Box
          aria-hidden
          style={{
            width: 72,
            height: 72,
            borderRadius: '50%',
            background: 'var(--rb-primary-tint)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 34,
          }}
        >
          {interviewer.emoji}
        </Box>
        <Text fz={22} fw={700}>
          수고하셨어요!
        </Text>
        <Text fz={14} c="var(--rb-ink-soft)" style={{ lineHeight: 1.7, maxWidth: 360 }}>
          {allAnswered
            ? `${interviewer.name} 면접관과 ${questionCount}개의 질문에 끝까지 답했어요. 오늘 해낸 것만으로도 큰 한 걸음이에요.`
            : `${interviewer.name} 면접관과 끝까지 함께했어요. 모든 질문에 답하지 못했어도 괜찮아요. 여기까지 와준 것만으로도 충분해요.`}
        </Text>
      </Stack>

      <Box style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
        {[`질문 ${questionCount}개`, `답변 ${answeredCount}개`, `약 ${minutes}분`].map((label) => (
          <Text
            key={label}
            fz={12}
            fw={600}
            style={{
              padding: '6px 14px',
              borderRadius: 999,
              background: 'var(--rb-surface)',
              border: '1px solid var(--rb-line)',
            }}
          >
            {label}
          </Text>
        ))}
      </Box>

      {deleted ? (
        <Text fz={13} c="var(--rb-ink-soft)" ta="center" style={{ lineHeight: 1.7 }}>
          면접 기록을 삭제했어요. 질문과 답변이 서버에서 지워졌어요.
        </Text>
      ) : (
        <Stack gap={12} style={{ width: '100%', maxWidth: 640 }}>
          <Stack gap={2}>
            <Text fz={15} fw={700}>
              오늘의 질문과 답변
            </Text>
            <Text fz={11} c="var(--rb-ink-faint)">
              답변은 음성 인식을 바탕으로 한 텍스트라 실제 말과 조금 다를 수 있어요.
            </Text>
          </Stack>

          {result.turns.map((turn, i) => (
            <Box
              key={i}
              style={{
                padding: '16px 18px',
                borderRadius: 16,
                background: 'var(--rb-surface)',
                border: '1px solid var(--rb-line)',
              }}
            >
              <Stack gap={8}>
                <Text fz={11} fw={700} c="var(--rb-primary-strong)">
                  {KIND_LABEL[turn.kind]}
                </Text>
                <Text fz={14} fw={600} style={{ lineHeight: 1.6 }}>
                  {turn.question}
                </Text>
                {turn.answer.trim() ? (
                  <Text fz={13} c="var(--rb-ink-soft)" style={{ lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                    {turn.answer}
                  </Text>
                ) : (
                  <Text fz={13} c="var(--rb-ink-faint)">
                    이 질문은 답변을 남기지 못했어요.
                  </Text>
                )}
              </Stack>
            </Box>
          ))}

          <Text fz={11} c="var(--rb-ink-faint)" style={{ lineHeight: 1.6 }}>
            {result.sessionId !== null
              ? '이 기록은 내 계정에만 저장돼요. 원하면 언제든 삭제할 수 있어요.'
              : '이번 면접은 기록이 저장되지 않았어요. 이 화면을 나가면 내용이 사라져요.'}
          </Text>
        </Stack>
      )}

      <Stack align="center" gap={8} style={{ width: '100%', maxWidth: 320 }}>
        <Button fullWidth color="brand" radius="md" onClick={() => navigate('/dashboard')}>
          대시보드로
        </Button>
        <Button fullWidth variant="default" radius="md" onClick={onRetry}>
          한 번 더 연습하기
        </Button>
        {result.sessionId !== null && !deleted && (
          <Button variant="subtle" color="gray" size="xs" disabled={deleting} onClick={handleDelete}>
            {deleting ? '삭제하는 중…' : '이 면접 기록 삭제'}
          </Button>
        )}
        {deleteError && (
          <Text fz={12} c="var(--rb-ink-soft)" ta="center">
            삭제하지 못했어요. 잠시 후 다시 시도해주세요.
          </Text>
        )}
      </Stack>
    </Stack>
  );
}
