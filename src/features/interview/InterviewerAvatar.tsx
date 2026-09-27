import { useEffect, useRef, useState } from 'react';
import { Box, Text } from '@/components/ui';
import type { DifficultyTier } from './difficulty';
import { getInterviewer } from './interviewers';

interface InterviewerAvatarProps {
  tier?: DifficultyTier;
  width?: number;
  audioUrl?: string | null;
  onEnded?: () => void;
}

/**
 * 면접관 아바타.
 * TTS 음성(audioUrl)이 재생되는 동안 아바타 주변에 말하는 중 표시(테두리 파동)가 나타남.
 * 재생이 끝나면 onEnded 호출.
 * audioUrl이 없거나(TTS 실패) 자동재생이 막히면 즉시 onEnded 호출해서 흐름이 안 멈추게 함.
 * TODO: 아바타 이미지 완성되면 emoji 대신 입 닫힘/벌림 이미지 2장 번갈아 표시
 */
export function InterviewerAvatar({ tier = 'standard', width = 200, audioUrl, onEnded }: InterviewerAvatarProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [speaking, setSpeaking] = useState(false);
  const interviewer = getInterviewer(tier);

  useEffect(() => {
    if (!audioUrl) {
      onEnded?.();
      return;
    }
    audioRef.current?.play().catch(() => {
      // 자동재생 막힌 경우에도 흐름은 이어지게
      onEnded?.();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audioUrl]);

  const handleEnded = () => {
    setSpeaking(false);
    onEnded?.();
  };

  return (
    <Box style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      {/* 말하는 중 파동 애니메이션 */}
      <style>{`
        @keyframes rb-speak-pulse {
          0%   { box-shadow: 0 0 0 0 rgba(18, 184, 134, 0.35); }
          100% { box-shadow: 0 0 0 18px rgba(18, 184, 134, 0); }
        }
      `}</style>

      <Box
        role="img"
        aria-label={`${interviewer.name} 면접관${speaking ? ', 말하는 중' : ''}`}
        style={{
          width,
          height: width,
          borderRadius: '50%',
          background: 'var(--rb-surface)',
          border: `2px solid ${speaking ? 'var(--rb-brand, #12b886)' : 'var(--rb-line)'}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          animation: speaking ? 'rb-speak-pulse 1s ease-out infinite' : 'none',
          transition: 'border-color 150ms',
        }}
      >
        <Text fz={width * 0.45}>{interviewer.emoji}</Text>
      </Box>

      <Text fz={13} fw={600} c="var(--rb-ink-soft)">
        {interviewer.name} 면접관
      </Text>

      {audioUrl && (
        <audio
          ref={audioRef}
          src={audioUrl}
          onPlay={() => setSpeaking(true)}
          onPause={() => setSpeaking(false)}
          onEnded={handleEnded}
        />
      )}
    </Box>
  );
}