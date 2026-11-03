import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Box, Button, Text } from '@/components/ui';
import { useCalibrate } from './queries';
import { useMicLevel } from './useMicLevel';
import type { CalibrationResult } from '@/lib/api/types';

// TODO(추후): 지금은 1단계 화면 켤 때마다 매번 새로 녹음하게 되어 있음.
// 나중엔 유저별로 최근 캘리브레이션 결과를 DB에 저장해두고
// "지난번 값 사용하기" 옵션을 주는 방식으로 바꿀 예정.

// 시간 배분은 그대로 — 백엔드 analyze_calibration이 처음 5초(CALIBRATION_SILENCE_SEC)를 주변 소음으로,
// 그 뒤를 목소리로 보고 개인 기준값을 만든다. 화면 모양만 경량 웹 "마이크만 확인할게요" 카드로 바꿨다.
const SILENCE_SEC = 5;
const READ_SEC_1 = 5;
const READ_SEC_2 = 10;
const TOTAL_SEC = SILENCE_SEC + READ_SEC_1 + READ_SEC_2;

const READ_SCRIPT_1 = '안녕하세요, 편하게 목소리를 들려주세요.';
const READ_SCRIPT_2 = '오늘 하루는 어땠나요, 저는 그럭저럭 괜찮았어요. 이제 준비를 시작해볼게요.';

type Phase = 'idle' | 'silence' | 'read1' | 'read2' | 'uploading' | 'done' | 'error';

interface CalibrationStepProps {
  onComplete: (result: CalibrationResult) => void;
}

export function MicIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
    </svg>
  );
}

/** 카드 안 한 줄 — 왼쪽 아이콘, 가운데 제목·설명, 오른쪽 상태 (경량 웹 1단계 시작 화면 모양) */
export function CheckRow({ icon, title, children, right }: { icon: ReactNode; title: ReactNode; children?: ReactNode; right?: ReactNode }) {
  return (
    <Box
      style={{
        display: 'flex',
        alignItems: 'center',
        flexWrap: 'wrap', // 좁은 화면에선 오른쪽 상태·버튼이 아래 줄로 내려간다
        gap: 16,
        border: '1px solid var(--rb-line)',
        borderRadius: 16,
        padding: '18px 20px',
        background: 'var(--rb-surface)',
      }}
    >
      <Box
        style={{
          flex: '0 0 44px',
          height: 44,
          borderRadius: 12,
          display: 'grid',
          placeItems: 'center',
          background: 'var(--rb-primary-tint)',
          color: 'var(--rb-primary-strong)',
        }}
      >
        {icon}
      </Box>
      <Box style={{ flex: '1 1 200px', minWidth: 0 }}>
        <Text fz={15} fw={700} c="var(--rb-ink)">
          {title}
        </Text>
        {children}
      </Box>
      {right && <Box style={{ flex: '0 0 auto', marginLeft: 'auto' }}>{right}</Box>}
    </Box>
  );
}

const Status = ({ tone, children }: { tone: 'ok' | 'warn'; children: ReactNode }) => (
  <Text
    fz={13}
    fw={700}
    c={tone === 'warn' ? 'var(--rb-amber-strong)' : 'var(--rb-primary-strong)'}
    style={{ display: 'inline-flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}
  >
    <span aria-hidden style={{ width: 8, height: 8, borderRadius: '50%', background: 'currentColor' }} />
    {children}
  </Text>
);

/** 실시간 소리 막대 5개 — 들어오는 소리 크기만 보여 준다 */
function LevelBars({ level }: { level: number }) {
  return (
    <Box aria-hidden style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 22 }}>
      {[0.15, 0.3, 0.5, 0.7, 0.85].map((t, i) => (
        <span
          key={i}
          style={{
            width: 4,
            height: 6 + i * 4,
            borderRadius: 2,
            background: level >= t ? 'var(--rb-primary)' : 'var(--rb-line)',
            transition: 'background-color 80ms linear',
          }}
        />
      ))}
    </Box>
  );
}

export function CalibrationStep({ onComplete }: CalibrationStepProps) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [secondsLeft, setSecondsLeft] = useState(TOTAL_SEC);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [result, setResult] = useState<CalibrationResult | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const calibrate = useCalibrate();
  const level = useMicLevel(stream);

  const cleanupStream = () => {
    setStream((s) => {
      s?.getTracks().forEach((track) => track.stop());
      return null;
    });
  };

  // 화면을 떠나면 녹음·타이머·마이크를 정리
  useEffect(
    () => () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (mediaRecorderRef.current?.state === 'recording') {
        mediaRecorderRef.current.onstop = null;
        mediaRecorderRef.current.stop();
      }
      cleanupStream();
    },
    [],
  );

  const start = async () => {
    try {
      // 답변 녹음과 같은 조건으로 기준을 잰다(useAnswerRecorder와 같은 설정)
      const s = await navigator.mediaDevices.getUserMedia({
        audio: { autoGainControl: false, noiseSuppression: false, echoCancellation: false },
      });
      setStream(s);

      const recorder = new MediaRecorder(s);
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const file = new File([blob], 'calibration.webm', { type: 'audio/webm' });
        setPhase('uploading');
        cleanupStream();

        calibrate.mutate(file, {
          onSuccess: (r) => {
            setResult(r);
            setPhase('done');
            onComplete(r);
          },
          onError: () => setPhase('error'),
        });
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setPhase('silence');
      setSecondsLeft(TOTAL_SEC);

      let elapsed = 0;
      timerRef.current = setInterval(() => {
        elapsed += 1;
        setSecondsLeft(TOTAL_SEC - elapsed);

        if (elapsed === SILENCE_SEC) setPhase('read1');
        if (elapsed === SILENCE_SEC + READ_SEC_1) setPhase('read2');
        if (elapsed >= TOTAL_SEC) {
          if (timerRef.current) clearInterval(timerRef.current);
          recorder.stop();
        }
      }, 1000);
    } catch {
      setPhase('error');
    }
  };

  const recording = phase === 'silence' || phase === 'read1' || phase === 'read2';
  const progress = (TOTAL_SEC - secondsLeft) / TOTAL_SEC;

  const quote = (text: string) => (
    <Box
      mt={8}
      style={{
        display: 'inline-block',
        background: 'var(--rb-bg)',
        borderRadius: 8,
        padding: '6px 12px',
        fontSize: 15,
        fontWeight: 600,
        color: 'var(--rb-ink)',
      }}
    >
      &quot;{text}&quot;
    </Box>
  );

  let title: ReactNode;
  let body: ReactNode;
  let right: ReactNode = null;
  if (phase === 'idle') {
    title = '마이크로 목소리를 들려주세요';
    body = (
      <Text fz={13} c="var(--rb-ink-soft)" mt={4}>
        5초 조용히 기다린 뒤 나오는 문장을 소리 내어 읽어요. 모두 {TOTAL_SEC}초쯤 걸리고, 평가에는 들어가지 않아요.
      </Text>
    );
    right = (
      <Button size="sm" radius="md" variant="light" onClick={start}>
        확인 시작
      </Button>
    );
  } else if (phase === 'silence') {
    title = '주변 소리를 듣고 있어요';
    body = (
      <Text fz={13} c="var(--rb-ink-soft)" mt={4}>
        조용히 {Math.max(0, secondsLeft - READ_SEC_1 - READ_SEC_2)}초만 기다려 주세요.
      </Text>
    );
    right = <LevelBars level={level} />;
  } else if (phase === 'read1' || phase === 'read2') {
    title = '이 문장을 소리 내어 읽어 주세요';
    body = quote(phase === 'read1' ? READ_SCRIPT_1 : READ_SCRIPT_2);
    right = <LevelBars level={level} />;
  } else if (phase === 'uploading') {
    title = '목소리를 확인하고 있어요';
    body = (
      <Text fz={13} c="var(--rb-ink-soft)" mt={4}>
        잠시만 기다려 주세요.
      </Text>
    );
  } else if (phase === 'done') {
    const loud = result?.is_clipping;
    title = loud ? '목소리가 조금 크게 들려요' : '마이크 확인이 끝났어요';
    body = (
      <Text fz={13} c="var(--rb-ink-soft)" mt={4}>
        {loud ? '마이크에서 조금 떨어져 앉으면 더 정확해요. 그대로 시작해도 괜찮아요.' : '이제 1단계를 시작할 수 있어요.'}{' '}
        <button type="button" onClick={start} style={{ border: 'none', background: 'none', padding: 0, color: 'var(--rb-primary-strong)', fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>
          다시 확인
        </button>
      </Text>
    );
    right = <Status tone={loud ? 'warn' : 'ok'}>{loud ? '조금 커요' : '잘 들려요'}</Status>;
  } else {
    title = '마이크를 쓸 수 없어요';
    body = (
      <Text fz={13} c="red" mt={4}>
        브라우저 주소창 왼쪽의 자물쇠 아이콘에서 마이크를 허용한 뒤 다시 시도해 주세요.
      </Text>
    );
    right = (
      <Button size="sm" radius="md" variant="default" onClick={start}>
        다시 시도
      </Button>
    );
  }

  return (
    <Box style={{ position: 'relative' }}>
      <CheckRow icon={<MicIcon />} title={title} right={right}>
        {body}
      </CheckRow>
      {recording && (
        <Box
          aria-hidden
          style={{ position: 'absolute', left: 20, right: 20, bottom: 0, height: 3, background: 'var(--rb-line)', borderRadius: 2, overflow: 'hidden' }}
        >
          <Box style={{ width: `${progress * 100}%`, height: '100%', background: 'var(--rb-primary)', transition: 'width 1s linear' }} />
        </Box>
      )}
    </Box>
  );
}
