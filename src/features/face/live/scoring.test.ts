import { describe, expect, it } from 'vitest';
import { scoreBlinkRate } from './scoring';

// backend/tests/test_scoring.py의 score_blink_rate 관련 픽스처를 그대로 옮김.

describe('scoreBlinkRate (backend score_blink_rate 포팅)', () => {
  it('정상 범위(10~30회/분)는 100점', () => {
    const result = scoreBlinkRate(20, 60);
    expect(result.status).toBe('정상');
    expect(result.score).toBe(100);
    expect(result.ratePerMin).toBe(20.0);
  });

  it('30회/분 초과는 빈번', () => {
    const result = scoreBlinkRate(35, 60);
    expect(result.status).toBe('빈번');
    expect(result.score).toBe(75.0);
  });

  it('10회/분 미만은 과응시', () => {
    const result = scoreBlinkRate(5, 60);
    expect(result.status).toBe('과응시');
    expect(result.score).toBe(75.0);
  });
});
