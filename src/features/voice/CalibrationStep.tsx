import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Box, Button, Text } from '@/components/ui';
import { useCalibrate } from './queries';
import { useMicLevel } from './useMicLevel';
import type { CalibrationResult } from '@/lib/api/types';
import { listen } from '@/features/haru/speech';

// TODO(추후): 지금은 1단계 화면 켤 때마다 매번 새로 녹음하게 되어 있음.
// 나중엔 유저별로 최근 캘리브레이션 결과를 DB에 저장해두고
// "지난번 값 사용하기" 옵션을 주는 방식으로 바꿀 예정.

// 백엔드 analyze_calibration이 처음 5초(CALIBRATION_SILENCE_SEC)를 주변 소음으로, 그 뒤를 목소리로 본다 — SILENCE_SEC는 그 값과 같아야 한다.
// 목소리 쪽 기준값(너무 큰지)은 짧은 문장 하나로 충분해서, 예전 두 문장(15초)을 한 문장으로 줄였다.
const SILENCE_SEC = 5;
const READ_MAX_SEC = 8;
const TOTAL_SEC = SILENCE_SEC + READ_MAX_SEC;

const READ_SCRIPT = '안녕하세요, 잘 부탁해요.';
// 받아쓴 말에 문장 끝 낱말이 들리면 끝까지 읽은 것으로 본다
const SCRIPT_WORDS = /부탁/;
// 받아쓰기가 안 되는 브라우저에선 소리 막대 둘째 칸(0.3)을 넘으면 목소리가 들린 것으로 본다
const VOICE_LEVEL = 0.3;

type Phase = 'idle' | 'permit' | 'silence' | 'read' | 'done' | 'quiet' | 'error';

// 문장 낱말별로 '들렸는지' 볼 때 쓰는 핵심 글자(문장부호 뺀 것)
const SCRIPT_PARTS = READ_SCRIPT.split(' ').map((w) => ({ text: w, core: w.replace(/[,.]/g, '') }));

interface CalibrationStepProps {
  /** 문장을 읽어 마이크가 잘 들리는 게 확인되면 — 이때부터 1단계를 시작할 수 있다 */
  onReady: () => void;
  /** 서버가 개인 기준값을 다 만들면(뒤에서, 늦게 올 수 있다). 실패하면 부르지 않고 기준 보정만 빠진다 */
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

export function CalibrationStep({ onReady, onComplete }: CalibrationStepProps) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [secondsLeft, setSecondsLeft] = useState(TOTAL_SEC);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [heard, setHeard] = useState('');
  const [result, setResult] = useState<CalibrationResult | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const earRef = useRef<{ stop(): void } | null>(null);
  const voiceHeardRef = useRef(false);
  const calibrate = useCalibrate();
  const level = useMicLevel(stream);

  const cleanupStream = () => {
    setStream((s) => {
      s?.getTracks().forEach((track) => track.stop());
      return null;
    });
  };

  /** 녹음·타이머·받아쓰기를 멈춘다. upload면 녹음을 서버로 보내 기준값을 뒤에서 만든다(기다리지 않음) */
  const stopAll = (upload: boolean) => {
    if (timerRef.current) clearInterval(timerRef.current);
    earRef.current?.stop();
    earRef.current = null;
    const recorder = mediaRecorderRef.current;
    if (recorder?.state === 'recording') {
      recorder.onstop = upload
        ? () => {
            const file = new File([new Blob(chunksRef.current, { type: 'audio/webm' })], 'calibration.webm', { type: 'audio/webm' });
            // 화면이 1단계 대화로 넘어간 뒤에 답이 와도 받게 mutateAsync로(실패하면 개인 기준 보정만 빠진다)
            calibrate
              .mutateAsync(file)
              .then((r) => {
                setResult(r);
                onComplete(r);
              })
              .catch(() => {});
          }
        : null;
      recorder.stop();
    }
    cleanupStream();
  };

  // 화면을 떠나면 녹음·타이머·마이크를 정리
  useEffect(
    () => () => {
      if (timerRef.current) clearInterval(timerRef.current);
      earRef.current?.stop();
      if (mediaRecorderRef.current?.state === 'recording') {
        mediaRecorderRef.current.onstop = null;
        mediaRecorderRef.current.stop();
      }
      cleanupStream();
    },
    [],
  );

  const finishRead = () => {
    stopAll(true);
    setPhase('done');
    onReady();
  };

  // 문장을 읽는 동안 목소리가 들어왔는지(받아쓰기가 안 되는 브라우저용)
  useEffect(() => {
    if (phase === 'read' && level >= VOICE_LEVEL) voiceHeardRef.current = true;
  }, [level, phase]);

  // 받아쓴 말에 문장 속 낱말이 들리면 바로 통과
  useEffect(() => {
    if (phase === 'read' && SCRIPT_WORDS.test(heard.replace(/\s/g, ''))) finishRead();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 받아쓴 말이 바뀔 때만
  }, [heard]);

  const start = async () => {
    setPhase('permit');
    try {
      // 답변 녹음과 같은 조건으로 기준을 잰다(useAnswerRecorder와 같은 설정)
      const s = await navigator.mediaDevices.getUserMedia({
        audio: { autoGainControl: false, noiseSuppression: false, echoCancellation: false },
      });
      setStream(s);
      setHeard('');
      setResult(null);
      voiceHeardRef.current = false;

      const recorder = new MediaRecorder(s);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setPhase('silence');
      setSecondsLeft(TOTAL_SEC);

      let elapsed = 0;
      timerRef.current = setInterval(() => {
        elapsed += 1;
        setSecondsLeft(TOTAL_SEC - elapsed);
        if (elapsed === SILENCE_SEC) {
          setPhase('read');
          earRef.current = listen(setHeard);
        }
        if (elapsed >= TOTAL_SEC) {
          // 받아쓰기로 확인되지 않았어도 목소리가 들렸으면 통과, 아무 소리도 없었으면 다시
          if (voiceHeardRef.current) finishRead();
          else {
            stopAll(false);
            setPhase('quiet');
          }
        }
      }, 1000);
    } catch {
      setPhase('error');
    }
  };

  const recording = phase === 'silence' || phase === 'read';
  const progress = (TOTAL_SEC - secondsLeft) / TOTAL_SEC;
  const linkStyle = { border: 'none', background: 'none', padding: 0, color: 'var(--rb-primary-strong)', fontWeight: 600, cursor: 'pointer', fontSize: 13 };

  const heardCore = heard.replace(/\s/g, '');
  // 문장 낱말을 들린 만큼 초록색으로 — 따로 "들린 말" 줄을 두지 않아서 상자 크기가 변하지 않는다.
  // 따라 읽을 때(와 끝난 뒤)만 보인다 — 조용히 있는 구간에 보이면 저도 모르게 따라 읽게 돼서. 자리는 그대로 둬 상자가 들썩이지 않게
  const showSentence = phase === 'read' || phase === 'done';
  const sentence = (
    <Box
      mt={10}
      aria-hidden={!showSentence}
      style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-0.01em', color: 'var(--rb-ink)', visibility: showSentence ? 'visible' : 'hidden' }}
    >
      &quot;
      {SCRIPT_PARTS.map((w, i) => {
        const lit = phase === 'done' || (phase === 'read' && heardCore.includes(w.core));
        return (
          <span key={i} style={{ color: lit ? 'var(--rb-primary)' : undefined, transition: 'color 200ms ease' }}>
            {i > 0 && ' '}
            {w.text}
          </span>
        );
      })}
      &quot;
    </Box>
  );

  let title: ReactNode;
  let right: ReactNode;
  if (phase === 'idle') {
    title = '5초 조용히 있다가, 나오는 문장을 따라 읽어 주세요';
    right = (
      <Button size="sm" radius="md" variant="light" onClick={start}>
        확인 시작
      </Button>
    );
  } else if (phase === 'permit') {
    title = '마이크를 쓸지 물어보면 "허용"을 눌러 주세요';
  } else if (phase === 'silence') {
    title = `잠깐 조용히 해 주세요 · ${Math.max(0, secondsLeft - READ_MAX_SEC)}초`;
    right = <LevelBars level={level} />;
  } else if (phase === 'read') {
    title = '지금 따라 읽어 주세요';
    right = <LevelBars level={level} />;
  } else if (phase === 'done') {
    const loud = result?.is_clipping;
    title = loud ? '목소리가 조금 커요. 마이크에서 살짝 떨어져 주세요' : '마이크가 잘 들려요';
    right = (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 12 }}>
        <Status tone={loud ? 'warn' : 'ok'}>{loud ? '조금 커요' : '잘 들려요'}</Status>
        <button type="button" onClick={start} style={linkStyle}>
          다시 확인
        </button>
      </span>
    );
  } else if (phase === 'quiet') {
    title = '목소리가 잘 안 들렸어요. 마이크를 확인하고 다시 해 볼까요?';
    right = (
      <Button size="sm" radius="md" variant="default" onClick={start}>
        다시 시도
      </Button>
    );
  } else {
    title = '마이크가 막혀 있어요. 주소창 왼쪽 자물쇠를 눌러 허용해 주세요';
    right = (
      <Button size="sm" radius="md" variant="default" onClick={start}>
        다시 시도
      </Button>
    );
  }

  return (
    <Box style={{ position: 'relative' }}>
      <CheckRow icon={<MicIcon />} title={title} right={right}>
        {sentence}
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
