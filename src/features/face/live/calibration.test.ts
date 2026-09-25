import { describe, expect, it } from 'vitest';
import { calibrateBaselineEar, DEFAULT_BASELINE_EAR } from './calibration';

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
