import { useEffect, useRef, useState } from 'react';
import { Box, Group, Stack, Text } from '@mantine/core';

/** 녹음 중 표시 (깜빡이는 점 + 실시간 마이크 음량 바). */
export function RecordingIndicator({ stream, active }: { stream: MediaStream | null; active: boolean }) {
  const [level, setLevel] = useState(0);
  const rafRef = useRef<number | undefined>(undefined);

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
