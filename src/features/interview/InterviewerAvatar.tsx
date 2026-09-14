import { useEffect, useRef } from 'react';
import { Box, Text } from '@/components/ui';

interface InterviewerAvatarProps {
  width?: number;
  height?: number;
  audioUrl?: string | null;
  onEnded?: () => void;
}

/**
 * 면접관 아바타 — 화상면접 창 스타일.
 * 영상(talking.mp4)은 TTS 음성(audioUrl)이 재생되는 동안에만 같이 움직이고,
 * 음성이 끝나면 영상도 같이 멈춤. audioUrl 재생이 끝나면 onEnded 호출.
 *
 * audioUrl이 없으면(TTS 실패 등) 영상은 멈춘 채로 두고 즉시 onEnded 호출
 * (화면이 멈추지 않도록).
 *
 * 필요한 파일 (public 폴더 기준):
 *   /interviewer/talking.mp4
 */
export function InterviewerAvatar({ width = 320, height = 240, audioUrl, onEnded }: InterviewerAvatarProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (!audioUrl) {
      // TTS 실패/없음 — 영상은 멈춘 채로 두고, 흐름만 이어지게
      onEnded?.();
      return;
    }
    audioRef.current?.play().catch(() => {
      // 자동재생 막힌 경우에도 흐름은 이어지게
      onEnded?.();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audioUrl]);

  const handleAudioPlay = () => {
    videoRef.current?.play().catch(() => {});
  };

  const handleAudioEnded = () => {
    videoRef.current?.pause(); // 질문 끝나면 영상도 같이 멈춤
    onEnded?.();
  };

  return (
    <Box
      style={{
        width,
        height,
        borderRadius: 16,
        overflow: 'hidden',
        position: 'relative',
        border: '1px solid var(--rb-line-strong)',
        background: '#000',
        boxShadow: '0 2px 14px rgba(0,0,0,0.10)',
      }}
    >
      <video
        ref={videoRef}
        src="/interviewer/talking.mp4"
        muted
        loop
        playsInline
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
        }}
      />

      {audioUrl && (
        <audio ref={audioRef} src={audioUrl} onPlay={handleAudioPlay} onEnded={handleAudioEnded} />
      )}

      <Box
        style={{
          position: 'absolute',
          bottom: 10,
          left: 10,
          padding: '3px 9px',
          borderRadius: 5,
          background: 'rgba(0,0,0,0.45)',
        }}
      >
        <Text fz={11.5} c="white">
          면접관
        </Text>
      </Box>
    </Box>
  );
}