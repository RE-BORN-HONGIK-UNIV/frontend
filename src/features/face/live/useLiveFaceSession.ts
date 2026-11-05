import { useEffect, useRef, useState, type RefObject } from 'react';
import type { GazeBlinkResult } from '@/lib/api/types';
import { localProgress } from '@/features/progress/localProgress';
import { api } from '@/lib/api/client';
import { buildLiveSavePayload } from './savePayload';
import { splitByQuestion } from './perQuestion';
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
 * 돼 있어서 화면이 깨지지 않는다. 촬영이 끝나면 숫자 요약만 서버에
 * 저장하고(POST /analyze/gaze-blink/live — 영상은 안 보냄) 서버 이력 기준의
 * "직전 기록"으로 비교한다. 저장 실패·시간초과 시엔 localProgress(브라우저
 * 로컬) 이력으로 폴백.
 */

const CALIBRATION_SEC = 5;

/**
 * measureOnlyWhenAnswering일 때 대답 구간의 앞뒤를 잘라 내는 시간(초).
 * 2단계 통화에서는 "하루를 보며 대답하기"·"답변 마치기" 버튼을 누르려고 화면 아래를 보게 되는데, 이 순간이
 * 시선 회피로 잡히면 안 된다. 버튼을 누른 뒤 눈이 하루에게 돌아가는 시간, 마치기 버튼으로 눈이 내려가는 시간을
 * 각각 1초로 잡았다 — 사람이 시선을 옮겨 다시 고정하는 데 걸리는 시간(단속운동+고정은 보통 수백 ms)보다 넉넉하게
 * 잡은 값이고, 임계값이 아니라 "언제 재는지"만 정하는 값이라 정확도 검증 대상은 아니다. 실제 사용에서 아직
 * 버튼 쪽 시선이 남는다면 늘리면 된다.
 */
const ANSWER_LEAD_SKIP_SEC = 1;
const ANSWER_TAIL_TRIM_SEC = 1;
/** 대답을 이만큼도 안 했으면(전부 넘김 등) 결과를 만들지 않는다 — 0초짜리 결과가 "적게 깜빡였어요"처럼 보이지 않게 */
const MIN_MEASURED_SEC = 1;

/** 대답 구간 동안 모아 두는 프레임 — 끝의 ANSWER_TAIL_TRIM_SEC를 버리려고 그만큼 늦게 판정한다 */
interface PendingFrame {
  t: number;
  blendshapes: Record<string, number> | null;
  gazeRaw: { yaw: number; pitch: number; ox: number; oy: number } | null;
}

/** 서버 저장 응답을 기다리는 최대 시간 — 결과 화면이 네트워크 때문에 오래 막히지 않게. */
const SAVE_TIMEOUT_MS = 5000;

/** camera: 카메라는 켜졌고 캘리브레이션을 기다리는 중(calibrateOnDemand일 때만 — startCalibration()으로 시작) */
export type LivePhase = 'idle' | 'loading' | 'camera' | 'calibrating' | 'ready' | 'recording' | 'error';

export interface CalibrationSummary {
  /** 캘리브레이션 5초 중 얼굴이 검출된 프레임 비율(0~1). */
  detectedRatio: number;
}

export interface UseLiveFaceSessionOptions {
  videoRef: RefObject<HTMLVideoElement | null>;
  onComplete: (result: GazeBlinkResult) => void;
  /** 촬영 중 질문이 바뀐 시각들(촬영 시작부터 초) — 주면 결과에 질문별 깜빡임·눈 맞춤(per_question)을 붙인다 */
  getQuestionStarts?: () => number[];
  /** true면 카메라가 켜져도 캘리브레이션을 바로 시작하지 않고 startCalibration()을 기다린다.
   * 2단계 하루 통화: 대기실(하루·내 카메라 나란히)에서는 연결만 확인하고, "통화 시작하기"를 누른 뒤 통화 화면
   * 정중앙(하루가 나올 자리)에 내 얼굴을 5초 띄워 캘리브레이션한다 — 시선 기준을 하루를 볼 자리에서 잡아야 해서. */
  calibrateOnDemand?: boolean;
  /** true면 촬영 중에도 setAnswering(true)인 동안(앞뒤 1초 제외)만 깜빡임·표정·시선을 잰다.
   * 2단계 하루 통화: 하루가 말하는 동안이나 버튼을 누르느라 아래를 본 순간이 시선 회피로 잡히지 않게 —
   * 대기실 안내("말하는 동안에는 하루를 봐 주세요 · 그 밖에는 편하게 봐도 돼요")와 실제 측정을 맞춘다. */
  measureOnlyWhenAnswering?: boolean;
  /** measureOnlyWhenAnswering인데 대답한 구간이 거의 없어 결과를 만들지 않았을 때 */
  onEmpty?: () => void;
  /** false면 결과를 2단계 이력(서버 Stage2Result·기기의 2단계 기록)에 남기지 않는다 — 3단계 면접 중 분석용.
   * 3단계 값이 2단계 "지난번과 비교"·대시보드에 섞이지 않게. 기본 true(2단계). */
  persist?: boolean;
  /** 잴 수 있는 최대 시간(초). 기본 MAX_CAPTURE_SEC(3분, 2단계 업로드 영상 길이 제한과 같은 값) */
  maxCaptureSec?: number;
}

export function useLiveFaceSession({
  videoRef,
  onComplete,
  getQuestionStarts,
  calibrateOnDemand = false,
  measureOnlyWhenAnswering = false,
  onEmpty,
  persist = true,
  maxCaptureSec = MAX_CAPTURE_SEC,
}: UseLiveFaceSessionOptions) {
  const [phase, setPhase] = useState<LivePhase>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [elapsedSec, setElapsedSec] = useState(0);
  const [faceDetected, setFaceDetected] = useState(false);
  const [calibrationSummary, setCalibrationSummary] = useState<CalibrationSummary | null>(null);
  // 촬영 종료 후 서버에 결과를 저장하는 동안 true (카메라는 이미 꺼진 상태)
  const [saving, setSaving] = useState(false);

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
  // 캘리브레이션을 시작한 시각(세션 시작부터 초). calibrateOnDemand면 startCalibration() 전까지 null
  const calibStartTRef = useRef<number | null>(calibrateOnDemand ? null : 0);

  const blinkFsmRef = useRef(createBlinkFsmState());
  const blinksRef = useRef<Blink[]>([]);
  const gazeFsmRef = useRef(createGazeFsmState());
  const exprFsmRef = useRef(createExpressionFsmState());
  const exprSeriesRef = useRef<[number, number | null, number | null][]>([]);

  // measureOnlyWhenAnswering — 지금 대답 중인지, 대답을 시작한 시각, 아직 판정 안 한 프레임(끝 1초 버리기용),
  // 이번 대답에서 실제로 판정한 첫·마지막 프레임 시각, 지금까지 판정한 대답 구간들
  const answeringRef = useRef(false);
  const answerStartTRef = useRef(0);
  const pendingFramesRef = useRef<PendingFrame[]>([]);
  const windowFirstTRef = useRef<number | null>(null);
  const windowLastTRef = useRef<number | null>(null);
  const measuredWindowsRef = useRef<{ start: number; end: number }[]>([]);

  const measuredSec = () =>
    measuredWindowsRef.current.reduce((a, w) => a + (w.end - w.start), 0) +
    (windowFirstTRef.current !== null && windowLastTRef.current !== null ? windowLastTRef.current - windowFirstTRef.current : 0);

  /** 프레임 하나를 깜빡임·표정·시선에 반영(최종 결과에 들어감) */
  const measureFrame = (
    t: number,
    blendshapes: Record<string, number> | null,
    gazeRaw: { yaw: number; pitch: number; ox: number; oy: number } | null,
  ) => {
    const blinkScore = computeBlinkBlendshapeScore(blendshapes);
    const blink = stepBlendshapeBlink(blinkFsmRef.current, t, blinkScore);
    if (blink) blinksRef.current.push(blink);

    stepExpression(exprFsmRef.current, t, blendshapes);
    const exprFrame = computeExpressionForFrame(blendshapes);
    exprSeriesRef.current.push([t, exprFrame ? exprFrame.smile : null, exprFrame ? exprFrame.tension : null]);

    // 측정 중인 시점엔 캘리브레이션이 이미 끝난 뒤라(beginRecording은 phase==='ready'에서만 호출 가능)
    // baseline은 항상 계산돼 있다.
    stepGaze(gazeFsmRef.current, t, gazeRaw, baselineGazeRef.current.yaw, baselineGazeRef.current.pitch);

    if (windowFirstTRef.current === null) windowFirstTRef.current = t;
    windowLastTRef.current = t;
  };

  /** 대답 하나가 끝났을 때 — 남은 프레임(끝 1초)은 버리고, 열려 있던 구간을 닫아 다음 대답과 이어지지 않게 한다 */
  const closeAnswerWindow = () => {
    pendingFramesRef.current = [];
    if (windowFirstTRef.current !== null && windowLastTRef.current !== null) {
      measuredWindowsRef.current.push({ start: windowFirstTRef.current, end: windowLastTRef.current });
      flushGaze(gazeFsmRef.current);
      flushExpression(exprFsmRef.current);
    }
    windowFirstTRef.current = null;
    windowLastTRef.current = null;
    // 구간 버퍼·깜빡임 상태·시선 스무딩을 새로 — 쌓인 결과(committed)만 남긴다
    gazeFsmRef.current = { smoothed: null, segmentBuffer: { ...createSegmentBufferState(), committed: gazeFsmRef.current.segmentBuffer.committed } };
    exprFsmRef.current = { segmentBuffer: { ...createSegmentBufferState(), committed: exprFsmRef.current.segmentBuffer.committed } };
    blinkFsmRef.current = createBlinkFsmState();
  };

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
        setPhase(calibrateOnDemand ? 'camera' : 'calibrating');

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

          const calibT = calibStartTRef.current === null ? null : t - calibStartTRef.current;
          if (calibT !== null && calibT <= CALIBRATION_SEC) {
            calibBufferRef.current.push([t, gazeRaw ? { yaw: gazeRaw.yaw, pitch: gazeRaw.pitch } : null]);
          } else if (calibT !== null && !calibratedRef.current) {
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
            if (!measureOnlyWhenAnswering) {
              measureFrame(t, blendshapes, gazeRaw);
            } else if (answeringRef.current) {
              // 대답을 시작하고 1초 뒤부터 모으고, 1초 늦게 판정한다 — 대답을 마치면 판정 안 한 마지막 1초는 버려진다
              if (t - answerStartTRef.current >= ANSWER_LEAD_SKIP_SEC) pendingFramesRef.current.push({ t, blendshapes, gazeRaw });
              const queue = pendingFramesRef.current;
              while (queue.length && queue[0].t <= t - ANSWER_TAIL_TRIM_SEC) {
                const f = queue.shift() as PendingFrame;
                measureFrame(f.t, f.blendshapes, f.gazeRaw);
              }
            }

            // 3분 제한: 대답 구간만 재는 경우엔 실제로 잰 시간으로 센다
            const capturedSec = measureOnlyWhenAnswering ? measuredSec() : t - recordingStartTRef.current;
            if (capturedSec >= maxCaptureSec) {
              elapsedSecRef.current = t;
              setElapsedSec(t);
              void finish();
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

  /** calibrateOnDemand일 때 캘리브레이션 5초를 지금부터 시작 */
  function startCalibration() {
    // camera: 처음 / ready: 얼굴이 잘 안 잡혀서 다시 맞출 때
    if (phase !== 'camera' && phase !== 'ready') return;
    calibratedRef.current = false;
    calibBufferRef.current = [];
    calibStartTRef.current = elapsedSecRef.current;
    setPhase('calibrating');
  }

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

  /** measureOnlyWhenAnswering일 때 — 사용자가 대답을 시작(true)/마침(false)할 때 부른다 */
  function setAnswering(on: boolean) {
    if (on === answeringRef.current) return;
    answeringRef.current = on;
    if (on) {
      answerStartTRef.current = elapsedSecRef.current;
      pendingFramesRef.current = [];
      // 이전 대답(또는 캘리브레이션) 때의 시선 스무딩 값이 새 대답 첫 프레임에 섞이지 않게
      gazeFsmRef.current.smoothed = null;
    } else {
      closeAnswerWindow();
    }
  }

  async function finish() {
    if (finishedRef.current) return;
    finishedRef.current = true;
    isRecordingRef.current = false;
    if (measureOnlyWhenAnswering) {
      answeringRef.current = false;
      closeAnswerWindow();
    }

    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    landmarkerRef.current?.close();

    flushGaze(gazeFsmRef.current);
    flushExpression(exprFsmRef.current);

    // 대답한 구간이 거의 없으면(전부 넘김 등) 결과를 만들지 않는다 — 0초로 계산한 값이 리포트·이력에 남지 않게
    if (measureOnlyWhenAnswering && measuredSec() < MIN_MEASURED_SEC) {
      onEmpty?.();
      return;
    }

    const durationSec = measureOnlyWhenAnswering
      ? measuredSec()
      : Math.max(0, elapsedSecRef.current - recordingStartTRef.current);
    const blinkResult = scoreBlinkRate(blinksRef.current.length, durationSec);
    const gazeResult = scoreGazeSegments(gazeFsmRef.current.segmentBuffer.committed);
    const expressionSummary = summarizeExpression(exprSeriesRef.current);
    const expressionResult = scoreExpression(expressionSummary.smileRatio, expressionSummary.tensionRatio);

    // 서버 저장이 실패·지연되는 경우의 폴백 이력 — 브라우저 로컬(같은 기기에서만 유효). 3단계(persist=false)는 안 남김
    const { previous: localPrevious } = persist
      ? localProgress.appendStage2Result({
          blinkRatePerMin: blinkResult.ratePerMin,
          avgFixationSec: gazeResult.avgFixationSec,
          smileRatio: expressionSummary.smileRatio,
          tensionRatio: expressionSummary.tensionRatio,
        })
      : { previous: null };

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
      previous: localPrevious,
    };

    // 하루와 통화한 경우: 질문이 바뀐 시각으로 깜빡임·시선을 나눠 질문별 값을 붙인다(최종 리포트의 질문별 막대)
    const starts = getQuestionStarts?.() ?? [];
    if (starts.length) {
      result.per_question = splitByQuestion(
        blinksRef.current,
        gazeFsmRef.current.segmentBuffer.committed,
        starts.map((s) => recordingStartTRef.current + s),
        elapsedSecRef.current,
        measureOnlyWhenAnswering ? measuredWindowsRef.current : undefined,
      );
    }

    // 결과를 서버(Stage2Result)에 저장하고, 서버 이력 기준의 "직전 기록"을 받아 비교에 쓴다.
    // 업로드 모드 이력과 합쳐지고 기기를 바꿔도 이어지며, 3단계 난이도·ai-agent도 읽을 수 있음.
    // 실패·시간초과·서버에 이력 없음이면 로컬 이력으로 폴백 — 결과 화면은 절대 안 막는다.
    if (!persist) {
      onComplete(result);
      return;
    }
    setSaving(true);
    try {
      const saved = await Promise.race([
        api.saveLiveGazeBlink(buildLiveSavePayload(result)),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), SAVE_TIMEOUT_MS)),
      ]);
      result.previous = saved?.previous ?? localPrevious;
    } catch {
      // 미로그인·네트워크 오류 등 — 로컬 이력 그대로 사용
    }
    setSaving(false);

    onComplete(result);
  }

  return {
    phase,
    elapsedSec,
    errorMessage,
    saving,
    faceDetected,
    calibrationSummary,
    calibrationSec: CALIBRATION_SEC,
    /** 캘리브레이션을 시작한 뒤 지난 초(시작 전이면 0) */
    calibrationElapsedSec: calibStartTRef.current === null ? 0 : Math.max(0, elapsedSec - calibStartTRef.current),
    startCalibration,
    maxCaptureSec,
    recordingElapsedSec: isRecordingRef.current ? Math.max(0, elapsedSec - recordingStartTRef.current) : 0,
    beginRecording,
    setAnswering,
    finish,
    /** 지금이 촬영 시작부터 몇 초인지 (질문이 바뀐 시각을 적을 때). 촬영 중이 아니면(3분이 지나 끝남 등) null */
    recordingNowSec: () => (isRecordingRef.current ? Math.max(0, elapsedSecRef.current - recordingStartTRef.current) : null),
  };
}
