import { useRef } from 'react';
import { Alert, Box, Button, Group, Paper, Stack, Text } from '@/components/ui';
import type { GazeBlinkResult } from '@/lib/api/types';
import { useLiveFaceSession, type LivePhase } from './useLiveFaceSession';

const PHASE_LABEL: Record<LivePhase, string> = {
  idle: '촬영 시작을 눌러주세요',
  loading: '카메라·분석 모델 불러오는 중…',
  calibrating: '캘리브레이션 중 — 정면을 봐주세요',
  recording: '촬영 중',
  error: '오류',
};

/** 실시간 촬영 모드 — 파일 업로드 대신 웹캠으로 바로 분석한다. 로직은
 * useLiveFaceSession(Phase 1~3에서 검증한 blink/gaze/expression 로직을 한
 * MediaPipe 세션으로 묶은 것)이 다 갖고 있고, 여기서는 UI(버튼·안내 문구)만
 * 담당한다. */
export function LiveCaptureView({ onComplete }: { onComplete: (result: GazeBlinkResult) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const { phase, elapsedSec, errorMessage, faceDetected, calibrationSec, maxCaptureSec, start, finish } =
    useLiveFaceSession({ videoRef, onComplete });

  return (
    <Paper p={24} radius="lg" withBorder style={{ background: 'var(--rb-surface)', borderColor: 'var(--rb-line)' }}>
      <Stack gap={12}>
        <Box
          style={{
            position: 'relative',
            borderRadius: 10,
            overflow: 'hidden',
            background: '#000',
            aspectRatio: '4 / 3',
            maxWidth: 480,
            margin: '0 auto',
          }}
        >
          <video
            ref={videoRef}
            muted
            playsInline
            style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }}
          />

          {phase === 'idle' && (
            <Box
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Button color="brand" radius="md" onClick={start}>
                촬영 시작
              </Button>
            </Box>
          )}
        </Box>

        <Group justify="center" gap={8}>
          <Text fz={13} fw={600} c="var(--rb-primary-strong)">
            {PHASE_LABEL[phase]}
          </Text>
          {phase === 'calibrating' && (
            <>
              <Text fz={13} c="var(--rb-ink-faint)">
                ({elapsedSec.toFixed(1)}/{calibrationSec}초)
              </Text>
              <Text fz={13} c={faceDetected ? 'var(--rb-primary-strong)' : 'var(--rb-amber-strong)'}>
                {faceDetected ? '· 얼굴 인식됨' : '· 얼굴이 안 보여요'}
              </Text>
            </>
          )}
          {phase === 'recording' && (
            <Text fz={13} c="var(--rb-ink-faint)">
              경과 {elapsedSec.toFixed(1)}초 / 최대 {maxCaptureSec}초
            </Text>
          )}
        </Group>

        {phase === 'error' && (
          <Alert color="red" variant="light" p="xs" fz={13}>
            {errorMessage || '카메라를 시작할 수 없어요. 브라우저 권한을 확인해주세요.'}
          </Alert>
        )}

        <Button fullWidth color="brand" radius="md" disabled={phase !== 'recording'} onClick={finish}>
          촬영 종료하고 결과 보기
        </Button>

        <Text fz={11} c="var(--rb-ink-faint)" style={{ textAlign: 'center' }}>
          정확한 분석을 위해 캘리브레이션 이후 10초 이상 촬영을 권장해요. 최대 {maxCaptureSec / 60}분이 지나면
          자동으로 종료돼요.
        </Text>
      </Stack>
    </Paper>
  );
}
