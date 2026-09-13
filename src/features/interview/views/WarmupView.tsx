import { useEffect, useState } from 'react';
import { Anchor, Box, Button, Group, Loader, Stack, Text } from '@mantine/core';
import { useRecorder } from '@/features/interview/useRecorder';
import { uploadAnswer, getSpeechAudioUrl } from '@/features/interview/api';
import { InterviewerAvatar } from '@/features/interview/InterviewerAvatar';
import { RecordingIndicator } from './RecordingIndicator';

const WARMUP_QUESTION = '오늘 컨디션은 어때요?';

/** 예열 질문 화면. */
export function WarmupView({ stream, onDone }: { stream: MediaStream | null; onDone: () => void }) {
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
