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
