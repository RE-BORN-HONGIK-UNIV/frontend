import { useEffect, useRef, useState } from 'react';
import { calibrateBaselineGaze, DEFAULT_BASELINE_GAZE, type GazeBaseline } from './calibration';
import { computeIrisOffset, isLookingAtCamera, matrixToHeadPose } from './headPose';
import { createGazeFsmState, flushGaze, stepGaze } from './gaze';
import { scoreGazeSegments } from './scoring';
import { LEFT_EYE_EAR_IDX, LEFT_IRIS_IDX, RIGHT_EYE_EAR_IDX, RIGHT_IRIS_IDX } from './landmarkIndices';
import type { Point2D } from './types';

/**
 * Phase 2 데모 — 시선(gaze) + 머리자세(headPose) 포팅이 실제 웹캠에서도
 * 동작하는지 확인하는 용도. LiveBlinkDemo(Phase 1)와 같은 5초 캘리브레이션
 * 버퍼링 → baseline 계산 → 리플레이 → 실시간 흐름을 따르되, 이번엔
 * yaw/pitch(headPose.ts, MediaPipe 변환 행렬 기반 — backend의 solvePnP와는
 * 다른 알고리즘, headPose.ts 주석 참고)까지 캘리브레이션한다.
 *
 * 구간 확정(segmentBuffer.ts의 지연 버퍼)은 최소 0.3초 지연이 있어서, 화면엔
 * "현재 프레임 판정"(즉각 반응)과 "확정된 구간 기준 점수"(약간 지연) 둘 다
 * 보여준다 — 실기기 확인 시 고개를 좌우/상하로 움직이면서 즉각 판정이
 * 체감상 맞는지(=headPose.ts의 알고리즘 전환에 따른 임계값 재검증) 확인하는
 * 게 이 데모의 핵심 목적.
 */

const CALIBRATION_SEC = 5;

type RawPose = { yaw: number; pitch: number; ox: number; oy: number };
type Phase = 'idle' | 'loading' | 'calibrating' | 'live' | 'error';

export function LiveGazeDemo() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const rafRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const sessionStartRef = useRef<number>(0);

  const calibBufferRef = useRef<[number, RawPose | null][]>([]);
  const baselineRef = useRef<GazeBaseline>(DEFAULT_BASELINE_GAZE);
  const calibratedRef = useRef(false);
  const gazeFsmRef = useRef(createGazeFsmState());

  const [phase, setPhase] = useState<Phase>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [elapsedSec, setElapsedSec] = useState(0);
  const [baseline, setBaseline] = useState<GazeBaseline | null>(null);
  const [currentlyLooking, setCurrentlyLooking] = useState<boolean | null>(null);
  const [scoreResult, setScoreResult] = useState<ReturnType<typeof scoreGazeSegments> | null>(null);
  const [rawPose, setRawPose] = useState<RawPose | null>(null);

  useEffect(() => {
    let cancelled = false;
    let landmarker: import('@mediapipe/tasks-vision').FaceLandmarker | null = null;
    const gazeFsm = gazeFsmRef.current;

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
          outputFacialTransformationMatrixes: true,
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
          const landmarks = (result.faceLandmarks?.[0] ?? null) as Point2D[] | null;
          const matrix = result.facialTransformationMatrixes?.[0]?.data ?? null;

          let raw: RawPose | null = null;
          if (landmarks && matrix) {
            const { yaw, pitch } = matrixToHeadPose(matrix);
            const { x: ox, y: oy } = computeIrisOffset(
              landmarks,
              LEFT_IRIS_IDX,
              RIGHT_IRIS_IDX,
              LEFT_EYE_EAR_IDX,
              RIGHT_EYE_EAR_IDX,
            );
            raw = { yaw, pitch, ox, oy };
          }

          if (t <= CALIBRATION_SEC) {
            calibBufferRef.current.push([t, raw]);
            setElapsedSec(t);
            setCurrentlyLooking(null);
          } else {
            if (!calibratedRef.current && calibBufferRef.current.length > 0) {
              calibratedRef.current = true;
              const poses = calibBufferRef.current.map(([, p]) => (p ? { yaw: p.yaw, pitch: p.pitch } : null));
              const computedBaseline = calibrateBaselineGaze(poses);
              baselineRef.current = computedBaseline;
              setBaseline(computedBaseline);
              for (const [bt, bRaw] of calibBufferRef.current) {
                stepGaze(gazeFsmRef.current, bt, bRaw, computedBaseline.yaw, computedBaseline.pitch);
              }
              setPhase('live');
            }

            stepGaze(gazeFsmRef.current, t, raw, baselineRef.current.yaw, baselineRef.current.pitch);
            const smoothed = gazeFsmRef.current.smoothed;
            setCurrentlyLooking(
              raw !== null && smoothed !== null
                ? isLookingAtCamera(
                    smoothed.yaw,
                    smoothed.pitch,
                    smoothed.ox,
                    smoothed.oy,
                    baselineRef.current.yaw,
                    baselineRef.current.pitch,
                  )
                : false,
            );

            const committedSoFar = gazeFsmRef.current.segmentBuffer.committed;
            setScoreResult(scoreGazeSegments(committedSoFar));
            setElapsedSec(t);
            setRawPose(raw);
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
      flushGaze(gazeFsm);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      landmarker?.close();
    };
  }, []);

  return (
    <div style={{ padding: 24, fontFamily: 'sans-serif' }}>
      <h1>실시간 시선 데모 (Phase 2)</h1>
      <p>
        상태:{' '}
        {phase === 'calibrating'
          ? `캘리브레이션 중… 정면을 봐주세요 (${elapsedSec.toFixed(1)}/${CALIBRATION_SEC}초)`
          : phase}
      </p>
      {phase === 'error' && <p style={{ color: 'red' }}>에러: {errorMessage}</p>}
      {phase === 'live' && (
        <>
          <p style={{ fontSize: 32, fontWeight: 'bold', fontFamily: 'monospace' }}>
            yaw {rawPose ? rawPose.yaw.toFixed(1) : '—'}° &nbsp; pitch{' '}
            {rawPose ? rawPose.pitch.toFixed(1) : '—'}°
          </p>
          <p>
            경과 {elapsedSec.toFixed(1)}초 · baseline yaw {baseline?.yaw.toFixed(1)}° / pitch{' '}
            {baseline?.pitch.toFixed(1)}° · 현재{' '}
            {currentlyLooking === null ? '판정 대기' : currentlyLooking ? '정면 응시(fixation)' : '회피(aversion)'}
            {scoreResult && (
              <>
                {' '}
                · 확정된 평균 응시 {scoreResult.avgFixationSec}초 · 점수 {scoreResult.score}
              </>
            )}
          </p>
        </>
      )}
      <p style={{ fontSize: 12, color: '#666' }}>
        위 yaw/pitch 숫자를 보면서 고개를 정면 → 오른쪽으로 살짝(~10°) → 많이(~30°) 순서로 돌려보고 숫자가
        그 정도로 변하는지 확인해주세요. baseline 대비 ±10°를 벗어나면 회피(aversion)로 판정됩니다 — 이
        데모가 알려주는 숫자로 "얼마나 돌려야 회피가 뜨는지"를 정확히 알 수 있습니다.
      </p>
      <video ref={videoRef} muted playsInline style={{ width: 480, transform: 'scaleX(-1)' }} />
    </div>
  );
}

export default LiveGazeDemo;
