import { useEffect, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Box, Button, Stack, Text, Textarea } from '@/components/ui';
import { PageHeader } from '@/components/PageHeader';
import { api } from '@/lib/api/client';
import { useLiveTranscript } from '@/features/interview/useLiveTranscript';
import {
  compareAnswers,
  FALLBACK_HINT,
  type AnswerChange,
  type PracticeHint,
  type PracticeState,
} from '@/features/interview/practice';

type Phase = 'ready' | 'answering' | 'confirm' | 'done';

/** 좋아진 점이 있을 때만 그걸 알려주고, 아니면 비교 없이 격려만 한다 */
const CHANGE_MESSAGE: Record<AnswerChange, string> = {
  answered: '이번엔 답을 남겼어요! 한 번 더 해본 게 큰 힘이 돼요.',
  longer: '이전보다 더 길게 이야기했어요. 한 번 더 해본 게 큰 힘이 돼요.',
  same: '한 번 더 해본 것만으로도 충분해요.',
};

/**
 * 맞춤 연습 — 방금 면접의 질문 하나를 힌트와 함께 한 번 더 답해본다.
 * 결과 화면의 "이 질문 다시 답해보기" 카드에서 질문·이전 답변을 router state로 받는다. 새로고침 등으로 state가 없으면
 * 연습할 내용이 없으므로 대시보드로 돌려보낸다.
 */
export default function PracticePage() {
  const state = useLocation().state as PracticeState | null;
  if (!state?.question) return <Navigate to="/dashboard" replace />;
  return <PracticeScreen question={state.question} previousAnswer={state.previousAnswer ?? ''} />;
}

function PracticeScreen({ question, previousAnswer }: { question: string; previousAnswer: string }) {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<Phase>('ready');
  const [hint, setHint] = useState<(PracticeHint & { ai: boolean }) | null>(null);
  const [draft, setDraft] = useState('');
  const [answer, setAnswer] = useState('');

  const live = useLiveTranscript({ active: phase === 'answering' });

  // AI 힌트 — 실패하면(서버·네트워크) 일반 힌트로 대체해서 연습 화면이 막히지 않게 한다
  useEffect(() => {
    let cancelled = false;
    api
      .getPracticeHint(question, previousAnswer)
      .then((res) => {
        if (!cancelled) setHint({ ...res.hint, ai: res.source === 'llm' });
      })
      .catch(() => {
        if (!cancelled) setHint({ ...FALLBACK_HINT, ai: false });
      });
    return () => {
      cancelled = true;
    };
  }, [question, previousAnswer]);

  const handleStart = () => {
    live.reset();
    setPhase('answering');
  };
  const handleDoneSpeaking = () => {
    setDraft(live.transcript);
    setPhase('confirm');
  };
  const handleSubmit = () => {
    setAnswer(draft.trim());
    setPhase('done');
  };
  const handleAgain = () => {
    setDraft('');
    setAnswer('');
    setPhase('ready');
  };

  return (
    <Box style={{ minHeight: '100dvh', background: 'var(--rb-bg)', paddingBottom: 60 }}>
      <PageHeader back="/dashboard" eyebrow="맞춤 연습" title="한 번 더 해볼까요?" subtitle="힌트를 보면서 천천히, 편하게 말해봐요." />

      <Stack gap={20} style={{ maxWidth: 640, margin: '0 auto', padding: '24px 16px 0' }}>
        {/* 질문 */}
        <Box
          style={{
            padding: '20px 22px',
            borderRadius: 18,
            background: 'var(--rb-surface)',
            border: '1px solid var(--rb-line)',
          }}
        >
          <Text fz={11} fw={700} c="var(--rb-primary-strong)" mb={6}>
            질문
          </Text>
          <Text fz={17} fw={600} style={{ lineHeight: 1.7, wordBreak: 'keep-all' }}>
            {question}
          </Text>
        </Box>

        {/* 힌트 */}
        {phase !== 'done' && (
          <Box
            style={{
              padding: '18px 22px',
              borderRadius: 18,
              background: 'var(--rb-primary-tint)',
              border: '1px solid var(--rb-line)',
            }}
          >
            {hint === null ? (
              <Text fz={13} c="var(--rb-ink-soft)">
                힌트를 준비하고 있어요…
              </Text>
            ) : (
              <Stack gap={12}>
                <Text fz={11} fw={700} c="var(--rb-primary-strong)">
                  {hint.ai ? 'AI가 만든 힌트' : '기본 힌트'}
                </Text>
                <Stack gap={4}>
                  <Text fz={12} c="var(--rb-ink-soft)">
                    이렇게 시작해볼까요? (빈칸을 내 이야기로 채워보세요)
                  </Text>
                  <Text fz={15} fw={600} style={{ lineHeight: 1.7, wordBreak: 'keep-all' }}>
                    “{hint.opening}”
                  </Text>
                </Stack>
                <Stack gap={4}>
                  <Text fz={12} c="var(--rb-ink-soft)">
                    말하는 순서
                  </Text>
                  <Box
                    component="ol"
                    // 공통 스타일(preflight)이 목록 번호를 지워서 번호를 직접 켠다 — 순서 안내라 번호가 보여야 함
                    style={{ margin: 0, paddingLeft: 22, display: 'flex', flexDirection: 'column', gap: 4, listStyleType: 'decimal' }}
                  >
                    {hint.steps.map((step) => (
                      <li key={step} style={{ fontSize: 14, lineHeight: 1.6, wordBreak: 'keep-all' }}>
                        {step}
                      </li>
                    ))}
                  </Box>
                </Stack>
              </Stack>
            )}
          </Box>
        )}

        {/* 준비: 말로 / 직접 적어서 */}
        {phase === 'ready' && (
          <Stack gap={8} align="center">
            {live.supported ? (
              <Button color="brand" radius="xl" onClick={handleStart}>
                🎙️ 답변 시작
              </Button>
            ) : (
              <>
                <Text fz={12} c="var(--rb-ink-faint)" ta="center">
                  이 브라우저에서는 음성 인식이 안 돼요. 직접 적어서 연습해볼 수 있어요.
                </Text>
                <Button color="brand" radius="xl" onClick={() => setPhase('confirm')}>
                  ✍️ 직접 적어서 연습하기
                </Button>
              </>
            )}
          </Stack>
        )}

        {/* 말하는 중 */}
        {phase === 'answering' && (
          <Stack gap={10} align="center">
            <Text fz={14} c="var(--rb-ink-soft)">
              듣고 있어요. 천천히 말해보세요.
            </Text>
            <Button color="brand" radius="xl" onClick={handleDoneSpeaking}>
              ✓ 답변 끝
            </Button>
          </Stack>
        )}

        {/* 확인·수정 */}
        {phase === 'confirm' && (
          <Stack gap={10}>
            <Textarea
              label="내 답변"
              description={live.supported ? '말한 내용이 적혀 있어요. 고치거나 덧붙여도 돼요.' : '여기에 적어보세요.'}
              minRows={5}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
            />
            <Box style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
              {live.supported && (
                <Button variant="subtle" radius="xl" onClick={handleStart}>
                  ↺ 다시 말해보기
                </Button>
              )}
              <Button color="brand" radius="xl" disabled={draft.trim() === ''} onClick={handleSubmit}>
                제출하기
              </Button>
            </Box>
          </Stack>
        )}

        {/* 결과 — 좋아진 점만 알린다 */}
        {phase === 'done' && (
          <Stack gap={16}>
            <Text fz={16} fw={700} ta="center" style={{ lineHeight: 1.7 }}>
              {CHANGE_MESSAGE[compareAnswers(previousAnswer, answer)]}
            </Text>
            <Box
              style={{
                padding: '16px 18px',
                borderRadius: 16,
                background: 'var(--rb-surface)',
                border: '1px solid var(--rb-line)',
              }}
            >
              <Text fz={11} fw={700} c="var(--rb-primary-strong)" mb={6}>
                이번 답변
              </Text>
              <Text fz={14} style={{ lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                {answer}
              </Text>
            </Box>
            {previousAnswer.trim() !== '' && (
              <details>
                <summary style={{ cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>처음 답변 보기</summary>
                <Text fz={13} c="var(--rb-ink-soft)" mt={8} style={{ lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                  {previousAnswer}
                </Text>
              </details>
            )}
            <Box style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
              <Button variant="default" radius="xl" onClick={handleAgain}>
                한 번 더 해보기
              </Button>
              <Button color="brand" radius="xl" onClick={() => navigate('/dashboard')}>
                마치기
              </Button>
            </Box>
          </Stack>
        )}
      </Stack>
    </Box>
  );
}
