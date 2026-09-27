import { useEffect, useState } from 'react';
import { Box, Button, Stack, Text } from '@/components/ui';
import { getSpeechAudioUrl } from '@/features/interview/api';
import { InterviewerAvatar } from '@/features/interview/InterviewerAvatar';
import { getInterviewer, MAIN_QUESTION_COUNT } from '@/features/interview/interviewers';
import type { DifficultyTier } from '@/features/interview/difficulty';

/**
 * 기기 점검 후, 면접 시작 직전 안내 화면.
 * 배정된 면접관이 인사말을 음성(TTS)으로 읽어주고, 진행 방식을 안내함.
 * 음성 재생이 끝나지 않아도 "면접 시작"은 언제든 누를 수 있음.
 */
export function ReadyView({ tier, onStart }: { tier: DifficultyTier; onStart: () => void }) {
  const interviewer = getInterviewer(tier);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  useEffect(() => {
    let url: string | null = null;
    getSpeechAudioUrl(interviewer.readyGreeting, tier).then((u) => {
      url = u;
      setAudioUrl(u);
    });
    // 화면을 떠나면 음성 파일 URL 정리 (메모리 누수 방지)
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [interviewer.readyGreeting, tier]);

  // 꼬리질문 개수에 따라 안내 문구가 달라짐
  const questionGuide =
    interviewer.followUps > 0
      ? `기본 질문 ${MAIN_QUESTION_COUNT}개로 진행되고, 답변에 따라 이어지는 질문이 있을 수 있어요.`
      : `기본 질문 ${MAIN_QUESTION_COUNT}개로 진행돼요.`;

  return (
    <Stack align="center" gap={24} style={{ paddingTop: 40, paddingInline: 16 }}>
      {/* 음성이 준비되면 자동 재생. 실패(null)하면 음성 없이 아바타만 표시 */}
      <InterviewerAvatar tier={tier} audioUrl={audioUrl} />

      {/* 말풍선 */}
      <Box
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: 480,
          padding: '20px 24px',
          borderRadius: 20,
          background: 'var(--rb-surface)',
          border: '1px solid var(--rb-line)',
        }}
      >
        <Text fz={15} fw={600} ta="center" style={{ lineHeight: 1.7 }}>
          {interviewer.readyGreeting}
        </Text>
      </Box>

      {/* 진행 안내 */}
      <Stack
        gap={6}
        style={{
          width: '100%',
          maxWidth: 480,
          padding: '14px 18px',
          borderRadius: 12,
          background: 'var(--rb-bg, #fff)',
          border: '1px solid var(--rb-line)',
        }}
      >
        <Text fz={12} c="var(--rb-ink-soft)">
          · {questionGuide}
        </Text>
        <Text fz={12} c="var(--rb-ink-soft)">
          · 생각이 정리될 때까지 잠깐 멈춰도 괜찮아요.
        </Text>
        <Text fz={12} c="var(--rb-ink-soft)">
          · 말한 내용은 화면에 글로 보여드리고, 잘못 들린 부분은 직접 고칠 수 있어요.
        </Text>
      </Stack>

      <Button color="brand" radius="md" size="md" onClick={onStart}>
        면접 시작
      </Button>
    </Stack>
  );
}