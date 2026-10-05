import { describe, expect, it } from 'vitest';
import { checkCaptureQuality, MIN_FACE_DETECTED_RATIO, rejectionMessage } from './quality';

describe('checkCaptureQuality', () => {
  it('프레임이 하나도 없으면 no-frames', () => {
    expect(checkCaptureQuality(0, 0, 10)).toEqual({ reason: 'no-frames', detectedRatio: 0 });
  });
  it('길이가 0이면 no-frames (깜빡임 비율 계산의 0 나누기 방지)', () => {
    expect(checkCaptureQuality(30, 30, 0)).toEqual({ reason: 'no-frames', detectedRatio: 0 });
  });
  it('얼굴이 한 번도 안 잡히면 low-face-ratio', () => {
    expect(checkCaptureQuality(100, 0, 10)).toEqual({ reason: 'low-face-ratio', detectedRatio: 0 });
  });
  it('기준 바로 아래는 거절, 기준 이상은 통과', () => {
    expect(checkCaptureQuality(100, 49, 10)?.reason).toBe('low-face-ratio');
    expect(checkCaptureQuality(100, MIN_FACE_DETECTED_RATIO * 100, 10)).toBeNull();
    expect(checkCaptureQuality(100, 100, 10)).toBeNull();
  });
});

describe('rejectionMessage', () => {
  it('검출 비율을 퍼센트로 알려주고 다음 행동을 안내한다', () => {
    const msg = rejectionMessage({ reason: 'low-face-ratio', detectedRatio: 0.2 });
    expect(msg).toContain('20%');
    expect(msg).toContain('다시 촬영');
  });
});
