import { useEffect, useRef } from 'react';
import { Box, Text } from '@mantine/core';

interface InterviewerAvatarProps {
  width?: number;
  height?: number;
}

/**
 * 면접관 아바타 — 화상면접 창처럼 네모난 프레임 안에서
 * talking.mp4를 계속 loop 재생. (idle 이미지/크로스페이드 제거, 단순화 버전)
 *
 * 필요한 파일 (public 폴더 기준):
 *   /interviewer/talking.mp4
 */
export function InterviewerAvatar({ width = 320, height = 240 }: InterviewerAvatarProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    videoRef.current?.play().catch(() => {});
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
        muted
        loop
        autoPlay
        playsInline
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