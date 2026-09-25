import { useEffect, useRef, useState } from 'react';
import {
  calibrateBaselineEar,
  DEFAULT_BASELINE_EAR,
} from './calibration';
import { computeEarForFrame, createBlinkFsmState, stepEarBlink, type Blink } from './blink';
import { scoreBlinkRate } from './scoring';
import { LEFT_EYE_EAR_IDX, RIGHT_EYE_EAR_IDX } from './landmarkIndices';

/**
 * Phase 1 데모 — 눈 깜빡임 로직 포팅(blink.ts/scoring.ts/calibration.ts)이
 * 실제 웹캠에서도 동작하는지 눈으로 확인하는 용도. Phase 0 스파이크(Spike.tsx)
 * 처럼 점수 계산 없이 랜드마크만 그리는 게 아니라, 실제로 깜빡임을 세고
 * 점수까지 낸다 — 단 시선·표정은 아직 없음(Phase 2·3에서 추가).
 *
 * 계획 문서(§3)의 캘리브레이션 방식 그대로: 처음 5초는 EAR 값만 버퍼링해서
 * baseline을 계산한 뒤, 그 5초 프레임도 버리지 않고 깜빡임 FSM에 순서대로
 * 재생해서 백엔드와 동일하게 "캘리브레이션 구간도 분석에 포함"시킨다.
 */

const CALIBRATION_SEC = 5;

type Phase = 'idle' | 'loading' | 'calibrating' | 'live' | 'error';

export function LiveBlinkDemo() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const rafRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const sessionStartRef = useRef<number>(0);

  // 캘리브레이션 버퍼: [t, ear][] — 5초 지나면 baseline 계산 후 FSM에 리플레이
  const calibBufferRef = useRef<[number, number | null][]>([]);
  const baselineEarRef = useRef<number>(DEFAULT_BASELINE_EAR);
  const blinkFsmRef = useRef(createBlinkFsmState());
  const blinksRef = useRef<Blink[]>([]);

  const [phase, setPhase] = useState<Phase>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [elapsedSec, setElapsedSec] = useState(0);
  const [blinkCount, setBlinkCount] = useState(0);
  const [baselineEar, setBaselineEar] = useState<number | null>(null);
  const [scoreResult, setScoreResult] = useState<ReturnType<typeof scoreBlinkRate> | null>(null);

  useEffect(() => {
    let cancelled = false;
    let landmarker: import('@mediapipe/tasks-vision').FaceLandmarker | null = null;

    async function setup() {
      try {
        setPhase('loading');
        const { FaceLandmarker, FilesetResolver } = await import('@mediapipe/tasks-vision');
        const filesetResolver = await FilesetResolver.forVisionTasks('/mediapipe/wasm');
        landmarker = await FaceLandmarker.createFromOptions(filesetResolver, {
          baseOptions: { modelAssetPath: '/mediapipe/face_landmarker.task', delegate: 'GPU' },
          runningMode: 'VIDEO',
          numFaces: 1,
          outputFaceBlendshapes: false,
          outputFacialTransformationMatrixes: false,
        });
        if (cancelled) return;

        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        await video.play();

        sessionStartRef.current = performance.now();
        setPhase('calibrating');

        const tick = () => {
          if (cancelled || !landmarker || !videoRef.current) return;
          const now = performance.now();
          const t = (now - sessionStartRef.current) / 1000;
          const result = landmarker.detectForVideo(videoRef.current, now);
          const landmarks = result.faceLandmarks?.[0] ?? null;
          const ear = computeEarForFrame(landmarks, LEFT_EYE_EAR_IDX, RIGHT_EYE_EAR_IDX);

          if (t <= CALIBRATION_SEC) {
            calibBufferRef.current.push([t, ear]);
            setElapsedSec(t);
          } else {
            // 캘리브레이션 창을 막 벗어난 첫 프레임에서, 버퍼를 baseline 계산 +
            // FSM 리플레이 한 번만 수행 (baselineEar가 아직 계산 전이라는 걸로 판별)
            if (baselineEarRef.current === DEFAULT_BASELINE_EAR && calibBufferRef.current.length > 0) {
              const baseline = calibrateBaselineEar(calibBufferRef.current.map(([, v]) => v));
              baselineEarRef.current = baseline;
              setBaselineEar(baseline);
              const threshold = baseline * 0.7;
              for (const [bt, bear] of calibBufferRef.current) {
                const blink = stepEarBlink(blinkFsmRef.current, bt, bear, threshold);
                if (blink) blinksRef.current.push(blink);
              }
              setPhase('live');
            }

            const threshold = baselineEarRef.current * 0.7;
            const blink = stepEarBlink(blinkFsmRef.current, t, ear, threshold);
            if (blink) blinksRef.current.push(blink);

            setElapsedSec(t);
            setBlinkCount(blinksRef.current.length);
            setScoreResult(scoreBlinkRate(blinksRef.current.length, t));
          }

          rafRef.current = requestAnimationFrame(tick);
        };
        rafRef.current = requestAnimationFrame(tick);
      } catch (err) {
        if (cancelled) return;
        setPhase('error');
        setErrorMessage(err instanceof Error ? err.message : String(err));
      }
    }

    setup();

    return () => {
      cancelled = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      landmarker?.close();
    };
  }, []);

  return (
    <div style={{ padding: 24, fontFamily: 'sans-serif' }}>
      <h1>실시간 눈 깜빡임 데모 (Phase 1)</h1>
      <p>상태: {phase === 'calibrating' ? `캘리브레이션 중… 정면을 봐주세요 (${elapsedSec.toFixed(1)}/${CALIBRATION_SEC}초)` : phase}</p>
      {phase === 'error' && <p style={{ color: 'red' }}>에러: {errorMessage}</p>}
      {phase === 'live' && (
        <p>
          경과 {elapsedSec.toFixed(1)}초 · baseline EAR {baselineEar?.toFixed(3)} · 깜빡임{' '}
          {blinkCount}회
          {scoreResult && (
            <>
              {' '}
              · 분당 {scoreResult.ratePerMin}회 · {scoreResult.status} · {scoreResult.score}점
            </>
          )}
        </p>
      )}
      <video ref={videoRef} muted playsInline style={{ width: 480, transform: 'scaleX(-1)' }} />
    </div>
  );
}

export default LiveBlinkDemo;
