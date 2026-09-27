import { useEffect, useRef, useState } from 'react';
import {
  computeExpressionForFrame,
  createExpressionFsmState,
  flushExpression,
  stepExpression,
  summarizeExpression,
  type Blendshapes,
} from './expression';
import { scoreExpression } from './scoring';

/**
 * Phase 3 데모 — 표정(미소/긴장) 포팅이 실제 웹캠에서도 동작하는지 확인하는
 * 용도. backend app.py가 실제로 baseline_tension을 안 넘기고 절대 임계값
 * 그대로 쓰기 때문에(expression.ts/calibration.ts 주석 참고), 이 데모도
 * 캘리브레이션 버퍼링 없이 바로 실시간으로 시작한다 — Phase 1/2와 다른 점.
 *
 * summarizeExpression은 "그동안 쌓인 전체 프레임" 기준 비율이라 세션이
 * 길어질수록 최근 표정 변화가 점수에 묻히므로, 데모에서는 최근 N초
 * 슬라이딩 윈도우로만 계산해서 화면 반응성을 확보한다(FaceStage 통합 시엔
 * backend와 동일하게 전체 구간 기준으로 계산할 것 — Phase 4 메모).
 */

const SUMMARY_WINDOW_SEC = 10;

type Phase = 'idle' | 'loading' | 'live' | 'error';

export function LiveExpressionDemo() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const rafRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const sessionStartRef = useRef<number>(0);
  const exprFsmRef = useRef(createExpressionFsmState());
  const recentSeriesRef = useRef<[number, number | null, number | null][]>([]);

  const [phase, setPhase] = useState<Phase>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [elapsedSec, setElapsedSec] = useState(0);
  const [currentSmile, setCurrentSmile] = useState<number | null>(null);
  const [currentTension, setCurrentTension] = useState<number | null>(null);
  const [scoreResult, setScoreResult] = useState<ReturnType<typeof scoreExpression> | null>(null);

  useEffect(() => {
    let cancelled = false;
    let landmarker: import('@mediapipe/tasks-vision').FaceLandmarker | null = null;
    const exprFsm = exprFsmRef.current;

    async function setup() {
      try {
        setPhase('loading');
        const { FaceLandmarker, FilesetResolver } = await import('@mediapipe/tasks-vision');
        const filesetResolver = await FilesetResolver.forVisionTasks('/mediapipe/wasm');
        landmarker = await FaceLandmarker.createFromOptions(filesetResolver, {
          baseOptions: { modelAssetPath: '/mediapipe/face_landmarker.task', delegate: 'GPU' },
          runningMode: 'VIDEO',
          numFaces: 1,
          outputFaceBlendshapes: true,
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
        setPhase('live');

        const tick = () => {
          if (cancelled || !landmarker || !videoRef.current) return;
          const now = performance.now();
          const t = (now - sessionStartRef.current) / 1000;
          const result = landmarker.detectForVideo(videoRef.current, now);
          const categories = result.faceBlendshapes?.[0]?.categories;
          const blendshapes: Blendshapes | null = categories
            ? Object.fromEntries(categories.map((c) => [c.categoryName, c.score]))
            : null;

          stepExpression(exprFsm, t, blendshapes);

          const frame = computeExpressionForFrame(blendshapes);
          setCurrentSmile(frame ? frame.smile : null);
          setCurrentTension(frame ? frame.tension : null);

          recentSeriesRef.current.push([t, frame ? frame.smile : null, frame ? frame.tension : null]);
          const windowStart = t - SUMMARY_WINDOW_SEC;
          while (recentSeriesRef.current.length > 0 && recentSeriesRef.current[0][0] < windowStart) {
            recentSeriesRef.current.shift();
          }
          const summary = summarizeExpression(recentSeriesRef.current);
          setScoreResult(scoreExpression(summary.smileRatio, summary.tensionRatio));
          setElapsedSec(t);

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
      flushExpression(exprFsm);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      landmarker?.close();
    };
  }, []);

  return (
    <div style={{ padding: 24, fontFamily: 'sans-serif' }}>
      <h1>실시간 표정 데모 (Phase 3)</h1>
      <p>상태: {phase}</p>
      {phase === 'error' && <p style={{ color: 'red' }}>에러: {errorMessage}</p>}
      {phase === 'live' && (
        <>
          <p style={{ fontSize: 32, fontWeight: 'bold', fontFamily: 'monospace' }}>
            smile {currentSmile !== null ? currentSmile.toFixed(2) : '—'} &nbsp; tension{' '}
            {currentTension !== null ? currentTension.toFixed(2) : '—'}
          </p>
          <p>
            경과 {elapsedSec.toFixed(1)}초
            {scoreResult && (
              <>
                {' '}
                · 최근 {SUMMARY_WINDOW_SEC}초 기준 {scoreResult.status} · 미소점수{' '}
                {scoreResult.smileScore} · 긴장점수 {scoreResult.tensionScore} · 점수 {scoreResult.score}
              </>
            )}
          </p>
        </>
      )}
      <p style={{ fontSize: 12, color: '#666' }}>
        웃어보고, 미간을 찌푸려보면서 smile/tension 숫자가 그에 맞게 반응하는지 확인해주세요. 말하면서 입을
        벌리는 것만으로는(찡그리지 않는 한) smile이 안 올라가야 정상입니다(jawOpen 게이팅).
      </p>
      <video ref={videoRef} muted playsInline style={{ width: 480, transform: 'scaleX(-1)' }} />
    </div>
  );
}

export default LiveExpressionDemo;
