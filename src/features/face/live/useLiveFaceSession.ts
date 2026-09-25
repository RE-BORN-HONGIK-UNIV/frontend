import { useEffect, useRef, useState, type RefObject } from 'react';
import type { GazeBlinkResult } from '@/lib/api/types';
import { localProgress } from '@/features/progress/localProgress';
import { MAX_CAPTURE_SEC } from '@/features/face/constants';
import {
  createBlinkFsmState,
  computeBlinkBlendshapeScore,
  stepBlendshapeBlink,
  type Blink,
} from './blink';
import { calibrateBaselineGaze, DEFAULT_BASELINE_GAZE, type GazeBaseline } from './calibration';
import { computeIrisOffset, matrixToHeadPose } from './headPose';
import { createGazeFsmState, flushGaze, stepGaze } from './gaze';
import {
  computeExpressionForFrame,
  createExpressionFsmState,
  flushExpression,
  stepExpression,
  summarizeExpression,
} from './expression';
import { scoreBlinkRate, scoreExpression, scoreGazeSegments } from './scoring';
import { LEFT_EYE_EAR_IDX, LEFT_IRIS_IDX, RIGHT_EYE_EAR_IDX, RIGHT_IRIS_IDX } from './landmarkIndices';
import type { Point2D } from './types';

/**
 * 실시간 웹캠 세션 하나를 통째로 관리하는 훅 — Phase 1~3에서 각각 검증한
 * blink(blendshape 방식 — backend가 blendshape 있으면 그쪽을 우선 쓰므로
 * 여기서도 EAR 방식 대신 이쪽을 씀, app.py의 /analyze/gaze-blink 참고)/
 * gaze/expression 로직을 한 MediaPipe 세션에서 동시에 돌려서, 파일 업로드
 * 결과와 같은 모양의 GazeBlinkResult를 만든다.
 *
 * 캘리브레이션은 시선(gaze)의 baseline yaw/pitch만 필요 — blink는 blendshape
 * 고정 임계값(0.5)이라 baseline이 필요 없고, expression도 backend가 실제로
 * baseline_tension을 안 넘기므로(expression.ts 주석 참고) 캘리브레이션 없이
 * t=0부터 바로 돌린다. 그래서 gaze만 "5초 버퍼링 → baseline 계산 → 리플레이"
 * 패턴(Phase 2)을 따르고, blink/expression은 매 프레임 바로 처리한다.
 *
 * 카메라/모델 로딩은 mount 시 자동으로 시작하지 않고 start() 호출로만
 * 시작한다 — 사용자가 준비됐을 때 직접 "촬영 시작"을 누르게 하기 위함
 * (마운트되자마자 카메라 권한 팝업이 뜨는 걸 피함).
 *
 * MAX_CAPTURE_SEC(3분)에 도달하면 자동으로 finish()를 호출해서 세션을
 * 종료한다 — 업로드 모드의 영상 길이 제한과 같은 값을 공유.
 *
 * highlight(하이라이트 클립)는 backend가 서버에서 ffmpeg로 원본 영상을
 * 잘라 만드는데, 실시간 모드는 원본 영상 파일이 없어서(녹화본을 따로 만들지
 * 않음) highlight를 만들 수 없다 — 항상 null로 채운다. ResultView는 이미
 * highlight가 null이어도 "짚어서 보여줄 순간이 없다"는 안내로 정상 표시되게
 * 돼 있어서 화면이 깨지지 않는다. 세션 결과 저장(DB)도 안 함(Phase 5로
 * 미룸) — 대신 localProgress(브라우저 로컬)로 "직전 기록"과 비교한다.
 */

const CALIBRATION_SEC = 5;

export type LivePhase = 'idle' | 'loading' | 'calibrating' | 'recording' | 'error';

export interface UseLiveFaceSessionOptions {
  videoRef: RefObject<HTMLVideoElement | null>;
  onComplete: (result: GazeBlinkResult) => void;
}

export function useLiveFaceSession({ videoRef, onComplete }: UseLiveFaceSessionOptions) {
  const [phase, setPhase] = useState<LivePhase>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [elapsedSec, setElapsedSec] = useState(0);
  const [faceDetected, setFaceDetected] = useState(false);

  const cancelledRef = useRef(false);
  const startedRef = useRef(false);
  const finishedRef = useRef(false);
  const rafRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const landmarkerRef = useRef<import('@mediapipe/tasks-vision').FaceLandmarker | null>(null);
  const sessionStartRef = useRef(0);
  const elapsedSecRef = useRef(0);

  const calibBufferRef = useRef<[number, GazeBaseline | null][]>([]);
  const baselineGazeRef = useRef<GazeBaseline>(DEFAULT_BASELINE_GAZE);
  const calibratedRef = useRef(false);

  const blinkFsmRef = useRef(createBlinkFsmState());
  const blinksRef = useRef<Blink[]>([]);
  const gazeFsmRef = useRef(createGazeFsmState());
  const exprFsmRef = useRef(createExpressionFsmState());
  const exprSeriesRef = useRef<[number, number | null, number | null][]>([]);

  useEffect(() => {
    // StrictMode(개발 모드)는 마운트 시 effect를 setup→cleanup→setup 순으로
    // 두 번 돌린다 — cancelledRef를 여기서 false로 리셋 안 하면 cleanup에서
    // true가 된 채로 남아, 나중에 사용자가 "촬영 시작"을 눌러도 start()가
    // cancelledRef.current를 계속 true로 보고 조용히 중단돼버린다.
    cancelledRef.current = false;
    return () => {
      cancelledRef.current = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      landmarkerRef.current?.close();
    };
  }, []);

  async function start() {
    if (startedRef.current) return;
    startedRef.current = true;
    try {
      setPhase('loading');
      const { FaceLandmarker, FilesetResolver } = await import('@mediapipe/tasks-vision');
      const filesetResolver = await FilesetResolver.forVisionTasks('/mediapipe/wasm');
      const landmarker = await FaceLandmarker.createFromOptions(filesetResolver, {
        baseOptions: { modelAssetPath: '/mediapipe/face_landmarker.task', delegate: 'GPU' },
        runningMode: 'VIDEO',
        numFaces: 1,
        outputFaceBlendshapes: true,
        outputFacialTransformationMatrixes: true,
      });
      if (cancelledRef.current) {
        landmarker.close();
        return;
      }
      landmarkerRef.current = landmarker;

      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (cancelledRef.current) {
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
        if (cancelledRef.current || finishedRef.current || !landmarkerRef.current || !videoRef.current) return;
        const now = performance.now();
        const t = (now - sessionStartRef.current) / 1000;
        const result = landmarkerRef.current.detectForVideo(videoRef.current, now);
        const landmarks = (result.faceLandmarks?.[0] ?? null) as Point2D[] | null;
        const categories = result.faceBlendshapes?.[0]?.categories;
        const blendshapes: Record<string, number> | null = categories
          ? Object.fromEntries(categories.map((c) => [c.categoryName, c.score]))
          : null;
        const matrix = result.facialTransformationMatrixes?.[0]?.data ?? null;

        setFaceDetected(landmarks !== null);

        // blink — blendshape 기반, 캘리브레이션 불필요, 매 프레임 바로 처리
        const blinkScore = computeBlinkBlendshapeScore(blendshapes);
        const blink = stepBlendshapeBlink(blinkFsmRef.current, t, blinkScore);
        if (blink) blinksRef.current.push(blink);

        // expression — baseline 0 고정, 캘리브레이션 불필요, 매 프레임 바로 처리
        stepExpression(exprFsmRef.current, t, blendshapes);
        const exprFrame = computeExpressionForFrame(blendshapes);
        exprSeriesRef.current.push([t, exprFrame ? exprFrame.smile : null, exprFrame ? exprFrame.tension : null]);

        // gaze — baseline yaw/pitch가 필요해서 5초 버퍼링 후 리플레이
        let gazeRaw: { yaw: number; pitch: number; ox: number; oy: number } | null = null;
        if (landmarks && matrix) {
          const { yaw, pitch } = matrixToHeadPose(matrix);
          const { x: ox, y: oy } = computeIrisOffset(
            landmarks,
            LEFT_IRIS_IDX,
            RIGHT_IRIS_IDX,
            LEFT_EYE_EAR_IDX,
            RIGHT_EYE_EAR_IDX,
          );
          gazeRaw = { yaw, pitch, ox, oy };
        }

        if (t <= CALIBRATION_SEC) {
          calibBufferRef.current.push([t, gazeRaw ? { yaw: gazeRaw.yaw, pitch: gazeRaw.pitch } : null]);
        } else {
          if (!calibratedRef.current && calibBufferRef.current.length > 0) {
            calibratedRef.current = true;
            const baseline = calibrateBaselineGaze(calibBufferRef.current.map(([, p]) => p));
            baselineGazeRef.current = baseline;
            for (const [bt, bPose] of calibBufferRef.current) {
              const bRaw = bPose ? { yaw: bPose.yaw, pitch: bPose.pitch, ox: 0, oy: 0 } : null;
              // 캘리브레이션 버퍼엔 iris offset을 안 남겨뒀으니, 리플레이 시엔
              // yaw/pitch만으로 판정한다 — 이 5초 구간은 애초에 baseline 계산용
              // "정면 봐주세요" 구간이라 실제 iris offset도 0에 가까워서 결과에
              // 미치는 영향이 미미함.
              stepGaze(gazeFsmRef.current, bt, bRaw, baseline.yaw, baseline.pitch);
            }
            setPhase('recording');
          }
          stepGaze(gazeFsmRef.current, t, gazeRaw, baselineGazeRef.current.yaw, baselineGazeRef.current.pitch);
        }

        elapsedSecRef.current = t;
        setElapsedSec(t);

        if (t >= MAX_CAPTURE_SEC) {
          finish();
          return;
        }

        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    } catch (err) {
      if (cancelledRef.current) return;
      setPhase('error');
      setErrorMessage(err instanceof Error ? err.message : String(err));
    }
  }

  function finish() {
    if (finishedRef.current) return;
    finishedRef.current = true;

    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    landmarkerRef.current?.close();

    flushGaze(gazeFsmRef.current);
    flushExpression(exprFsmRef.current);

    const durationSec = elapsedSecRef.current;
    const blinkResult = scoreBlinkRate(blinksRef.current.length, durationSec);
    const gazeResult = scoreGazeSegments(gazeFsmRef.current.segmentBuffer.committed);
    const expressionSummary = summarizeExpression(exprSeriesRef.current);
    const expressionResult = scoreExpression(expressionSummary.smileRatio, expressionSummary.tensionRatio);

    const { previous } = localProgress.appendStage2Result({
      blinkRatePerMin: blinkResult.ratePerMin,
      avgFixationSec: gazeResult.avgFixationSec,
      smileRatio: expressionSummary.smileRatio,
      tensionRatio: expressionSummary.tensionRatio,
    });

    const result: GazeBlinkResult = {
      blink: {
        rate_per_min: blinkResult.ratePerMin,
        status: blinkResult.status,
        score: blinkResult.score,
        events: blinksRef.current,
        highlight: null,
      },
      gaze: {
        avg_fixation_sec: gazeResult.avgFixationSec,
        score: gazeResult.score,
        segments: gazeFsmRef.current.segmentBuffer.committed as GazeBlinkResult['gaze']['segments'],
        highlight: null,
      },
      expression: {
        smile_score: expressionResult.smileScore,
        tension_score: expressionResult.tensionScore,
        score: expressionResult.score,
        status: expressionResult.status,
        smile_ratio: expressionSummary.smileRatio,
        tension_ratio: expressionSummary.tensionRatio,
        frame_count: expressionSummary.frameCount,
        segments: exprFsmRef.current.segmentBuffer.committed as GazeBlinkResult['expression']['segments'],
        highlight: null,
      },
      previous,
    };

    onComplete(result);
  }

  return {
    phase,
    elapsedSec,
    errorMessage,
    faceDetected,
    calibrationSec: CALIBRATION_SEC,
    maxCaptureSec: MAX_CAPTURE_SEC,
    start,
    finish,
  };
}
