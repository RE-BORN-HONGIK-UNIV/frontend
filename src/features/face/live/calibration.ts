/**
 * backend/step2/set_baseline.py 포팅 (EAR baseline만 — yaw/pitch·tension
 * baseline은 시선/표정 포팅 단계에서 추가).
 *
 * 실시간에서는 "첫 5초 프레임을 통째로 모아서 계산"하는 백엔드의 방식을 그대로
 * 따른다 — 진짜 실시간 중앙값(running median)으로 근사하지 않는 이유: 어차피
 * 고정된 5초짜리 작은 창이라 프레임을 버퍼링해뒀다 한 번에 계산해도 비용이
 * 크지 않고, 그래야 백엔드와 완전히 같은 값이 나온다.
 */

export const DEFAULT_BASELINE_EAR = 0.3;

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }
  return sorted[mid];
}

/** backend의 calibrate_baseline_ear와 동일 — 캘리브레이션 구간에서 모은 EAR
 * 값들의 중앙값(이상치에 평균보다 강함). 값이 하나도 없으면(얼굴 미검출)
 * DEFAULT_BASELINE_EAR로 폴백. */
export function calibrateBaselineEar(earValues: (number | null)[]): number {
  const values = earValues.filter((v): v is number => v !== null);
  if (values.length === 0) return DEFAULT_BASELINE_EAR;
  return median(values);
}

export interface GazeBaseline {
  yaw: number;
  pitch: number;
}

export const DEFAULT_BASELINE_GAZE: GazeBaseline = { yaw: 0, pitch: 0 };

/** backend의 calibrate_baseline_gaze와 동일 — 캘리브레이션 구간에서 모은
 * yaw/pitch의 중앙값(웹캠 위치가 얼굴 정면이 아닌 사람의 시선 판정 편향
 * 보정용). 얼굴이 한 번도 검출되지 않으면 (0, 0)으로 폴백. */
export function calibrateBaselineGaze(poses: (GazeBaseline | null)[]): GazeBaseline {
  const detected = poses.filter((p): p is GazeBaseline => p !== null);
  if (detected.length === 0) return DEFAULT_BASELINE_GAZE;
  return {
    yaw: median(detected.map((p) => p.yaw)),
    pitch: median(detected.map((p) => p.pitch)),
  };
}

/** 눈동자 위치(iris offset, 눈 안에서 눈동자가 가운데서 얼마나 치우쳤는지) 기준값 */
export interface IrisBaseline {
  ox: number;
  oy: number;
}

export const DEFAULT_BASELINE_IRIS: IrisBaseline = { ox: 0, oy: 0 };

/**
 * 캘리브레이션 구간 눈동자 위치의 중앙값 — 2026-11 추가(백엔드에는 없음).
 * 2단계가 "카메라"가 아니라 화면 가운데 "하루"를 보며 대답하는 방식으로 바뀌면서, 카메라보다 아래에 있는 하루를
 * 고개는 두고 눈만 내려서 보면 눈동자가 아래로 치우쳐 "정면(0) ±0.15" 기준을 넘어 시선 회피로 잘못 셀 수 있었다.
 * 고개 각도(calibrateBaselineGaze)처럼 "하루를 볼 때의 눈동자 위치"를 기준으로 잡는다. 기준 폭(0.15)은 그대로.
 * 얼굴이 한 번도 검출되지 않으면 (0, 0) — 예전과 같은 판정.
 * 정확도 검증 대기: 이 보정이 실제로 오탐을 줄이는지는 새 방식(하루 보기) 라벨링으로 확인할 것(ACCURACY_NOTES.md).
 */
export function calibrateBaselineIris(offsets: (IrisBaseline | null)[]): IrisBaseline {
  const detected = offsets.filter((p): p is IrisBaseline => p !== null);
  if (detected.length === 0) return DEFAULT_BASELINE_IRIS;
  return {
    ox: median(detected.map((p) => p.ox)),
    oy: median(detected.map((p) => p.oy)),
  };
}

export const DEFAULT_BASELINE_TENSION = 0;

/** 2026-11부터 실시간 2단계는 이 값을 실제로 쓴다(찡그림을 "평소 얼굴 대비"로 — expression.ts 찡그림 판정 구조).
 * 아래 옛 설명(업로드 방식에서는 과보정이라 안 씀)은 backend 업로드 판정 얘기로 남겨 둔다.
 *
 * backend의 calibrate_baseline_tension과 동일 — 캘리브레이션 구간
 * blendshape의 긴장(browDown) 평균값들의 중앙값. 얼굴이 한 번도 검출되지
 * 않으면 0으로 폴백. 단, backend app.py는 실제 서비스 호출에서 이 값을
 * expression_analyzer로 안 넘기고 절대 임계값처럼 쓰기 때문에(코드 주석
 * 참고 — 개인차가 이미 작아서 baseline까지 빼면 과보정됨을 실측으로 확인)
 * LiveExpressionDemo도 기본값 0을 그대로 쓴다. 포팅 완전성을 위해 함수만
 * 남겨둠. */
export function calibrateBaselineTension(tensionValues: (number | null)[]): number {
  const values = tensionValues.filter((v): v is number => v !== null);
  if (values.length === 0) return DEFAULT_BASELINE_TENSION;
  return median(values);
}

/**
 * 2단계 캘리브레이션(2026-11, 하루 통화) — "표정 맞추기": 하루의 눈 보기(무표정) → 살짝 찡그리기 → 하루에게 웃기.
 *
 * 왜: 같은 표정이어도 MediaPipe 값의 크기가 사람마다(같은 사람도 날마다) 크게 다르다. 2단계 녹화 4건을 영상과 대조하니
 * 미간을 모은 게 영상으로 보이는데 값이 평소 대비 +0.05 안팎인 사람(세연 11/7)과 +0.2까지 오르는 사람(세연 11/5)이 있었고,
 * 웃는 게 보이는데 미소 값이 0.28에 그친 경우도 있었다. 모두에게 같은 숫자(찡그림 +0.08, 미소 0.35)를 쓰면 값이 작게 나오는
 * 사람은 계속 놓친다. 그래서 무표정과 함께 그 사람이 직접 지은 찡그림·미소의 크기를 재서 기준을 사람마다 맞춘다
 * (사람별 정규화 — Baltrušaitis, Mahmoud & Robinson, 2015, IEEE FG). 숫자 근거는 personalThreshold 주석.
 *
 * 예전 "하루의 어깨 보기" 단계는 뺐다 — 두 번 해 봤는데 어깨 쪽을 볼 때와 눈을 볼 때의 고개·눈동자 값 차이가 0.1~0.3° /
 * 0.002 수준이라(고개 없이 눈만 내리면 웹캠이 구분하지 못함, Semmelmann & Weigelt, 2018) 경계가 항상 꺼졌다.
 * 각 단계로 넘어간 직후 0.5초는 표정·눈을 바꾸는 중이라 값에서 뺀다(settle).
 */
export const CALIB_FACE_SEC = 3;
export const CALIB_FROWN_SEC = 2;
export const CALIB_SMILE_SEC = 2;
export const CALIB_SETTLE_SEC = 0.5;
export const EXPRESSION_CALIB_TOTAL_SEC = CALIB_FACE_SEC + CALIB_FROWN_SEC + CALIB_SMILE_SEC;

export type CalibStep = 'face' | 'frown' | 'smile' | 'settle';

/** 캘리브레이션을 시작한 지 ct초일 때의 단계(null: 끝남). withExpressions=false면 예전처럼 total초 내내 face(settle 없음) */
export function calibStepAt(ct: number, withExpressions: boolean, total = EXPRESSION_CALIB_TOTAL_SEC): CalibStep | null {
  if (ct < 0 || ct > total) return null;
  if (!withExpressions) return 'face';
  const steps: [CalibStep, number][] = [
    ['face', CALIB_FACE_SEC],
    ['frown', CALIB_FROWN_SEC],
    ['smile', CALIB_SMILE_SEC],
  ];
  let start = 0;
  for (const [step, len] of steps) {
    if (ct <= start + len) return ct < start + CALIB_SETTLE_SEC ? 'settle' : step;
    start += len;
  }
  return null;
}

/** 지금 화면에 보여 줄 단계(settle은 그 단계에 포함) */
export function calibStageAt(ct: number, withExpressions: boolean): 'face' | 'frown' | 'smile' {
  if (!withExpressions || ct <= CALIB_FACE_SEC) return 'face';
  return ct <= CALIB_FACE_SEC + CALIB_FROWN_SEC ? 'frown' : 'smile';
}

const quantile = (values: number[], q: number) => {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))];
};

/**
 * 사람별 판정 기준 = 무표정 + (직접 지은 표정 − 무표정) × 1/3, 단 [min, max] 안으로. 표정을 못 쟀거나(얼굴 미검출)
 * 무표정보다 오르지 않았으면 fallback.
 *
 * - 직접 지은 표정은 그 단계 값의 상위 10%(최고점 한두 장면의 잡음에 흔들리지 않게).
 * - 1/3: 시키는 표정(캘리브레이션)이 대답 중 자연스러운 표정보다 크기 때문에 가운데(1/2)보다 낮게. 4건 녹화로 확인 —
 *   찡그림을 평소 대비 +0.04 / +0.06 / +0.08에서 보면, 세연 11/7(찡그림 최대 +0.12)은 +0.04에서 찡그린 질문 30%·다른 질문 0%,
 *   세연 11/5(찡그림 최대 +0.18)은 +0.06에서 찡그린 질문 44%·웃는 질문 2%로 가장 나았다 — 둘 다 "찡그림 크기 × 1/3"에 가깝다.
 *   (1/2이면 각각 14%·약 25%로 덜 잡힘.)
 * - 찡그림 [+0.04, +0.08]: 0.04는 무표정으로 말할 때 흔들림(평소 대비 상위 5%: 0.009~0.019, 3명)보다 확실히 위,
 *   0.08은 지금 쓰는 임시값(4명 무표정 질문 오탐 0) — 이보다 엄격해지지 않게.
 * - 미소 [0.15, 0.35]: 0.35는 검증된 기존 기준(이보다 엄격해지지 않게), 0.15는 웃지 않고 말할 때 원래 미소 값(4명 상위 1%:
 *   0.00~0.17)보다 위. 입 벌림 규칙(말하는 입 모양 오탐 방지)은 그대로 둔다.
 */
export const PERSONAL_FRACTION = 1 / 3;

export function personalThreshold(
  neutral: (number | null)[],
  posed: (number | null)[],
  opts: { min: number; max: number; fallback: number; relative: boolean },
): number {
  const n = neutral.filter((v): v is number => v !== null);
  const p = posed.filter((v): v is number => v !== null);
  if (!n.length || !p.length) return opts.fallback;
  const base = median(n);
  const peak = quantile(p, 0.9);
  if (peak <= base) return opts.fallback;
  // relative: 판정 값이 이미 "무표정 대비"(찡그림)면 무표정을 더하지 않는다
  const th = (opts.relative ? 0 : base) + (peak - base) * PERSONAL_FRACTION;
  return Math.min(opts.max, Math.max(opts.min, th));
}
