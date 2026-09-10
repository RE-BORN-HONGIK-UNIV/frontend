import { useEffect, useRef } from 'react';
import { Box, Text } from '@mantine/core';

interface InterviewerAvatarProps {
  width?: number;
  height?: number;
  onEnded?: () => void;
}

/**
 * 면접관 아바타 — 화상면접 창처럼 네모난 프레임 안에서
 * talking.mp4를 소리와 함께 재생 (loop 아님, 끝까지 재생 후 onEnded 호출).
 *
 * 사용하는 쪽에서 key={질문index} 를 줘서 컴포넌트를 강제로 다시 마운트하면
 * 질문 바뀔 때마다 영상이 처음부터 다시 재생됨.
 *
 * TODO: 지금은 talking.mp4에 원래 녹음된 음성이 그대로 나옴 (질문 내용과 무관).
 * 나중에 API+TTS 연동하면 실제 질문 텍스트를 읽어주는 음성으로 교체 예정.
 *
 * 필요한 파일 (public 폴더 기준):
 *   /interviewer/talking.mp4
 */
export function InterviewerAvatar({ width = 320, height = 240, onEnded }: InterviewerAvatarProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.play().catch(() => {
      // 소리 있는 자동재생이 브라우저 정책에 막힌 경우 — 무음으로라도 재생해서
      // onEnded가 영원히 안 오는(화면이 멈추는) 사고를 막는다.
      v.muted = true;
      v.play().catch(() => {});
    });
  }, []);

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
        autoPlay
        playsInline
        onEnded={onEnded}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
        }}
      />

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