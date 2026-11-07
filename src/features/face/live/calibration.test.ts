import { describe, expect, it } from 'vitest';
import {
  calibrateBaselineEar,
  calibrateBaselineGaze,
  calibrateBaselineIris,
  calibrateBaselineTension,
  calibrateBodyPose,
  calibStepAt,
  DEFAULT_BASELINE_EAR,
  DEFAULT_BASELINE_TENSION,
} from './calibration';

// backend/step2/set_baseline.py의 calibrate_baseline_ear에 대응하는 pytest
// 픽스처는 없어서(원본도 테스트가 없음), 소스 로직(중앙값 + 얼굴 미검출 폴백)을
// 그대로 검증하는 테스트를 새로 작성.

describe('calibrateBaselineEar (backend calibrate_baseline_ear 포팅)', () => {
  it('EAR 값들의 중앙값을 반환한다', () => {
    expect(calibrateBaselineEar([0.28, 0.3, 0.32])).toBe(0.3);
  });

  it('짝수 개일 때는 가운데 두 값의 평균', () => {
    expect(calibrateBaselineEar([0.2, 0.3, 0.4, 0.5])).toBe(0.35);
  });

  it('null(얼굴 미검출)은 무시하고 나머지로 중앙값을 계산한다', () => {
    expect(calibrateBaselineEar([null, 0.28, 0.3, 0.32, null])).toBe(0.3);
  });

  it('값이 하나도 없으면 DEFAULT_BASELINE_EAR로 폴백한다', () => {
    expect(calibrateBaselineEar([null, null])).toBe(DEFAULT_BASELINE_EAR);
    expect(calibrateBaselineEar([])).toBe(DEFAULT_BASELINE_EAR);
  });
});

describe('calibrateBaselineGaze (backend calibrate_baseline_gaze 포팅)', () => {
  it('yaw/pitch 각각의 중앙값을 반환한다', () => {
    const result = calibrateBaselineGaze([
      { yaw: 2, pitch: -1 },
      { yaw: 4, pitch: 1 },
      { yaw: 6, pitch: 3 },
    ]);
    expect(result).toEqual({ yaw: 4, pitch: 1 });
  });

  it('null(얼굴 미검출)은 무시하고 나머지로 중앙값을 계산한다', () => {
    const result = calibrateBaselineGaze([null, { yaw: 2, pitch: -1 }, { yaw: 4, pitch: 1 }, null]);
    expect(result).toEqual({ yaw: 3, pitch: 0 });
  });

  it('값이 하나도 없으면 (0, 0)으로 폴백한다', () => {
    expect(calibrateBaselineGaze([null, null])).toEqual({ yaw: 0, pitch: 0 });
    expect(calibrateBaselineGaze([])).toEqual({ yaw: 0, pitch: 0 });
  });
});

describe('calibrateBaselineTension (backend calibrate_baseline_tension 포팅)', () => {
  it('긴장 점수들의 중앙값을 반환한다', () => {
    expect(calibrateBaselineTension([0.1, 0.2, 0.3])).toBe(0.2);
  });

  it('null(얼굴 미검출)은 무시하고 나머지로 중앙값을 계산한다', () => {
    expect(calibrateBaselineTension([null, 0.1, 0.2, 0.3, null])).toBe(0.2);
  });

  it('값이 하나도 없으면 DEFAULT_BASELINE_TENSION으로 폴백한다', () => {
    expect(calibrateBaselineTension([null, null])).toBe(DEFAULT_BASELINE_TENSION);
    expect(calibrateBaselineTension([])).toBe(DEFAULT_BASELINE_TENSION);
  });
});

describe('calibrateBaselineIris (2026-11 — 하루를 볼 때의 눈동자 위치)', () => {
  it('캘리브레이션 동안 눈동자 위치의 중앙값을 기준으로 잡는다(얼굴 미검출 프레임은 뺌)', () => {
    expect(
      calibrateBaselineIris([null, { ox: 0.02, oy: 0.18 }, { ox: 0.0, oy: 0.2 }, { ox: 0.05, oy: 0.5 }]),
    ).toEqual({ ox: 0.02, oy: 0.2 });
  });

  it('얼굴이 한 번도 안 잡히면 (0, 0) — 예전과 같은 판정', () => {
    expect(calibrateBaselineIris([null, null])).toEqual({ ox: 0, oy: 0 });
  });
});

describe('2단계 캘리브레이션(하루의 눈 3초 → 어깨 2초)', () => {
  it('처음 0.5초는 빼고 3초까지 얼굴, 옮기는 0.5초는 빼고, 나머지는 몸, 5초가 지나면 끝', () => {
    // 처음 0.5초는 눈을 점으로 옮기는 중이라 뺀다
    expect(calibStepAt(0, true)).toBe('settle');
    expect(calibStepAt(0.6, true)).toBe('face');
    expect(calibStepAt(3, true)).toBe('face');
    expect(calibStepAt(3.2, true)).toBe('settle');
    expect(calibStepAt(3.6, true)).toBe('body');
    expect(calibStepAt(5, true)).toBe('body');
    expect(calibStepAt(5.1, true)).toBeNull();
  });

  it('한 단계(예전 방식)면 5초 내내 얼굴', () => {
    expect(calibStepAt(4.5, false)).toBe('face');
    expect(calibStepAt(5.1, false)).toBeNull();
  });

  it('몸을 볼 때 값은 중앙값, 얼굴이 안 잡혔으면 null', () => {
    expect(
      calibrateBodyPose([
        { yaw: 1, pitch: 8, ox: 0, oy: 0.1 },
        null,
        { yaw: 3, pitch: 12, ox: 0.02, oy: 0.2 },
        { yaw: 2, pitch: 10, ox: 0.01, oy: 0.15 },
      ]),
    ).toEqual({ yaw: 2, pitch: 10, ox: 0.01, oy: 0.15 });
    expect(calibrateBodyPose([null, null])).toBeNull();
  });
});
