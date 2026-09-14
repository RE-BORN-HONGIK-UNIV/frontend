import { useEffect, useState } from 'react';
import { Anchor, Box, Button, Group, Loader, Stack, Text } from '@/components/ui';
import { useRecorder } from '@/features/interview/useRecorder';
import { uploadAnswer, getNextQuestion, getSpeechAudioUrl, transcribeAnswer } from '@/features/interview/api';
import { QUESTION_BANK, type TierInfo } from '@/features/interview/difficulty';
import { InterviewerAvatar } from '@/features/interview/InterviewerAvatar';
import { RecordingIndicator } from './RecordingIndicator';

const TOTAL_QUESTIONS = 3;

/** 본 질문 화면. */
export function QuestionView({
  stream,
  tier,
  onAllDone,
}: {
  stream: MediaStream | null;
  tier: TierInfo['tier'];
  onAllDone: () => void;
}) {
  const [index, setIndex] = useState(0);
  const [currentQuestion, setCurrentQuestion] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [askedQuestions, setAskedQuestions] = useState<string[]>([]);
  const [previousAnswer, setPreviousAnswer] = useState<string>('');
  // 디버그용 대화 기록 — 질문/답변이 실제로 잘 오가는지 눈으로 확인하기 위함
  const [history, setHistory] = useState<{ question: string; answer?: string }[]>([]);
  const { isRecording, start, stop } = useRecorder(stream);
  const [phase, setPhase] = useState<'loading' | 'asking' | 'recording' | 'uploading'>('loading');

  // 질문이 바뀔 때마다: 백엔드(Claude API)에서 다음 질문 받아오고 → TTS 음성까지 받아옴
  // previousAnswer가 있으면(STT로 변환된 방금 답변) 꼬리질문 생성에 참고됨
  useEffect(() => {
    let cancelled = false;
    setPhase('loading');
    setAudioUrl(null);

    const applyQuestion = async (question: string) => {
      if (cancelled) return;
      setCurrentQuestion(question);
      setAskedQuestions((prev) => [...prev, question]);
      setHistory((prev) => [...prev, { question }]);
      const url = await getSpeechAudioUrl(question);
      if (cancelled) return;
      setAudioUrl(url);
      setPhase('asking');
    };

    getNextQuestion(tier, askedQuestions, previousAnswer || undefined)
      .then(({ question }) => applyQuestion(question))
      .catch(() => {
        // 백엔드 연결 실패 시 고정 질문 리스트로 폴백 — 화면 흐름은 항상 유지
        const fallback = QUESTION_BANK[tier][index % QUESTION_BANK[tier].length];
        applyQuestion(fallback);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  const handleAskingEnded = () => {
    setPhase('recording');
    start();
  };

  const isLast = index === TOTAL_QUESTIONS - 1;

  const handleFinish = async () => {
    const blob = await stop();
    if (!blob) return;
    setPhase('uploading');
    await uploadAnswer(blob);

    // STT로 방금 답변 텍스트 변환 — 다음 질문(꼬리질문) 생성에 씀
    const transcript = await transcribeAnswer(blob);
    setPreviousAnswer(transcript);
    setHistory((prev) =>
      prev.map((h, i) => (i === prev.length - 1 ? { ...h, answer: transcript } : h))
    );

    if (isLast) {
      onAllDone();
    } else {
      setIndex((i) => i + 1);
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        gap: 32,
        justifyContent: 'center',
        alignItems: 'flex-start',
        flexWrap: 'wrap',
      }}
    >
      <Stack align="center" gap={20} ta="center" style={{ paddingTop: 40, flex: '0 0 360px' }}>
        {phase === 'loading' ? (
          <Box
            style={{
              width: 320,
              height: 240,
              borderRadius: 16,
              border: '1px solid var(--rb-line-strong)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Loader size="sm" color="brand" />
          </Box>
        ) : (
          <InterviewerAvatar key={index} audioUrl={audioUrl} onEnded={handleAskingEnded} />
        )}

        <Stack gap={6}>
          <Text fz={12} c="var(--rb-ink-faint)">
            질문 {index + 1} / {TOTAL_QUESTIONS}
          </Text>
        <Text fz={17} fw={600} style={{ maxWidth: 360, minHeight: 26 }}>
          {phase === 'loading' ? '' : currentQuestion}
        </Text>
      </Stack>

      {phase === 'loading' && (
        <Stack gap={10} style={{ maxWidth: 340 }}>
          {previousAnswer && (
            <Box
              style={{
                border: '1px solid var(--rb-line)',
                background: 'var(--rb-surface)',
                borderRadius: 10,
                padding: '10px 14px',
                textAlign: 'left',
              }}
            >
              <Text fz={11} c="var(--rb-ink-faint)" mb={4}>
                방금 답변을 이렇게 들었어요
              </Text>
              <Text fz={13} c="var(--rb-ink-soft)" style={{ lineHeight: 1.5 }}>
                “{previousAnswer}”
              </Text>
            </Box>
          )}
          <Text fz={12} c="var(--rb-ink-faint)">
            {previousAnswer ? '답변을 참고해서 다음 질문을 준비하고 있어요…' : '질문을 준비하고 있어요…'}
          </Text>
        </Stack>
      )}

      {phase === 'asking' && (
        <Text fz={12} c="var(--rb-ink-faint)">
          질문을 듣고 있어요…
        </Text>
      )}

      <RecordingIndicator stream={stream} active={phase === 'recording' && isRecording} />

      {phase === 'uploading' && (
        <Group gap={8}>
          <Loader size="sm" color="brand" />
          <Text fz={13} c="var(--rb-ink-soft)">
            답변을 정리하는 중이에요…
          </Text>
        </Group>
      )}

      <Button
        color="brand"
        radius="md"
        onClick={handleFinish}
        disabled={phase !== 'recording'}
      >
        {isLast ? '답변 완료하고 마치기' : '답변 완료'}
      </Button>

      <Anchor fz={12} c="var(--rb-ink-faint)">
        잠깐 쉬기
      </Anchor>
      </Stack>

      {/* 디버그용 대화 기록 — 질문/답변이 잘 오가는지 확인용 */}
      <Box
        style={{
          flex: '1 1 280px',
          maxWidth: 340,
          marginTop: 40,
          border: '1px solid var(--rb-line)',
          background: 'var(--rb-surface)',
          borderRadius: 12,
          padding: '16px 18px',
          maxHeight: 480,
          overflowY: 'auto',
          textAlign: 'left',
        }}
      >
        <Text fz={12} fw={600} c="var(--rb-ink-faint)" mb={12}>
          대화 기록 (확인용)
        </Text>
        {history.length === 0 && (
          <Text fz={12} c="var(--rb-ink-faint)">
            아직 대화가 없어요.
          </Text>
        )}
        <Stack gap={16}>
          {history.map((h, i) => (
            <Box key={i}>
              <Text fz={13} fw={600} style={{ lineHeight: 1.5 }}>
                Q{i + 1}. {h.question}
              </Text>
              {h.answer !== undefined && (
                <Text fz={12} c="var(--rb-ink-soft)" mt={4} style={{ lineHeight: 1.5 }}>
                  A. {h.answer || '(인식된 텍스트 없음)'}
                </Text>
              )}
            </Box>
          ))}
        </Stack>
      </Box>
    </div>
  );
}
