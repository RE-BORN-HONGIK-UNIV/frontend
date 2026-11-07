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
 * 2단계 캘리브레이션(2026-11, 하루 통화) — "하루의 눈"을 3초 본 뒤 "하루의 어깨"를 2초 본다.
 *
 * 왜: 2단계는 카메라가 아니라 화면 속 하루를 보며 대답한다. 팀 결정으로 하루의 얼굴(눈 근처)을 보면 "본다",
 * 하루의 몸을 보면 실제 면접에서 눈을 피하는 것과 같으니 "시선 이탈"로 본다. 얼굴과 몸은 노트북 거리에서 약 10°
 * 차이라 웹캠으로 구분할 수 있지만(눈·코·입은 3~4° 차이라 구분 못 함), 화면 크기·앉은 거리·안경이 사람마다 달라
 * 고정 숫자 하나로는 경계가 맞지 않는다. 그래서 사람마다 "얼굴을 볼 때"와 "몸을 볼 때"를 직접 재 두고,
 * 판정(다음 작업)은 둘 사이를 경계로 쓴다.
 *
 * 얼굴 단계 값은 지금까지처럼 시선·눈동자 기준(calibrateBaselineGaze·calibrateBaselineIris)이 되고,
 * 몸 단계 값(calibrateBodyPose)은 아직 판정에 쓰지 않고 기록만 한다(정확도 기록 도구로 다시 녹화해 경계 방식을 정한 뒤 반영).
 * 단계가 바뀐 직후(BODY_SETTLE_SEC)는 눈을 옮기는 중이라 몸 값에서 뺀다.
 */
export const CALIB_FACE_SEC = 3;
export const CALIB_BODY_SEC = 2;
export const BODY_SETTLE_SEC = 0.5;
/** 시작 직후(눈을 점으로 옮기는 중)도 값에서 뺀다 — 2026-11 안내 화면·표시 점 추가와 함께 */
export const FACE_SETTLE_SEC = 0.5;

/** 캘리브레이션을 시작한 지 ct초일 때의 단계 — face: 하루의 눈 보기, body: 어깨 보기, settle: 눈을 옮기는 중(처음 0.5초와
 * 어깨로 옮기는 0.5초, 값에서 뺌), null: 끝남.
 * twoStep=false면 예전처럼 total초 내내 face */
export function calibStepAt(ct: number, twoStep: boolean, total = CALIB_FACE_SEC + CALIB_BODY_SEC): 'face' | 'settle' | 'body' | null {
  if (ct < 0 || ct > total) return null;
  if (twoStep && ct < FACE_SETTLE_SEC) return 'settle';
  if (!twoStep || ct <= CALIB_FACE_SEC) return 'face';
  return ct <= CALIB_FACE_SEC + BODY_SETTLE_SEC ? 'settle' : 'body';
}

export interface BodyPose extends GazeBaseline, IrisBaseline {}

/** 몸(어깨)을 볼 때의 고개 각도·눈동자 위치 중앙값. 얼굴이 한 번도 안 잡혔으면 null(판정에서 쓰지 않음) */
export function calibrateBodyPose(poses: (BodyPose | null)[]): BodyPose | null {
  const detected = poses.filter((p): p is BodyPose => p !== null);
  if (detected.length === 0) return null;
  return {
    yaw: median(detected.map((p) => p.yaw)),
    pitch: median(detected.map((p) => p.pitch)),
    ox: median(detected.map((p) => p.ox)),
    oy: median(detected.map((p) => p.oy)),
  };
}
