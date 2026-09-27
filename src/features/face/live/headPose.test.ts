import { describe, expect, it } from 'vitest';
import { computeIrisOffset, isLookingAtCamera, matrixToHeadPose } from './headPose';

/** matrixToHeadPose가 쓰는 것과 같은 R = Rz(roll)*Ry(yaw)*Rx(pitch) 관례로
 * 열 우선(column-major) 4x4 행렬을 만든다 — round-trip(각도→행렬→각도)
 * 테스트용 헬퍼. backend와의 픽스처 패리티가 아니라(알고리즘 자체가 다름,
 * headPose.ts 주석 참고) 이 분해 로직 자체의 내부 일관성만 검증한다. */
function matrixFromEulerDeg(yawDeg: number, pitchDeg: number, rollDeg: number): number[] {
  const yaw = (yawDeg * Math.PI) / 180;
  const pitch = (pitchDeg * Math.PI) / 180;
  const roll = (rollDeg * Math.PI) / 180;
  const cy = Math.cos(yaw);
  const sy = Math.sin(yaw);
  const cx = Math.cos(pitch);
  const sx = Math.sin(pitch);
  const cz = Math.cos(roll);
  const sz = Math.sin(roll);

  const r00 = cy * cz;
  const r01 = cz * sx * sy - cx * sz;
  const r02 = cx * cz * sy + sx * sz;
  const r10 = cy * sz;
  const r11 = cx * cz + sx * sy * sz;
  const r12 = cx * sy * sz - cz * sx;
  const r20 = -sy;
  const r21 = cy * sx;
  const r22 = cx * cy;

  // column-major: [col0(row0,row1,row2,row3), col1(...), ...]
  return [
    r00, r10, r20, 0,
    r01, r11, r21, 0,
    r02, r12, r22, 0,
    0, 0, 0, 1,
  ];
}

describe('matrixToHeadPose', () => {
  it('단위 행렬(정면)은 yaw=pitch=roll=0', () => {
    const identity = matrixFromEulerDeg(0, 0, 0);
    const pose = matrixToHeadPose(identity);
    expect(pose.yaw).toBeCloseTo(0, 5);
    expect(pose.pitch).toBeCloseTo(0, 5);
    expect(pose.roll).toBeCloseTo(0, 5);
  });

  it('알려진 각도로 만든 행렬을 round-trip으로 복원한다', () => {
    for (const [yaw, pitch, roll] of [
      [20, 0, 0],
      [0, -15, 0],
      [0, 0, 10],
      [15, -10, 5],
    ] as const) {
      const matrix = matrixFromEulerDeg(yaw, pitch, roll);
      const pose = matrixToHeadPose(matrix);
      expect(pose.yaw).toBeCloseTo(yaw, 3);
      expect(pose.pitch).toBeCloseTo(pitch, 3);
      expect(pose.roll).toBeCloseTo(roll, 3);
    }
  });
});

describe('computeIrisOffset', () => {
  const leftEyeIdx = [0, 1, 2, 3, 4, 5];
  const rightEyeIdx = [6, 7, 8, 9, 10, 11];
  const leftIrisIdx = [100];
  const rightIrisIdx = [101];

  it('눈동자가 눈 중심에 있으면 offset은 0', () => {
    const landmarks = [
      { x: 0, y: 0.5 }, { x: 0.3, y: 0.1 }, { x: 0.7, y: 0.1 },
      { x: 1, y: 0.5 }, { x: 0.7, y: 0.9 }, { x: 0.3, y: 0.9 },
      { x: 2, y: 0.5 }, { x: 2.3, y: 0.1 }, { x: 2.7, y: 0.1 },
      { x: 3, y: 0.5 }, { x: 2.7, y: 0.9 }, { x: 2.3, y: 0.9 },
    ];
    landmarks[100] = { x: 0.5, y: 0.5 }; // left eye center
    landmarks[101] = { x: 2.5, y: 0.5 }; // right eye center
    const offset = computeIrisOffset(landmarks, leftIrisIdx, rightIrisIdx, leftEyeIdx, rightEyeIdx);
    expect(offset.x).toBeCloseTo(0, 5);
    expect(offset.y).toBeCloseTo(0, 5);
  });

  it('눈동자가 오른쪽으로 치우치면 양의 x offset', () => {
    const landmarks = [
      { x: 0, y: 0.5 }, { x: 0.3, y: 0.1 }, { x: 0.7, y: 0.1 },
      { x: 1, y: 0.5 }, { x: 0.7, y: 0.9 }, { x: 0.3, y: 0.9 },
      { x: 2, y: 0.5 }, { x: 2.3, y: 0.1 }, { x: 2.7, y: 0.1 },
      { x: 3, y: 0.5 }, { x: 2.7, y: 0.9 }, { x: 2.3, y: 0.9 },
    ];
    landmarks[100] = { x: 0.7, y: 0.5 }; // 오른쪽으로 치우침
    landmarks[101] = { x: 2.5, y: 0.5 };
    const offset = computeIrisOffset(landmarks, leftIrisIdx, rightIrisIdx, leftEyeIdx, rightEyeIdx);
    expect(offset.x).toBeGreaterThan(0);
  });
});

// backend tests/test_gaze_analyzer.py의 is_looking_at_camera 픽스처를 그대로 옮김.
describe('isLookingAtCamera (backend is_looking_at_camera 포팅)', () => {
  it('모든 임계값 안이면 정면을 보는 것으로 판정', () => {
    expect(isLookingAtCamera(5, -5, 0.05, -0.05)).toBe(true);
  });

  it('yaw가 임계값을 넘으면 회피로 판정', () => {
    expect(isLookingAtCamera(11, 0, 0.0, 0.0)).toBe(false);
  });

  it('pitch가 임계값을 넘으면 회피로 판정', () => {
    expect(isLookingAtCamera(0, -11, 0.0, 0.0)).toBe(false);
  });

  it('눈동자 offset이 임계값을 넘으면 회피로 판정', () => {
    expect(isLookingAtCamera(0, 0, 0.16, 0.0)).toBe(false);
  });

  it('baseline이 정면 기준을 이동시킨다', () => {
    // baseline_yaw=20인 사람에게는 yaw=25(차이 5)가 정면
    expect(isLookingAtCamera(25, 0, 0.0, 0.0, 20)).toBe(true);
    // 같은 yaw=25라도 baseline 없이(0 기준) 보면 차이가 25라 회피로 판정
    expect(isLookingAtCamera(25, 0, 0.0, 0.0)).toBe(false);
  });

  it('커스텀 임계값이 기본값을 덮어쓴다', () => {
    // 기본 yaw_thresh(10)라면 통과할 값이지만, 더 엄격한 5로 좁히면 회피로 판정
    expect(isLookingAtCamera(8, 0, 0.0, 0.0, 0, 0, 5)).toBe(false);
  });
});
