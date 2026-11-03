import { createBlinkFsmState, computeBlinkBlendshapeScore, stepBlendshapeBlink, type Blink, type BlinkFsmState } from './blink';
import { createGazeFsmState, flushGaze, stepGaze, type GazeFsmState } from './gaze';
import {
  computeExpressionForFrame,
  createExpressionFsmState,
  flushExpression,
  stepExpression,
  type Blendshapes,
  type ExpressionFsmState,
} from './expression';
import { pauseSegmentBuffer } from './segmentBuffer';
import type { GazeBaseline } from './calibration';

/**
 * 촬영 중 한 묶음의 깜빡임·시선·표정 누적 (useLiveFaceSession이 둘을 같이 돌린다).
 *
 * 2단계 하루 영상 통화는 "말하는 동안에는 하루를 봐 주세요 · 그 밖에는 편하게 봐도 돼요"라고 안내한다.
 * 그런데 전에는 통화 내내 재서, 하루가 질문하는 동안 자막·버튼을 보는 것까지 시선 회피로 들어갔다.
 * 그래서 measuring이 false인 프레임(하루가 말하거나 생각하는 동안)은 건너뛰고, 멈출 때마다 지금 구간을
 * 닫아서 멈춘 시간이 구간 길이에 섞이지 않게 한다. 판정 함수·임계값은 그대로다(새 판정이 아님).
 *
 * 함께 세는 것: 실제로 잰 시간(sec, 깜빡임 분당 횟수의 분모), 잰 구간들(intervals, 질문별 나누기용),
 * 잰 프레임 중 얼굴이 잡힌 비율(얼굴이 화면 밖으로 나가면 시선 회피로 계산되므로 결과를 믿을 만한지 알려 준다).
 */
export interface MeasureFrame {
  blendshapes: Blendshapes | null;
  /** 얼굴 미검출이면 null */
  gazeRaw: { yaw: number; pitch: number; ox: number; oy: number } | null;
}

export interface Accumulator {
  blinkFsm: BlinkFsmState;
  blinks: Blink[];
  gazeFsm: GazeFsmState;
  exprFsm: ExpressionFsmState;
  exprSeries: [number, number | null, number | null][];
  sec: number;
  frames: number;
  detectedFrames: number;
  intervals: [number, number][];
  active: boolean;
  lastT: number | null;
}

export function createAccumulator(): Accumulator {
  return {
    blinkFsm: createBlinkFsmState(),
    blinks: [],
    gazeFsm: createGazeFsmState(),
    exprFsm: createExpressionFsmState(),
    exprSeries: [],
    sec: 0,
    frames: 0,
    detectedFrames: 0,
    intervals: [],
    active: false,
    lastT: null,
  };
}

function pause(acc: Accumulator) {
  if (!acc.active) return;
  pauseSegmentBuffer(acc.gazeFsm.segmentBuffer);
  pauseSegmentBuffer(acc.exprFsm.segmentBuffer);
  // 깜빡이는 도중에 멈추면 그 깜빡임은 버린다(멈춘 동안의 시간이 깜빡임 길이로 들어가지 않게)
  acc.blinkFsm = createBlinkFsmState();
  // 멈춘 동안 고개 방향이 바뀌었을 수 있으니, 다시 시작할 때 예전 스무딩 값에 끌려가지 않게 비운다
  acc.gazeFsm.smoothed = null;
  acc.active = false;
  acc.lastT = null;
}

/** 한 프레임. measuring=false면 멈춤(재지 않음). */
export function stepAccumulator(acc: Accumulator, t: number, frame: MeasureFrame, baseline: GazeBaseline, measuring: boolean) {
  if (!measuring) {
    pause(acc);
    return;
  }
  if (!acc.active) {
    acc.active = true;
    acc.intervals.push([t, t]);
  } else if (acc.lastT !== null) {
    acc.sec += t - acc.lastT;
  }
  acc.lastT = t;
  acc.intervals[acc.intervals.length - 1][1] = t;

  acc.frames += 1;
  if (frame.gazeRaw) acc.detectedFrames += 1;

  const blink = stepBlendshapeBlink(acc.blinkFsm, t, computeBlinkBlendshapeScore(frame.blendshapes));
  if (blink) acc.blinks.push(blink);

  stepExpression(acc.exprFsm, t, frame.blendshapes);
  const expr = computeExpressionForFrame(frame.blendshapes);
  acc.exprSeries.push([t, expr ? expr.smile : null, expr ? expr.tension : null]);

  stepGaze(acc.gazeFsm, t, frame.gazeRaw, baseline.yaw, baseline.pitch);
}

/** 촬영이 끝날 때 — 열려 있는 구간을 닫는다 */
export function finishAccumulator(acc: Accumulator) {
  flushGaze(acc.gazeFsm);
  flushExpression(acc.exprFsm);
  acc.active = false;
}

/** 잰 프레임 중 얼굴이 잡힌 비율(0~1). 잰 프레임이 없으면 null */
export function faceVisibleRatio(acc: Accumulator): number | null {
  return acc.frames > 0 ? acc.detectedFrames / acc.frames : null;
}
