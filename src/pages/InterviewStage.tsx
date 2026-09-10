import { useEffect, useState } from 'react';
import { Alert, Anchor, Box, Button, Group, Loader, Stack, Text } from '@mantine/core';
import { PageHeader } from '@/components/PageHeader';
import { useMediaPreview } from '@/features/interview/useMediaPreview';
import { useRecorder } from '@/features/interview/useRecorder';
import { uploadAnswer } from '@/features/interview/api';
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

/* ── 예열 질문 화면 ───────────────────────────────────────── */
function WarmupView({ stream, onDone }: { stream: MediaStream | null; onDone: () => void }) {
  const { isRecording, start, stop } = useRecorder(stream);
  const [phase, setPhase] = useState<'asking' | 'recording' | 'uploading' | 'done'>('asking');

  useEffect(() => {
    // 면접관이 질문을 "말하는" 동안 대기했다가 녹화 시작
    // TODO: 실제 TTS 붙이면 <audio> onEnded 이벤트로 이 setTimeout 교체
    const timer = setTimeout(() => {
      setPhase('recording');
      start();
    }, 2200);
    return () => clearTimeout(timer);
  }, [start]);

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
      <InterviewerAvatar />

      <Stack gap={6}>
        <Text fz={12} c="var(--rb-ink-faint)">
          예열 질문 · 점수에 포함되지 않아요
        </Text>
        <Text fz={17} fw={600}>
          오늘 컨디션은 어때요?
        </Text>
      </Stack>

      {phase === 'recording' && isRecording && (
        <Group gap={6}>
          <Box style={{ width: 8, height: 8, borderRadius: '50%', background: '#e03131' }} />
          <Text fz={12} c="var(--rb-ink-soft)">
            답변을 이어가세요
          </Text>
        </Group>
      )}

      {phase === 'uploading' && (
        <Group gap={8}>
          <Loader size="sm" color="brand" />
          <Text fz={13} c="var(--rb-ink-soft)">
            답변을 저장하는 중이에요…
          </Text>
        </Group>
      )}

      {phase === 'asking' && (
        <Text fz={12} c="var(--rb-ink-faint)">
          질문을 듣고 있어요…
        </Text>
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

/* ── 본 질문 화면 ─────────────────────────────────────────── */
function QuestionView({
  stream,
  questions,
  onAllDone,
}: {
  stream: MediaStream | null;
  questions: string[];
  onAllDone: () => void;
}) {
  const [index, setIndex] = useState(0);
  const { isRecording, start, stop } = useRecorder(stream);
  const [phase, setPhase] = useState<'asking' | 'recording' | 'uploading'>('asking');

  // 질문이 바뀔 때마다: 면접관이 질문을 "말하는" 시간 대기 → 녹화 시작
  // TODO: 실제 TTS 붙이면 <audio> onEnded 이벤트로 이 setTimeout 교체
  useEffect(() => {
    setPhase('asking');
    const timer = setTimeout(() => {
      setPhase('recording');
      start();
    }, 2200);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  const isLast = index === questions.length - 1;

  const handleFinish = async () => {
    const blob = await stop();
    if (!blob) return;
    setPhase('uploading');
    await uploadAnswer(blob);

    if (isLast) {
      onAllDone();
    } else {
      setIndex((i) => i + 1);
    }
  };

  return (
    <Stack align="center" gap={20} ta="center" style={{ paddingTop: 40 }}>
      <InterviewerAvatar />

      <Stack gap={6}>
        <Text fz={12} c="var(--rb-ink-faint)">
          질문 {index + 1} / {questions.length}
        </Text>
        <Text fz={17} fw={600} style={{ maxWidth: 360 }}>
          {questions[index]}
        </Text>
      </Stack>

      {phase === 'asking' && (
        <Text fz={12} c="var(--rb-ink-faint)">
          질문을 듣고 있어요…
        </Text>
      )}

      {phase === 'recording' && isRecording && (
        <Group gap={6}>
          <Box style={{ width: 8, height: 8, borderRadius: '50%', background: '#e03131' }} />
          <Text fz={12} c="var(--rb-ink-soft)">
            답변을 이어가세요
          </Text>
        </Group>
      )}

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
        {isLast ? '답변 완료하고 마치기' : '답변 완료'}
      </Button>
      {/* 버튼은 asking 단계에서 자동으로 비활성 상태를 유지함 */}

      <Anchor fz={12} c="var(--rb-ink-faint)">
        잠깐 쉬기
      </Anchor>
    </Stack>
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

      <Box style={{ maxWidth: 720, margin: '0 auto', padding: '20px 16px 0' }}>
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
            questions={QUESTION_BANK[tier.tier]}
            onAllDone={() => setStep('result')}
          />
        )}

        {step === 'result' && <ResultView />}
      </Box>
    </Box>
  );
}