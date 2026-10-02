import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Button, Stack, Text } from '@/components/ui';
import { api } from '@/lib/api/client';
import type { CoachCard, CoachCardKind, CoachNote } from '@/lib/api/types';
import type { DifficultyTier } from '../difficulty';
import { getInterviewer } from '../interviewers';
import { summarizeResult, type InterviewResult } from '../resultSummary';

const KIND_LABEL = { main: '기본 질문', follow_up: '꼬리질문' } as const;

/** 코치 노트가 아직 없거나(작성 중·AI 실패) 동의하지 않았을 때 보여줄 기본 카드 */
const DEFAULT_CARDS: CoachCard[] = [
  { kind: 'again', title: '한 번 더 해보기', body: '방금 해본 흐름을 한 번 더 이어가 봐요. 면접관을 바꿔볼 수도 있어요.' },
  { kind: 'rest', title: '오늘은 여기까지', body: '충분히 잘했어요. 쉬는 것도 연습의 일부예요.' },
];

type NoteState = 'none' | 'loading' | 'ready' | 'failed';

/**
 * 3단계 면접 결과 화면 — 평가가 아니라 "내가 해낸 것"과 "다음 한 걸음"을 보여준다.
 *
 * 구성: 인사 → 오늘 해낸 것 → 내 말 중 좋았던 한 문장(AI 코치 노트) → 다음 한 걸음(카드, 고르기) → 접어둔
 * 질문·답변 → 기록 관리. 점수·등급·순위·다른 사람과의 비교는 일부러 넣지 않았다: 사회불안·은둔 상태에서는 평가받는
 * 느낌이 다시 오고 싶은 마음을 꺾는다. 다음 걸음은 하나를 시키지 않고 카드로 고르게 하며, "오늘은 여기까지"도
 * 같은 무게의 선택지로 둔다(쉬어도 괜찮다는 신호).
 *
 * 화면은 코치 노트를 기다리지 않고 바로 그려진다: 질문·답변은 면접 중 메모리에 모아둔 것(result.turns)이고,
 * 노트가 도착하기 전엔 사실만 말하는 기본 내용을 보여준 뒤 노트가 오면 채운다. 서버 저장이 안 됐으면
 * (sessionId 없음) 노트를 요청하지 않는다.
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

  const [note, setNote] = useState<CoachNote | null>(null);
  const [noteState, setNoteState] = useState<NoteState>(result.sessionId !== null ? 'loading' : 'none');
  const [deleted, setDeleted] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(false);

  useEffect(() => {
    if (result.sessionId === null) return;
    let cancelled = false;
    api
      .createCoachNote(result.sessionId)
      .then((res) => {
        if (cancelled) return;
        setNote(res.note);
        setNoteState('ready');
      })
      .catch(() => {
        if (!cancelled) setNoteState('failed'); // 노트가 없어도 결과 화면은 그대로 쓸 수 있다
      });
    return () => {
      cancelled = true;
    };
  }, [result.sessionId]);

  const handleDelete = async () => {
    if (result.sessionId === null) return;
    if (!window.confirm('이 면접의 질문과 답변 기록을 삭제할까요?\n코치 노트도 함께 지워지고, 되돌릴 수 없어요.')) return;
    setDeleting(true);
    setDeleteError(false);
    try {
      await api.deleteInterviewSession(result.sessionId);
      setDeleted(true);
    } catch {
      setDeleteError(true);
    }
    setDeleting(false);
  };

  const activeNote = deleted ? null : note;
  const care = activeNote?.care ?? null;

  // 코치 노트가 없을 때의 기본 내용: 사실(완주·답한 횟수)만 말한다
  const wonFallback = [
    '면접을 끝까지 마쳤어요',
    ...(answeredCount > 0 ? [`${answeredCount}개의 질문에 답했어요`] : []),
  ];
  const won = activeNote?.won.length ? activeNote.won : wonFallback;
  const greeting =
    activeNote?.greeting ??
    (answeredCount === questionCount && questionCount > 0
      ? `${interviewer.name} 면접관과 끝까지 함께했어요. 오늘 해낸 것만으로도 큰 한 걸음이에요.`
      : `${interviewer.name} 면접관과 끝까지 함께했어요. 여기까지 와준 것만으로도 충분해요.`);
  const cards = activeNote?.cards.length ? activeNote.cards : DEFAULT_CARDS;
  const recommended: CoachCardKind | null = activeNote?.recommended ?? null;

  const handleCard = (card: CoachCard) => {
    if (card.kind === 'again') onRetry();
    else if (card.kind === 'light_practice') navigate(card.path ?? '/voice');
    else if (card.kind === 'rest') navigate('/dashboard');
    // daily_mission은 읽는 카드 (눌러서 이동하는 곳이 없음)
  };

  return (
    <Stack align="center" gap={26} style={{ paddingTop: 32, paddingInline: 16, paddingBottom: 32 }}>
      {/* 인사 */}
      <Stack align="center" gap={10} ta="center" style={{ maxWidth: 400 }}>
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
        <Text fz={14} c="var(--rb-ink-soft)" style={{ lineHeight: 1.7 }}>
          {greeting}
        </Text>
      </Stack>

      {/* 위기 신호가 감지됐을 때: 코칭 대신 돌봄 안내만 */}
      {care && (
        <Box
          role="note"
          style={{
            maxWidth: 480,
            width: '100%',
            padding: '18px 20px',
            borderRadius: 16,
            background: 'var(--rb-primary-tint)',
            border: '1px solid var(--rb-line)',
          }}
        >
          <Stack gap={8}>
            <Text fz={14} style={{ lineHeight: 1.7 }}>
              {care.body}
            </Text>
            {care.resources && (
              <Text fz={13} c="var(--rb-ink-soft)" style={{ lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                {care.resources}
              </Text>
            )}
          </Stack>
        </Box>
      )}

      {!care && (
        <>
          {/* 오늘 해낸 것 */}
          <Stack gap={8} style={{ maxWidth: 480, width: '100%' }}>
            <Text fz={15} fw={700}>
              오늘 해낸 것
            </Text>
            <Stack gap={6}>
              {won.map((item) => (
                <Text key={item} fz={14} style={{ lineHeight: 1.6 }}>
                  ✓ {item}
                </Text>
              ))}
            </Stack>
            {noteState === 'loading' && (
              <Text fz={12} c="var(--rb-ink-faint)">
                코치 노트를 쓰고 있어요…
              </Text>
            )}
            {noteState === 'failed' && (
              <Text fz={12} c="var(--rb-ink-faint)">
                코치 노트를 불러오지 못했어요. 그래도 오늘 해낸 건 그대로예요.
              </Text>
            )}
          </Stack>

          {/* 내 말 중 좋았던 한 문장 — 서버가 실제 답변과 대조해 검증한 것만 온다 */}
          {activeNote?.quote && (
            <Stack gap={8} style={{ maxWidth: 480, width: '100%' }}>
              <Text fz={15} fw={700}>
                내 말 중 좋았던 한 문장
              </Text>
              <Box
                style={{
                  padding: '16px 18px',
                  borderRadius: 16,
                  background: 'var(--rb-surface)',
                  borderLeft: '4px solid var(--rb-primary)',
                  border: '1px solid var(--rb-line)',
                }}
              >
                <Text fz={15} fw={600} style={{ lineHeight: 1.7 }}>
                  “{activeNote.quote.text}”
                </Text>
                <Text fz={13} c="var(--rb-ink-soft)" mt={6} style={{ lineHeight: 1.6 }}>
                  {activeNote.quote.why}
                </Text>
              </Box>
            </Stack>
          )}
        </>
      )}

      {/* 다음 한 걸음 — 하나를 시키지 않고 고르게 한다 */}
      <Stack gap={10} style={{ maxWidth: 480, width: '100%' }}>
        <Text fz={15} fw={700}>
          다음 한 걸음
        </Text>
        <Text fz={12} c="var(--rb-ink-faint)">
          하나만 골라도 충분해요. 오늘은 여기까지도 좋아요.
        </Text>
        {cards.map((card) => {
          const isRecommended = card.kind === recommended;
          const actionable = card.kind !== 'daily_mission';
          const content = (
            <Stack gap={4} align="flex-start" ta="left">
              <Box style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Text fz={14} fw={700}>
                  {card.title}
                </Text>
                {isRecommended && (
                  <Text fz={11} fw={700} c="var(--rb-primary-strong)">
                    추천
                  </Text>
                )}
              </Box>
              <Text fz={13} c="var(--rb-ink-soft)" style={{ lineHeight: 1.6 }}>
                {card.body}
              </Text>
            </Stack>
          );
          const style = {
            width: '100%',
            padding: '14px 18px',
            borderRadius: 16,
            background: 'var(--rb-surface)',
            border: isRecommended ? '2px solid var(--rb-primary)' : '1px solid var(--rb-line)',
            textAlign: 'left' as const,
            font: 'inherit',
            color: 'inherit',
          };
          return actionable ? (
            <button key={card.kind} type="button" onClick={() => handleCard(card)} style={{ ...style, cursor: 'pointer' }}>
              {content}
            </button>
          ) : (
            <Box key={card.kind} style={style}>
              {content}
            </Box>
          );
        })}
      </Stack>

      {/* 오늘의 질문과 답변 — 접어둠 (다시 보고 싶을 때만) */}
      {!deleted && result.turns.length > 0 && (
        <details style={{ maxWidth: 480, width: '100%' }}>
          <summary style={{ cursor: 'pointer', fontSize: 14, fontWeight: 700 }}>
            오늘의 질문과 답변 다시 보기 ({questionCount}개 · 약 {minutes}분)
          </summary>
          <Stack gap={12} mt={12}>
            <Text fz={11} c="var(--rb-ink-faint)">
              답변은 음성 인식을 바탕으로 한 텍스트라 실제 말과 조금 다를 수 있어요.
            </Text>
            {result.turns.map((turn, i) => (
              <Box
                key={i}
                style={{
                  padding: '14px 16px',
                  borderRadius: 14,
                  background: 'var(--rb-surface)',
                  border: '1px solid var(--rb-line)',
                }}
              >
                <Stack gap={6}>
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
          </Stack>
        </details>
      )}

      {/* 기록 관리 */}
      <Stack align="center" gap={6} ta="center" style={{ maxWidth: 420 }}>
        {deleted ? (
          <Text fz={13} c="var(--rb-ink-soft)" style={{ lineHeight: 1.7 }}>
            면접 기록을 삭제했어요. 질문과 답변, 코치 노트가 서버에서 지워졌어요.
          </Text>
        ) : result.sessionId !== null ? (
          <>
            <Text fz={11} c="var(--rb-ink-faint)" style={{ lineHeight: 1.6 }}>
              이 기록은 내 계정에만 저장돼요. 원하면 언제든 삭제할 수 있어요.
            </Text>
            <Button variant="subtle" color="gray" size="xs" disabled={deleting} onClick={handleDelete}>
              {deleting ? '삭제하는 중…' : '이 면접 기록 삭제'}
            </Button>
          </>
        ) : (
          <Text fz={11} c="var(--rb-ink-faint)" style={{ lineHeight: 1.6 }}>
            이번 면접은 기록이 저장되지 않았어요. 이 화면을 나가면 내용이 사라져요.
          </Text>
        )}
        {deleteError && (
          <Text fz={12} c="var(--rb-ink-soft)">
            삭제하지 못했어요. 잠시 후 다시 시도해주세요.
          </Text>
        )}
      </Stack>
    </Stack>
  );
}
