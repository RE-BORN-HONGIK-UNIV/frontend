import { describe, expect, it } from 'vitest';
import { splitByQuestion } from './perQuestion';

describe('질문별로 나누기', () => {
  it('질문이 바뀐 시각으로 깜빡임 횟수를 나눠 1분당으로', () => {
    const blinks = [10, 20, 30, 70, 100].map((t) => ({ start: t, end: t + 0.2 }));
    // Q1: 0~60초(3번 → 3회/분), Q2: 60~120초(2번 → 2회/분)
    expect(splitByQuestion(blinks, [], [0, 60], 120).blink_per_min).toEqual([3, 2]);
  });

  it('바라본 구간은 질문 경계에서 잘라서 평균', () => {
    const gaze = [
      { type: 'fixation', start: 0, end: 4 },
      { type: 'aversion', start: 4, end: 5 },
      { type: 'fixation', start: 5, end: 14 }, // 10초에서 잘림 → Q1에 5초, Q2에 4초
    ];
    expect(splitByQuestion([], gaze, [0, 10], 20).gaze_avg_sec).toEqual([4.5, 4]);
  });

  it('바라본 구간이 없거나 길이가 0인 질문 구간은 건너뛰고 0으로', () => {
    const r = splitByQuestion([], [{ type: 'aversion', start: 0, end: 10 }], [0, 5, 5], 10);
    expect(r.gaze_avg_sec).toEqual([0, 0]);
    expect(r.blink_per_min).toHaveLength(2);
  });
});
