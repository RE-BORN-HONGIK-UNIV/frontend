import { useRef, useState } from 'react';
import { Box, Button, Stack, Text } from '@/components/ui';
import { useCalibrate } from './queries';
import type { CalibrationResult } from '@/lib/api/types';

// TODO(추후): 지금은 1단계 화면 켤 때마다 매번 새로 녹음하게 되어 있음.
// 나중엔 유저별로 최근 캘리브레이션 결과를 DB에 저장해두고
// "지난번 값 사용하기" 옵션을 주는 방식으로 바꿀 예정.

const SILENCE_SEC = 5;
const READ_SEC_1 = 5;
const READ_SEC_2 = 10;
const TOTAL_SEC = SILENCE_SEC + READ_SEC_1 + READ_SEC_2;

const READ_SCRIPT_1 = '안녕하세요, 편하게 목소리를 들려주세요.';
const READ_SCRIPT_2 = '오늘 하루는 어땠나요, 저는 그럭저럭 괜찮았어요. 이제 준비를 시작해볼게요.';

type Phase = 'idle' | 'silence' | 'read1' | 'read2' | 'uploading' | 'error';

interface CalibrationStepProps {
  onComplete: (result: CalibrationResult) => void;
}

export function CalibrationStep({ onComplete }: CalibrationStepProps) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [secondsLeft, setSecondsLeft] = useState(TOTAL_SEC);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const calibrate = useCalibrate();

  const cleanupStream = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  };

  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const file = new File([blob], 'calibration.webm', { type: 'audio/webm' });
        setPhase('uploading');

        calibrate.mutate(file, {
          onSuccess: (result) => onComplete(result),
          onError: () => setPhase('error'),
        });

        cleanupStream();
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setPhase('silence');
      setSecondsLeft(TOTAL_SEC);

      let elapsed = 0;
      const timer = setInterval(() => {
        elapsed += 1;
        setSecondsLeft(TOTAL_SEC - elapsed);

        if (elapsed === SILENCE_SEC) setPhase('read1');
        if (elapsed === SILENCE_SEC + READ_SEC_1) setPhase('read2');
        if (elapsed >= TOTAL_SEC) {
          clearInterval(timer);
          recorder.stop();
        }
      }, 1000);
    } catch (err) {
      setPhase('error');
    }
  };

  const retry = () => {
    setPhase('idle');
  };

  return (
    <Stack align="center" gap={16} py={32}>
      {phase === 'idle' && (
        <>
          <Text fz={18} fw={700}>
            마이크 및 목소리 점검
          </Text>
          <Text fz={13} c="var(--rb-ink-soft)" ta="center" lh={1.6}>
            주변 소음과 목소리를 미리 측정해 더 정확하게 분석하기 위한 준비 과정이에요.
            <br />
            조용히 5초 대기 후 안내 문장 두 개를 편하게 읽어주세요. (총 {TOTAL_SEC}초 소요)
            <br />
            <br />
            * 준비 단계이므로 평가나 분석 결과에는 반영되지 않아요.
          </Text>
          <Button onClick={start}>점검 시작하기</Button>
        </>
      )}

      {phase === 'silence' && (
        <Stack align="center" gap={8}>
          <Text fz={14}>주변 소음을 확인하고 있어요. 조용히 잠시만 기다려주세요.</Text>
          <Text fz={24} fw={700}>
            {secondsLeft}
          </Text>
        </Stack>
      )}

      {phase === 'read1' && (
        <Stack align="center" gap={8}>
          <Text fz={14} c="var(--rb-ink-faint)">
            목소리 크기를 체크할게요. 아래 문장을 편하게 읽어주세요
          </Text>
          <Text fz={16} fw={600}>
            &quot;{READ_SCRIPT_1}&quot;
          </Text>
        </Stack>
      )}

      {phase === 'read2' && (
        <Stack align="center" gap={8}>
          <Text fz={14} c="var(--rb-ink-faint)">
            잘 하셨어요! 이어서 다음 문장도 편하게 읽어주세요
          </Text>
          <Text fz={16} fw={600}>
            &quot;{READ_SCRIPT_2}&quot;
          </Text>
        </Stack>
      )}

      {phase === 'uploading' && <Text fz={14}>음성 환경 확인 중…</Text>}

      {phase === 'error' && (
        <Stack align="center" gap={8}>
          <Text fz={14} c="red">
            마이크 접근에 실패했거나 오류가 발생했어요. 마이크 권한을 확인해 주세요.
          </Text>
          <Button onClick={retry} variant="default">
            다시 시도하기
          </Button>
        </Stack>
      )}

      {phase !== 'idle' && phase !== 'error' && (
        <Box
          style={{
            width: '100%',
            height: 6,
            background: 'var(--rb-line)',
            borderRadius: 4,
            overflow: 'hidden',
          }}
        >
          <Box
            style={{
              width: `${((TOTAL_SEC - secondsLeft) / TOTAL_SEC) * 100}%`,
              height: '100%',
              background: 'var(--rb-primary)',
              transition: 'width 1s linear',
            }}
          />
        </Box>
      )}
    </Stack>
  );
}