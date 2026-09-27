import { describe, expect, it } from 'vitest';
import { scoreBlinkRate, scoreExpression, scoreGazeSegment, scoreGazeSegments } from './scoring';

// backend/tests/test_scoring.py의 score_blink_rate/score_gaze_segment(s)
// 관련 픽스처를 그대로 옮김.

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

describe('scoreGazeSegment (backend score_gaze_segment 포팅)', () => {
  it('3~5초 구간은 만점', () => {
    expect(scoreGazeSegment(3)).toBe(100);
    expect(scoreGazeSegment(5)).toBe(100);
  });

  it('3초 미만은 비례 감점', () => {
    expect(scoreGazeSegment(1.5)).toBe(35.0);
  });

  it('5초 초과는 초과분만큼 감점', () => {
    expect(scoreGazeSegment(7)).toBe(80);
  });
});

describe('scoreGazeSegments (backend score_gaze_segments 포팅)', () => {
  it('fixation 구간이 없으면 0점', () => {
    const result = scoreGazeSegments([{ type: 'aversion', start: 0, end: 5 }]);
    expect(result).toEqual({ avgFixationSec: 0, score: 0 });
  });

  it('fixation 구간들의 평균 지속시간·평균 점수를 낸다', () => {
    const segments = [
      { type: 'fixation', start: 0, end: 4 },
      { type: 'aversion', start: 4, end: 5 },
      { type: 'fixation', start: 5, end: 6 },
    ];
    const result = scoreGazeSegments(segments);
    expect(result.avgFixationSec).toBe(2.5);
    expect(result.score).toBe(61.7);
  });
});

describe('scoreExpression (backend score_expression 포팅)', () => {
  it('미소는 많고 긴장은 적으면 편안함', () => {
    const result = scoreExpression(0.3, 0.05);
    expect(result.status).toBe('편안함');
  });

  it('긴장 비율이 높으면 긴장됨', () => {
    const result = scoreExpression(0.0, 0.5);
    expect(result.status).toBe('긴장됨');
  });

  it('미소도 긴장도 적으면 보통', () => {
    const result = scoreExpression(0.1, 0.1);
    expect(result.status).toBe('보통');
  });
});
