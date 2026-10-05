import { describe, expect, it } from 'vitest';
import {
  buildHighlightRanges,
  HIGHLIGHT_MAX_TOTAL_SEC,
  nextPlaybackStep,
  pickHighlightIntervals,
} from './highlight';

describe('buildHighlightRanges', () => {
  it('앞뒤 0.3초 여유를 붙이고 녹화 시작 오프셋을 뺀다', () => {
    const r = buildHighlightRanges([{ start: 10, end: 12 }], 2, 60);
    expect(r).toEqual([{ start: 7.7, end: 10.3 }]);
  });

  it('녹화 범위(0~길이)를 벗어난 부분은 잘라낸다', () => {
    const r = buildHighlightRanges([{ start: 0.1, end: 1 }, { start: 58.5, end: 59.9 }], 0, 60);
    expect(r[0].start).toBe(0);
    expect(r[r.length - 1].end).toBe(60);
  });

  it('녹화 시작 전에 끝난 구간(오프셋 때문에 음수)은 버린다', () => {
    expect(buildHighlightRanges([{ start: 0, end: 0.2 }], 5, 60)).toEqual([]);
  });

  it('여유를 붙여 겹치거나 맞닿는 구간은 하나로 합친다(같은 장면 반복 방지)', () => {
    const r = buildHighlightRanges([{ start: 5, end: 6 }, { start: 6.4, end: 7 }], 0, 60);
    expect(r).toEqual([{ start: 4.7, end: 7.3 }]);
  });

  it('입력 순서와 상관없이 시간순으로 낸다', () => {
    const r = buildHighlightRanges([{ start: 20, end: 21 }, { start: 5, end: 6 }], 0, 60);
    expect(r.map((x) => x.start)).toEqual([4.7, 19.7]);
  });

  it('총 길이 상한(15초)을 넘기면 앞에서부터 자르고 마지막 조각은 남은 만큼만 쓴다', () => {
    const intervals = Array.from({ length: 10 }, (_, i) => ({ start: i * 20, end: i * 20 + 4 }));
    const r = buildHighlightRanges(intervals, 0, 300);
    const total = r.reduce((s, x) => s + (x.end - x.start), 0);
    expect(total).toBeCloseTo(HIGHLIGHT_MAX_TOTAL_SEC, 5);
    expect(r).toHaveLength(4); // 4.6 + 4.6 + 4.6 + 1.2
  });

  it('구간이 없으면 빈 배열', () => {
    expect(buildHighlightRanges([], 0, 60)).toEqual([]);
  });
});

describe('pickHighlightIntervals', () => {
  const result = {
    blink: { events: [{ start: 1, end: 1.2 }] },
    gaze: {
      segments: [
        { type: 'fixation', start: 0, end: 3 },
        { type: 'aversion', start: 3, end: 4 },
      ],
    },
    expression: {
      segments: [
        { type: 'neutral', start: 0, end: 2 },
        { type: 'smile', start: 2, end: 3 },
        { type: 'tension', start: 3, end: 4 },
      ],
    },
  } as unknown as Parameters<typeof pickHighlightIntervals>[1];

  it('깜빡임은 이벤트 전부', () => {
    expect(pickHighlightIntervals('blink', result)).toEqual([{ start: 1, end: 1.2 }]);
  });
  it('시선은 회피 구간만', () => {
    expect(pickHighlightIntervals('gaze', result)).toEqual([{ start: 3, end: 4 }]);
  });
  it('표정은 neutral이 아닌 구간(미소·긴장)', () => {
    expect(pickHighlightIntervals('expression', result)).toEqual([
      { start: 2, end: 3 },
      { start: 3, end: 4 },
    ]);
  });
});

describe('nextPlaybackStep', () => {
  const ranges = [
    { start: 1, end: 2 },
    { start: 5, end: 6 },
  ];
  it('구간 안에서는 계속 재생', () => {
    expect(nextPlaybackStep(1.5, ranges, 0)).toEqual({ kind: 'continue' });
  });
  it('구간 끝에 닿으면 다음 구간 시작으로 건너뜀', () => {
    expect(nextPlaybackStep(2, ranges, 0)).toEqual({ kind: 'jump', index: 1, time: 5 });
  });
  it('마지막 구간이 끝나면 done', () => {
    expect(nextPlaybackStep(6.01, ranges, 1)).toEqual({ kind: 'done' });
  });
});
