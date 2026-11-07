import { describe, expect, it } from 'vitest';
import {
  calibrateBaselineEar,
  calibrateBaselineGaze,
  calibrateBaselineIris,
  calibrateBaselineTension,
  calibStepAt,
  calibStageAt,
  personalThreshold,
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

describe('표정 맞추기 캘리브레이션(하루의 눈 3초 → 찡그리기 2초 → 웃기 2초)', () => {
  it('단계마다 처음 0.5초는 빼고, 7초가 지나면 끝', () => {
    expect(calibStepAt(0.2, true)).toBe('settle');
    expect(calibStepAt(1, true)).toBe('face');
    expect(calibStepAt(3.2, true)).toBe('settle');
    expect(calibStepAt(4, true)).toBe('frown');
    expect(calibStepAt(5.3, true)).toBe('settle');
    expect(calibStepAt(6.5, true)).toBe('smile');
    expect(calibStepAt(7.1, true)).toBeNull();
    expect(calibStageAt(3.2, true)).toBe('frown');
    expect(calibStageAt(6, true)).toBe('smile');
  });

  it('표정 맞추기를 안 하면 예전처럼 5초 내내 무표정', () => {
    expect(calibStepAt(0.1, false, 5)).toBe('face');
    expect(calibStepAt(4.5, false, 5)).toBe('face');
    expect(calibStepAt(5.1, false, 5)).toBeNull();
    expect(calibStageAt(4.5, false)).toBe('face');
  });

  const opts = { min: 0.04, max: 0.08, fallback: 0.08, relative: true };
  it('찡그림 기준 = (찡그림 상위 10% − 무표정) × 1/3, [0.04, 0.08] 안으로', () => {
    const neutral = Array(20).fill(0.03);
    // 찡그림이 무표정보다 0.18 높은 사람 → 0.06
    expect(personalThreshold(neutral, Array(20).fill(0.21), opts)).toBeCloseTo(0.06, 5);
    // 찡그림이 작게 잡히는 사람(+0.09) → 0.03이지만 하한 0.04
    expect(personalThreshold(neutral, Array(20).fill(0.12), opts)).toBeCloseTo(0.04, 5);
    // 아주 크게 찡그려도 지금 기준(0.08)보다 엄격해지지 않음
    expect(personalThreshold(neutral, Array(20).fill(0.6), opts)).toBeCloseTo(0.08, 5);
  });

  it('찡그림을 못 쟀거나 오르지 않았으면 기본값', () => {
    expect(personalThreshold([0.03], [null, null], opts)).toBe(0.08);
    expect(personalThreshold([0.03], [0.02, 0.03], opts)).toBe(0.08);
  });

  it('미소 기준 = 무표정 + (웃음 − 무표정) × 1/3, [0.15, 0.35] 안으로', () => {
    const smile = { min: 0.15, max: 0.35, fallback: 0.35, relative: false };
    // 웃어도 0.28까지만 오르는 사람 → 0.093이지만 하한 0.15
    expect(personalThreshold([0, 0], Array(10).fill(0.28), smile)).toBeCloseTo(0.15, 5);
    // 0.75까지 오르는 사람 → 0.25
    expect(personalThreshold([0, 0], Array(10).fill(0.75), smile)).toBeCloseTo(0.25, 5);
    expect(personalThreshold([0, 0], Array(10).fill(1), smile)).toBeCloseTo(0.3333, 3);
  });
});
