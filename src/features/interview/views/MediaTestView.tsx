import { useEffect } from 'react';
import { Alert, Box, Button, Loader, Stack, Text } from '@mantine/core';
import type { useMediaPreview } from '@/features/interview/useMediaPreview';

/** 카메라/마이크 테스트 화면. */
export function MediaTestView({
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
