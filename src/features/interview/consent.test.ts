import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getInterviewConsent, setInterviewConsent } from './consent';

describe('interview consent', () => {
  beforeEach(() => localStorage.clear());

  it('기본값은 동의 안 함이다 (체크하기 전엔 아무것도 저장·전송하지 않음)', () => {
    expect(getInterviewConsent()).toBe(false);
  });

  it('선택을 기억하고 바꿀 수 있다', () => {
    setInterviewConsent(true);
    expect(getInterviewConsent()).toBe(true);
    setInterviewConsent(false);
    expect(getInterviewConsent()).toBe(false);
  });

  it('저장소를 못 쓰는 환경(시크릿 모드 등)에서도 에러 없이 동의 안 함으로 동작한다', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked'); });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked'); });
    expect(getInterviewConsent()).toBe(false);
    expect(() => setInterviewConsent(true)).not.toThrow();
    vi.restoreAllMocks();
  });
});
