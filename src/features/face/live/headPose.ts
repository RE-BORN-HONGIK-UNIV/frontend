import type { Point2D } from './types';

export interface HeadPose {
  yaw: number;
  pitch: number;
  roll: number;
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

/**
 * MediaPipe FaceLandmarker의 facialTransformationMatrixes(열 우선 4x4)에서
 * yaw/pitch/roll(도 단위)을 뽑아낸다.
 *
 * 백엔드(gaze_analyzer.estimate_head_pose)는 cv2.solvePnP(6점 모델) +
 * Rodrigues + RQDecomp3x3로 계산하지만(계획 문서 §4의 Option A), 여기서는
 * MediaPipe 자체가 이미 계산해주는 얼굴 변환 행렬을 쓴다(Option B —
 * Phase 0 스파이크에서 추가 WASM 없이 바로 쓸 수 있음을 실기기로 확인).
 *
 * **알고리즘 자체가 달라서 yaw/pitch 절대값이 backend와 정확히 일치하지
 * 않는다** — is_looking_at_camera는 baseline 대비 상대 편차로만 판정하고
 * baseline도 이 함수로 같이 잡기 때문에 개인차·웹캠 위치 편향은 자동으로
 * 상쇄되지만, yaw_thresh/pitch_thresh=10도라는 임계값 자체는 solvePnP 기준
 * 실측(ACCURACY_NOTES.md)으로 검증된 값이라 이 알고리즘에도 그대로 맞는다는
 * 보장은 없음 — LiveGazeDemo로 고개를 좌우/상하로 움직여보면서 fixation↔
 * aversion 전환이 체감상 합리적인지 실기기 재검증 필요(계획 문서 §4, 아직
 * 미완료).
 */
export function matrixToHeadPose(matrix: ArrayLike<number>): HeadPose {
  const m = (row: number, col: number) => matrix[col * 4 + row];

  const r00 = m(0, 0);
  const r10 = m(1, 0);
  const r20 = m(2, 0);
  const r21 = m(2, 1);
  const r22 = m(2, 2);

  // R = Rz(roll) * Ry(yaw) * Rx(pitch) 분해 관례.
  const yawRad = Math.asin(clamp(-r20, -1, 1));
  const pitchRad = Math.atan2(r21, r22);
  const rollRad = Math.atan2(r10, r00);

  return {
    yaw: (yawRad * 180) / Math.PI,
    pitch: (pitchRad * 180) / Math.PI,
    roll: (rollRad * 180) / Math.PI,
  };
}

function meanPoint(pts: Point2D[]): Point2D {
  const x = pts.reduce((sum, p) => sum + p.x, 0) / pts.length;
  const y = pts.reduce((sum, p) => sum + p.y, 0) / pts.length;
  return { x, y };
}

function dist(a: Point2D, b: Point2D): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/** backend compute_iris_offset의 1:1 포팅 — 눈 중심 대비 iris(눈동자) 중심의
 * 상대적 치우침, 눈 너비로 정규화(랜드마크가 정규화 좌표든 픽셀 좌표든
 * 비율이라 무관). */
export function computeIrisOffset(
  landmarks: Point2D[],
  leftIrisIdx: number[],
  rightIrisIdx: number[],
  leftEyeIdx: number[],
  rightEyeIdx: number[],
): Point2D {
  const offsetFor = (irisIdx: number[], eyeIdx: number[]): Point2D => {
    const irisCenter = meanPoint(irisIdx.map((i) => landmarks[i]));
    const eyePts = eyeIdx.map((i) => landmarks[i]);
    const eyeCenter = meanPoint(eyePts);
    const eyeWidth = dist(eyePts[0], eyePts[3]) + 1e-6;
    return { x: (irisCenter.x - eyeCenter.x) / eyeWidth, y: (irisCenter.y - eyeCenter.y) / eyeWidth };
  };
  const l = offsetFor(leftIrisIdx, leftEyeIdx);
  const r = offsetFor(rightIrisIdx, rightEyeIdx);
  return { x: (l.x + r.x) / 2, y: (l.y + r.y) / 2 };
}

/** backend is_looking_at_camera의 1:1 포팅 — 임계값 근거는
 * backend/step2/gaze_analyzer.py의 docstring 참고(2026-09-12 재조정,
 * "Cone of Direct Gaze" 문헌 + 실측 3영상 재검증). */
export function isLookingAtCamera(
  yaw: number,
  pitch: number,
  irisOffsetX: number,
  irisOffsetY: number,
  baselineYaw = 0,
  baselinePitch = 0,
  yawThresh = 10,
  pitchThresh = 10,
  irisThresh = 0.15,
): boolean {
  return (
    Math.abs(yaw - baselineYaw) < yawThresh &&
    Math.abs(pitch - baselinePitch) < pitchThresh &&
    Math.abs(irisOffsetX) < irisThresh &&
    Math.abs(irisOffsetY) < irisThresh
  );
}
