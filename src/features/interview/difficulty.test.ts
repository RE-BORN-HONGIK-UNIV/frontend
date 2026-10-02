import { describe, expect, it } from 'vitest';
import { combineAnxietyScore, getTier, resolveAnxietyScore } from './difficulty';

describe('combineAnxietyScore', () => {
  it('가중치(6:4)대로 두 점수를 합산한다', () => {
    expect(combineAnxietyScore(100, 0)).toBe(60);
    expect(combineAnxietyScore(0, 100)).toBe(40);
  });

  it('소수 첫째 자리로 반올림한다', () => {
    expect(combineAnxietyScore(33, 33)).toBe(33);
    expect(combineAnxietyScore(10, 5)).toBe(8);
  });
});

describe('getTier', () => {
  it('40 미만은 warmup', () => {
    expect(getTier(39.9).tier).toBe('warmup');
  });

  it('경계값 40은 standard (미만이 아니라 포함)', () => {
    expect(getTier(40).tier).toBe('standard');
  });

  it('40~69는 standard', () => {
    expect(getTier(69.9).tier).toBe('standard');
  });

  it('경계값 70은 practice', () => {
    expect(getTier(70).tier).toBe('practice');
  });

  it('70 이상은 practice', () => {
    expect(getTier(100).tier).toBe('practice');
  });
});

describe('resolveAnxietyScore', () => {
  it('1·2단계 둘 다 있으면 가중 합산한다', () => {
    expect(resolveAnxietyScore(100, 0)).toBe(60);
  });

  it('1단계만 있으면 그 점수를 그대로 쓴다 (2단계를 0점으로 취급하지 않음)', () => {
    expect(resolveAnxietyScore(80, null)).toBe(80);
  });

  it('2단계만 있으면 그 점수를 그대로 쓴다', () => {
    expect(resolveAnxietyScore(null, 45)).toBe(45);
  });

  it('둘 다 없으면 null', () => {
    expect(resolveAnxietyScore(null, null)).toBeNull();
  });

  it('0점도 기록 있음으로 취급한다 (null과 구분)', () => {
    expect(resolveAnxietyScore(0, null)).toBe(0);
    expect(resolveAnxietyScore(null, 0)).toBe(0);
  });
});
