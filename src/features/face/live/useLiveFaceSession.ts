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
import { createSegmentBufferState } from './segmentBuffer';
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
 * baseline_tension을 안 넘기므로(expression.ts 주석 참고) 캘리브레이션 없이도
 * 바로 판정 가능. 그래도 "캘리브레이션이 실제로 잘 됐는지" 확인 없이 바로
 * 본 촬영(점수에 반영되는 구간)으로 넘어가면 안 되니, 흐름은:
 *
 *   마운트 → (자동) 카메라/모델 로딩 → 캘리브레이션 5초(자동, 얼굴 인식
 *   상태를 실시간 표시) → 'ready'(캘리브레이션 결과 요약 + "촬영 시작"
 *   버튼, 사용자가 직접 눌러야 다음 단계로 감) → 'recording'(이때부터
 *   실제로 blink/expression/gaze를 누적해서 최종 결과에 반영, MAX_CAPTURE_SEC
 *   지나면 자동 종료) → finish().
 *
 * 캘리브레이션·대기(ready) 구간 동안의 blink/expression/gaze는 최종
 * 결과에 안 들어간다 — beginRecording() 시점에 각 FSM을 리셋함(단, gaze의
 * EMA 스무딩 값(state.smoothed)만은 유지해서 recording 시작 직후 첫
 * 프레임에서 갑자기 튀지 않게 함). 이건 backend(업로드 영상 분석)가
 * 캘리브레이션 구간도 분석에 포함시키는 것과 다른 부분인데, 실시간
 * 모드에서는 "캘리브레이션이 잘 됐는지 사용자가 직접 확인하고 나서
 * 본 촬영을 시작한다"는 게 제품 요구사항이라 의도적으로 다르게 함.
 *
 * MAX_CAPTURE_SEC(3분)은 recording 시작 시점부터 잰다(캘리브레이션·대기
 * 시간은 안 셈) — 업로드 모드의 영상 길이 제한과 같은 값을 공유.
 *
 * highlight(하이라이트 클립)는 backend가 서버에서 ffmpeg로 원본 영상을
 * 잘라 만드는데, 실시간 모드는 원본 영상 파일이 없어서(녹화본을 따로 만들지
 * 않음) highlight를 만들 수 없다 — 항상 null로 채운다. ResultView는 이미
 * highlight가 null이어도 "짚어서 보여줄 순간이 없다"는 안내로 정상 표시되게
 * 돼 있어서 화면이 깨지지 않는다. 세션 결과 저장(DB)도 안 함(Phase 5로
 * 미룸) — 대신 localProgress(브라우저 로컬)로 "직전 기록"과 비교한다.
 */

const CALIBRATION_SEC = 5;

export type LivePhase = 'idle' | 'loading' | 'calibrating' | 'ready' | 'recording' | 'error';

export interface CalibrationSummary {
  /** 캘리브레이션 5초 중 얼굴이 검출된 프레임 비율(0~1). */
  detectedRatio: number;
}

export interface UseLiveFaceSessionOptions {
  videoRef: RefObject<HTMLVideoElement | null>;
  onComplete: (result: GazeBlinkResult) => void;
}

export function useLiveFaceSession({ videoRef, onComplete }: UseLiveFaceSessionOptions) {
  const [phase, setPhase] = useState<LivePhase>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [elapsedSec, setElapsedSec] = useState(0);
  const [faceDetected, setFaceDetected] = useState(false);
  const [calibrationSummary, setCalibrationSummary] = useState<CalibrationSummary | null>(null);

  const finishedRef = useRef(false);
  const isRecordingRef = useRef(false);
  const rafRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const landmarkerRef = useRef<import('@mediapipe/tasks-vision').FaceLandmarker | null>(null);
  const sessionStartRef = useRef(0);
  const elapsedSecRef = useRef(0);
  const recordingStartTRef = useRef(0);

  const calibBufferRef = useRef<[number, GazeBaseline | null][]>([]);
  const baselineGazeRef = useRef<GazeBaseline>(DEFAULT_BASELINE_GAZE);
  const calibratedRef = useRef(false);

  const blinkFsmRef = useRef(createBlinkFsmState());
  const blinksRef = useRef<Blink[]>([]);
  const gazeFsmRef = useRef(createGazeFsmState());
  const exprFsmRef = useRef(createExpressionFsmState());
  const exprSeriesRef = useRef<[number, number | null, number | null][]>([]);

  useEffect(() => {
    let cancelled = false;

    async function setup() {
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
        if (cancelled) {
          landmarker.close();
          return;
        }
        landmarkerRef.current = landmarker;

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
          if (cancelled || finishedRef.current || !landmarkerRef.current || !videoRef.current) return;
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
          } else if (!calibratedRef.current) {
            calibratedRef.current = true;
            const buffer = calibBufferRef.current;
            const baseline = calibrateBaselineGaze(buffer.map(([, p]) => p));
            baselineGazeRef.current = baseline;
            for (const [bt, bPose] of buffer) {
              const bRaw = bPose ? { yaw: bPose.yaw, pitch: bPose.pitch, ox: 0, oy: 0 } : null;
              // 캘리브레이션 버퍼엔 iris offset을 안 남겨뒀으니, 리플레이 시엔
              // yaw/pitch만으로 판정한다 — 이 5초 구간은 애초에 baseline 계산용
              // "정면 봐주세요" 구간이라 실제 iris offset도 0에 가까워서 결과에
              // 미치는 영향이 미미함. 이 리플레이는 gaze FSM의 EMA 스무딩
              // 상태를 이어주기 위한 것 — 아래에서 segmentBuffer는 다시
              // 초기화하므로 이 구간이 실제 구간 판정에 남지는 않는다.
              stepGaze(gazeFsmRef.current, bt, bRaw, baseline.yaw, baseline.pitch);
            }
            gazeFsmRef.current.segmentBuffer = createSegmentBufferState();

            const detected = buffer.filter(([, p]) => p !== null).length;
            setCalibrationSummary({ detectedRatio: buffer.length > 0 ? detected / buffer.length : 0 });
            setPhase('ready');
          }

          // recording이 시작된 뒤부터만 최종 결과에 반영 — 캘리브레이션·대기
          // 구간 값은 여기서 버려진다(위 함수 docstring 참고).
          if (isRecordingRef.current) {
            const blinkScore = computeBlinkBlendshapeScore(blendshapes);
            const blink = stepBlendshapeBlink(blinkFsmRef.current, t, blinkScore);
            if (blink) blinksRef.current.push(blink);

            stepExpression(exprFsmRef.current, t, blendshapes);
            const exprFrame = computeExpressionForFrame(blendshapes);
            exprSeriesRef.current.push([
              t,
              exprFrame ? exprFrame.smile : null,
              exprFrame ? exprFrame.tension : null,
            ]);

            // isRecordingRef가 true인 시점엔 캘리브레이션이 이미 끝난
            // 뒤라(beginRecording은 phase==='ready'에서만 호출 가능) baseline은
            // 항상 계산돼 있다.
            stepGaze(gazeFsmRef.current, t, gazeRaw, baselineGazeRef.current.yaw, baselineGazeRef.current.pitch);

            if (t - recordingStartTRef.current >= MAX_CAPTURE_SEC) {
              elapsedSecRef.current = t;
              setElapsedSec(t);
              finish();
              return;
            }
          }

          elapsedSecRef.current = t;
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
      streamRef.current?.getTracks().forEach((t) => t.stop());
      landmarkerRef.current?.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** 캘리브레이션 확인 후 사용자가 "촬영 시작"을 눌렀을 때 — 이 순간부터
   * 실제로 점수에 반영되는 구간이 시작된다. */
  function beginRecording() {
    if (phase !== 'ready') return;
    blinkFsmRef.current = createBlinkFsmState();
    blinksRef.current = [];
    exprFsmRef.current = createExpressionFsmState();
    exprSeriesRef.current = [];
    gazeFsmRef.current.segmentBuffer = createSegmentBufferState();
    recordingStartTRef.current = elapsedSecRef.current;
    isRecordingRef.current = true;
    setPhase('recording');
  }

  function finish() {
    if (finishedRef.current) return;
    finishedRef.current = true;
    isRecordingRef.current = false;

    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    landmarkerRef.current?.close();

    flushGaze(gazeFsmRef.current);
    flushExpression(exprFsmRef.current);

    const durationSec = Math.max(0, elapsedSecRef.current - recordingStartTRef.current);
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
    calibrationSummary,
    calibrationSec: CALIBRATION_SEC,
    maxCaptureSec: MAX_CAPTURE_SEC,
    recordingElapsedSec: isRecordingRef.current ? Math.max(0, elapsedSec - recordingStartTRef.current) : 0,
    beginRecording,
    finish,
  };
}
