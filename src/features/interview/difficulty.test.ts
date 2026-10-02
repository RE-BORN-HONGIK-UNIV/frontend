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
    expect(resolveAnxietyScore(100, 0)).toEqual({ status: 'ready', score: 60 });
  });

  it('1단계만 없으면 1단계가 필요하다고 알린다 (2단계 점수만으론 난이도를 정하지 않음)', () => {
    expect(resolveAnxietyScore(null, 45)).toEqual({ status: 'missing', missing: ['stage1'], failed: false });
  });

  it('2단계만 없으면 2단계가 필요하다고 알린다', () => {
    expect(resolveAnxietyScore(80, null)).toEqual({ status: 'missing', missing: ['stage2'], failed: false });
  });

  it('둘 다 없으면 두 단계 모두 필요하다고 알린다', () => {
    expect(resolveAnxietyScore(null, null)).toEqual({ status: 'missing', missing: ['stage1', 'stage2'], failed: false });
  });

  it('조회 실패 여부를 failed로 구분해 전달한다', () => {
    expect(resolveAnxietyScore(null, null, true)).toEqual({ status: 'missing', missing: ['stage1', 'stage2'], failed: true });
  });

  it('0점도 기록 있음으로 취급한다 (null과 구분)', () => {
    expect(resolveAnxietyScore(0, 0)).toEqual({ status: 'ready', score: 0 });
    expect(resolveAnxietyScore(0, null)).toEqual({ status: 'missing', missing: ['stage2'], failed: false });
  });
});
