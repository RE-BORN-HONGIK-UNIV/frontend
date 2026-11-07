import { describe, expect, it } from 'vitest';
import { isBlinkLength, MAX_BLINK_DURATION } from './blink';
import { markClosuresAsAversion } from './gaze';
import { combineSmileRatio } from './expression';

describe('2026-11 판정: 깜빡임 길이', () => {
  it('0.4초까지는 깜빡임, 넘으면 아님', () => {
    expect(MAX_BLINK_DURATION).toBe(0.4);
    expect(isBlinkLength({ start: 1, end: 1.25 })).toBe(true);
    expect(isBlinkLength({ start: 1, end: 1.4 })).toBe(true);
    expect(isBlinkLength({ start: 1, end: 4.3 })).toBe(false);
  });
});

describe('2026-11 판정: 길게 감긴 구간은 시선 이탈', () => {
  it('하루를 보던 구간 가운데 감긴 부분만 이탈로 바꾼다', () => {
    expect(
      markClosuresAsAversion(
        [
          { type: 'fixation', start: 0, end: 10 },
          { type: 'aversion', start: 10, end: 11 },
        ],
        [{ start: 4, end: 7.3 }],
      ),
    ).toEqual([
      { type: 'fixation', start: 0, end: 4 },
      { type: 'aversion', start: 4, end: 7.3 },
      { type: 'fixation', start: 7.3, end: 10 },
      { type: 'aversion', start: 10, end: 11 },
    ]);
  });

  it('이탈 구간과 붙으면 하나로 합치고, 감김이 없으면 그대로', () => {
    const segs = [
      { type: 'fixation', start: 0, end: 5 },
      { type: 'aversion', start: 5, end: 6 },
    ];
    expect(markClosuresAsAversion(segs, [{ start: 4.5, end: 5 }])).toEqual([
      { type: 'fixation', start: 0, end: 4.5 },
      { type: 'aversion', start: 4.5, end: 6 },
    ]);
    expect(markClosuresAsAversion(segs, [])).toBe(segs);
  });
});

describe('2026-11 판정: 미소는 대답 + 듣는 동안', () => {
  it('대답·듣기 프레임을 합쳐 비율을 낸다', () => {
    expect(combineSmileRatio({ smileRatio: 0.1, tensionRatio: 0, frameCount: 100 }, 30, 200)).toBeCloseTo(40 / 300, 4);
    expect(combineSmileRatio({ smileRatio: 0.1, tensionRatio: 0, frameCount: 100 }, 0, 0)).toBe(0.1);
    expect(combineSmileRatio({ smileRatio: 0, tensionRatio: 0, frameCount: 0 }, 0, 0)).toBe(0);
  });
});

describe('2026-11 찡그림 판정 구조', () => {
  it('평소 값을 빼고 판정한다 — 원래 미간이 좁은 사람의 무표정은 긴장이 아님', async () => {
    const { computeExpressionForFrame } = await import('./expression');
    const bs = { browDownLeft: 0.42, browDownRight: 0.42, mouthSmileLeft: 0, mouthSmileRight: 0, jawOpen: 0 };
    expect(computeExpressionForFrame(bs)?.tension).toBeCloseTo(0.42);
    expect(computeExpressionForFrame(bs, 0.4)?.tension).toBeCloseTo(0.02);
  });

  it('정한 시간 넘게 이어진 것만 센다(말하며 잠깐 움직인 눈썹은 뺌)', async () => {
    const { countSustained, summarizeExpression } = await import('./expression');
    const at = (n: number, on: boolean, from: number) =>
      Array.from({ length: n }, (_, i) => [from + i * 0.1, on] as [number, boolean]);
    const series = [...at(3, true, 0), ...at(2, false, 0.3), ...at(8, true, 0.5)];
    expect(countSustained(series, 0)).toBe(11);
    // 0.2초짜리(3장면)는 빠지고 0.7초짜리(8장면)만
    expect(countSustained(series, 0.5)).toBe(8);
    // 대답 사이처럼 시간이 비면 끊긴 것으로 본다
    expect(countSustained([[0, true], [0.1, true], [5, true], [5.1, true]], 0.5)).toBe(0);
    const s: [number, number | null, number | null][] = series.map(([t, on]) => [t, 0, on ? 0.5 : 0]);
    expect(summarizeExpression(s, 0.5).tensionRatio).toBeCloseTo(8 / 13, 4);
    expect(summarizeExpression(s).tensionRatio).toBeCloseTo(11 / 13, 4);
  });
});

describe('2026-11 찡그림 임시값', () => {
  it('평소 대비 +0.08부터 찡그림 — 세연 찡그림(평소 0.037 → 0.16)은 잡고, 무표정(+0.03~0.07)은 안 잡음', async () => {
    const { TENSION_DELTA_THRESHOLD, summarizeExpression } = await import('./expression');
    expect(TENSION_DELTA_THRESHOLD).toBe(0.08);
    const series: [number, number | null, number | null][] = [
      [0, 0, 0.16 - 0.037],
      [0.1, 0, 0.07],
      [0.2, 0, 0.03],
      [0.3, 0, 0.1],
    ];
    expect(summarizeExpression(series, 0, TENSION_DELTA_THRESHOLD).tensionRatio).toBe(0.5);
  });
});
