import { useEffect, useRef, useState } from 'react';
import { Alert, Anchor, Box, Button, Group, Loader, Stack, Text } from '@mantine/core';
import { PageHeader } from '@/components/PageHeader';
import { useMediaPreview } from '@/features/interview/useMediaPreview';
import { useRecorder } from '@/features/interview/useRecorder';
import { uploadAnswer, getNextQuestion, getSpeechAudioUrl, transcribeAnswer } from '@/features/interview/api';
import { getAnxietyScore, getTier, QUESTION_BANK, type TierInfo } from '@/features/interview/difficulty';
import { InterviewerAvatar } from '@/features/interview/InterviewerAvatar';

type Step = 'intro' | 'test' | 'warmup' | 'question' | 'result';

/* ── 도입 화면 ─────────────────────────────────────────── */
function IntroView({ onStart }: { onStart: () => void }) {
  return (
    <Stack align="center" gap={20} ta="center" style={{ paddingTop: 40 }}>
      <Box
        style={{
          width: 96,
          height: 96,
          borderRadius: '50%',
          background: 'var(--rb-surface)',
          border: '1.5px dashed var(--rb-line-strong)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text fz={36}>🙂</Text>
      </Box>

      <Stack gap={8}>
        <Text fz={17} fw={600}>
          안녕하세요, 오늘 함께 연습해볼게요
        </Text>
        <Text fz={13} c="var(--rb-ink-soft)" style={{ maxWidth: 320, lineHeight: 1.6 }}>
          이건 실제 면접이 아니라 연습이에요. 편하게 준비되면 시작해주세요.
          언제든 중간에 쉬거나 멈출 수 있어요.
        </Text>
      </Stack>

      <Button color="brand" radius="md" size="md" onClick={onStart}>
        준비됐어요
      </Button>
    </Stack>
  );
}

/* ── 카메라/마이크 테스트 화면 ───────────────────────────── */
function MediaTestViewInner({
  media,
  onNext,
}: {
  media: ReturnType<typeof useMediaPreview>;
  onNext: () => void;
}) {
  const { videoRef, status, errorMessage, audioLevel, stream } = media;

    // video 태그가 뒤늦게 화면에 나타날 때 스트림을 다시 연결해줌
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream, videoRef]);

  return (
    <Stack align="center" gap={16} ta="center" style={{ paddingTop: 24 }}>
      <Text fz={16} fw={600}>
        카메라와 마이크를 확인해볼게요
      </Text>
      <Text fz={13} c="var(--rb-ink-soft)" style={{ maxWidth: 320, lineHeight: 1.6 }}>
        지금 이렇게 보이는 화면이에요. 답변할 때는 이 화면 대신
        면접관 화면만 보여드릴 거예요.
      </Text>

      <Box
        style={{
          width: '100%',
          maxWidth: 360,
          aspectRatio: '4 / 3',
          borderRadius: 12,
          overflow: 'hidden',
          background: '#000',
          border: '1px solid var(--rb-line)',
        }}
      >
        {status === 'requesting' && (
          <Stack align="center" justify="center" style={{ height: '100%' }} gap={8}>
            <Loader size="sm" color="brand" />
            <Text fz={12} c="white">
              카메라를 켜는 중이에요…
            </Text>
          </Stack>
        )}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            display: status === 'ready' ? 'block' : 'none',
            transform: 'scaleX(-1)',
          }}
        />
      </Box>

      {status === 'ready' && (
        <Stack gap={4} style={{ width: '100%', maxWidth: 360 }}>
          <Text fz={12} c="var(--rb-ink-soft)">
            말해보세요, 마이크가 반응하는지 보여드릴게요
          </Text>
          <Box style={{ height: 8, background: 'var(--rb-line)', borderRadius: 4, overflow: 'hidden' }}>
            <Box
              style={{
                height: '100%',
                width: `${audioLevel}%`,
                background: 'var(--rb-primary-strong)',
                borderRadius: 4,
                transition: 'width 80ms ease-out',
              }}
            />
          </Box>
        </Stack>
      )}

      {status === 'error' && (
        <Alert color="red" variant="light" fz={13} style={{ maxWidth: 360 }}>
          {errorMessage ?? '카메라/마이크 권한을 확인해주세요.'}
        </Alert>
      )}

      <Text fz={11} c="var(--rb-ink-faint)">
        ※ 촬영된 영상은 분석 후 저장되지 않아요.
      </Text>

      <Button color="brand" radius="md" onClick={onNext} disabled={status !== 'ready'}>
        잘 보여요, 시작할게요
      </Button>
    </Stack>
  );
}

const WARMUP_QUESTION = '오늘 컨디션은 어때요?';

/* ── 녹음 중 표시 (깜빡이는 점 + 실시간 마이크 음량 바) ───────────── */
function RecordingIndicator({ stream, active }: { stream: MediaStream | null; active: boolean }) {
  const [level, setLevel] = useState(0);
  const rafRef = useRef<number>();

  useEffect(() => {
    if (!active || !stream) {
      setLevel(0);
      return;
    }

    const audioCtx = new AudioContext();
    const source = audioCtx.createMediaStreamSource(stream);
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);
    const data = new Uint8Array(analyser.frequencyBinCount);

    const tick = () => {
      analyser.getByteFrequencyData(data);
      const avg = data.reduce((a, b) => a + b, 0) / data.length;
      setLevel(Math.min(100, (avg / 128) * 100));
      rafRef.current = requestAnimationFrame(tick);
    };
    tick();

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      source.disconnect();
      audioCtx.close();
    };
  }, [active, stream]);

  if (!active) return null;

  return (
    <Stack gap={8} align="center" style={{ width: 200 }}>
      <Group gap={6}>
        <Box
          style={{
            width: 10,
            height: 10,
            borderRadius: '50%',
            background: '#e03131',
            animation: 'rb-rec-pulse 1.2s ease-in-out infinite',
          }}
        />
        <Text fz={12} c="var(--rb-ink-soft)">
          답변을 이어가세요
        </Text>
      </Group>
      <Box
        style={{
          width: '100%',
          height: 6,
          background: 'var(--rb-line)',
          borderRadius: 3,
          overflow: 'hidden',
        }}
      >
        <Box
          style={{
            height: '100%',
            width: `${level}%`,
            background: 'var(--rb-primary-strong)',
            borderRadius: 3,
            transition: 'width 80ms ease-out',
          }}
        />
      </Box>
      <style>{`
        @keyframes rb-rec-pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.5); opacity: 0.5; }
        }
      `}</style>
    </Stack>
  );
}

/* ── 예열 질문 화면 ───────────────────────────────────────── */
function WarmupView({ stream, onDone }: { stream: MediaStream | null; onDone: () => void }) {
  const { isRecording, start, stop } = useRecorder(stream);
  const [phase, setPhase] = useState<'loading' | 'asking' | 'recording' | 'uploading' | 'done'>('loading');
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  useEffect(() => {
    getSpeechAudioUrl(WARMUP_QUESTION).then((url) => {
      setAudioUrl(url);
      setPhase('asking');
    });
  }, []);

  const handleAskingEnded = () => {
    setPhase('recording');
    start();
  };

  const handleFinish = async () => {
    const blob = await stop();
    if (!blob) return;
    setPhase('uploading');
    await uploadAnswer(blob);
    setPhase('done');
    onDone();
  };

  return (
    <Stack align="center" gap={20} ta="center" style={{ paddingTop: 40 }}>
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
        <InterviewerAvatar audioUrl={audioUrl} onEnded={handleAskingEnded} />
      )}

      <Stack gap={6}>
        <Text fz={12} c="var(--rb-ink-faint)">
          예열 질문 · 점수에 포함되지 않아요
        </Text>
        <Text fz={17} fw={600}>
          {WARMUP_QUESTION}
        </Text>
      </Stack>

      {phase === 'loading' && (
        <Text fz={12} c="var(--rb-ink-faint)">
          질문을 준비하고 있어요…
        </Text>
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
            답변을 저장하는 중이에요…
          </Text>
        </Group>
      )}

      <Button
        color="brand"
        radius="md"
        onClick={handleFinish}
        disabled={phase !== 'recording'}
      >
        답변 완료
      </Button>

      <Anchor fz={12} c="var(--rb-ink-faint)">
        잠깐 쉬기
      </Anchor>
    </Stack>
  );
}

const TOTAL_QUESTIONS = 3;

/* ── 본 질문 화면 ─────────────────────────────────────────── */
function QuestionView({
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

/* ── 결과 화면 (임시) ─────────────────────────────────────── */
function ResultView() {
  return (
    <Stack align="center" gap={10} ta="center" style={{ paddingTop: 60 }}>
      <Text fz={17} fw={600}>
        수고하셨어요!
      </Text>
      <Text fz={13} c="var(--rb-ink-soft)" style={{ maxWidth: 320, lineHeight: 1.6 }}>
        오늘 연습한 내용을 정리하고 있어요. 결과 화면은 다음 단계에서 만들 예정이에요.
      </Text>
    </Stack>
  );
}

/* ── 페이지 ──────────────────────────────────────────────── */
export default function InterviewStage() {
  const [step, setStep] = useState<Step>('intro');
  const [tier, setTier] = useState<TierInfo | null>(null);
  const media = useMediaPreview(); // intro 넘어가면서부터 계속 살아있게 최상위에서 관리

  const handleWarmupDone = async () => {
    // TODO: Stage1/2 연동 전까지는 mock 점수. 연동되면 getAnxietyScore() 내부만 교체하면 됨.
    const score = await getAnxietyScore();
    setTier(getTier(score));
    setStep('question');
  };

  return (
    <Box style={{ minHeight: '100dvh', background: 'var(--rb-bg)', paddingBottom: 60 }}>
      <PageHeader
        back="/dashboard"
        eyebrow="3단계 · 실전 면접 시뮬레이션"
        title="면접 시뮬레이터"
        subtitle="1,2단계 진단 결과를 바탕으로 난이도가 조절된 실전 면접을 진행합니다."
      />

      <Box style={{ maxWidth: 960, margin: '0 auto', padding: '20px 16px 0' }}>
        {step === 'intro' && <IntroView onStart={() => setStep('test')} />}

        {step === 'test' && (
          <MediaTestViewInner media={media} onNext={() => setStep('warmup')} />
        )}

        {step === 'warmup' && (
          <WarmupView stream={media.stream} onDone={handleWarmupDone} />
        )}

        {step === 'question' && tier && (
          <QuestionView
            stream={media.stream}
            tier={tier.tier}
            onAllDone={() => setStep('result')}
          />
        )}

        {step === 'result' && <ResultView />}
      </Box>
    </Box>
  );
}