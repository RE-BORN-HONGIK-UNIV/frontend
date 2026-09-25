import { useRef } from 'react';
import { Alert, Box, Button, Group, Paper, Stack, Text } from '@/components/ui';
import type { GazeBlinkResult } from '@/lib/api/types';
import { useLiveFaceSession, type LivePhase } from './useLiveFaceSession';

const PHASE_LABEL: Record<LivePhase, string> = {
  idle: '준비 중…',
  loading: '카메라·분석 모델 불러오는 중…',
  calibrating: '캘리브레이션 중 — 정면을 봐주세요',
  ready: '캘리브레이션 완료',
  recording: '촬영 중',
  error: '오류',
};

/** 실시간 촬영 모드 — 파일 업로드 대신 웹캠으로 바로 분석한다. 로직은
 * useLiveFaceSession(Phase 1~3에서 검증한 blink/gaze/expression 로직을 한
 * MediaPipe 세션으로 묶은 것)이 다 갖고 있고, 여기서는 UI(버튼·안내 문구)만
 * 담당한다.
 *
 * 흐름: 마운트되면 카메라·캘리브레이션은 자동으로 시작되지만, 캘리브레이션이
 * 끝나도 곧장 촬영(점수에 반영되는 구간)으로 넘어가지 않는다 — 캘리브레이션
 * 중 얼굴이 잘 인식됐는지 결과를 보여주고, 사용자가 직접 "촬영 시작"을
 * 눌러야 실제 촬영이 시작된다. */
export function LiveCaptureView({ onComplete }: { onComplete: (result: GazeBlinkResult) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const {
    phase,
    elapsedSec,
    errorMessage,
    faceDetected,
    calibrationSummary,
    calibrationSec,
    maxCaptureSec,
    recordingElapsedSec,
    beginRecording,
    finish,
  } = useLiveFaceSession({ videoRef, onComplete });

  const calibrationLooksGood = (calibrationSummary?.detectedRatio ?? 0) >= 0.5;

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
          {phase === 'ready' && (
            <Text fz={13} c={faceDetected ? 'var(--rb-primary-strong)' : 'var(--rb-amber-strong)'}>
              {faceDetected ? '· 지금 얼굴 인식됨' : '· 지금 얼굴이 안 보여요'}
            </Text>
          )}
          {phase === 'recording' && (
            <Text fz={13} c="var(--rb-ink-faint)">
              경과 {recordingElapsedSec.toFixed(1)}초 / 최대 {maxCaptureSec}초
            </Text>
          )}
        </Group>

        {phase === 'ready' && calibrationSummary && (
          <Alert color={calibrationLooksGood ? 'brand' : 'red'} variant="light" p="sm" fz={13}>
            {calibrationLooksGood
              ? '✓ 캘리브레이션 중 얼굴이 잘 인식됐어요. 준비되면 촬영을 시작하세요.'
              : '⚠ 캘리브레이션 중 얼굴이 잘 안 잡혔어요. 카메라 위치나 조명을 확인하고 촬영을 시작하거나, 페이지를 새로고침해서 다시 시도해보세요.'}
          </Alert>
        )}

        {phase === 'error' && (
          <Alert color="red" variant="light" p="xs" fz={13}>
            {errorMessage || '카메라를 시작할 수 없어요. 브라우저 권한을 확인해주세요.'}
          </Alert>
        )}

        {phase === 'ready' ? (
          <Button fullWidth color="brand" radius="md" onClick={beginRecording}>
            촬영 시작
          </Button>
        ) : (
          <Button fullWidth color="brand" radius="md" disabled={phase !== 'recording'} onClick={finish}>
            촬영 종료
          </Button>
        )}

        <Text fz={11} c="var(--rb-ink-faint)" style={{ textAlign: 'center' }}>
          정확한 분석을 위해 10초 이상 촬영을 권장해요. 최대 {maxCaptureSec / 60}분이 지나면 자동으로 종료돼요.
        </Text>
      </Stack>
    </Paper>
  );
}
