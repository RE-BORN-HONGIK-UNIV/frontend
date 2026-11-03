import type { Blink } from './blink';

/**
 * 2단계 통화의 깜빡임·시선을 하루의 질문별로 나눈다 (순수 함수).
 * 새 판정이 아니라 이미 판정된 깜빡임(시각)과 시선 구간을 질문이 바뀐 시각으로 자르기만 한다 —
 * 그래서 임계값 검증 없이 쓸 수 있다. 시각은 모두 같은 기준(세션 시작부터 초)이어야 한다.
 *
 * - 질문 i의 구간: starts[i] ~ starts[i+1] (마지막은 end까지)
 * - 깜빡임: 구간 안에서 시작한 횟수 ÷ 구간 길이(분)
 * - 눈 맞춤: 바라본(fixation) 구간을 질문 구간으로 잘라 낸 길이들의 평균. 바라본 구간이 없으면 0
 */
export interface GazeSpan {
  type: string;
  start: number;
  end: number;
}

const round1 = (x: number) => Math.round(x * 10) / 10;

export function splitByQuestion(
  blinks: Blink[],
  gaze: GazeSpan[],
  starts: number[],
  end: number,
): { blink_per_min: number[]; gaze_avg_sec: number[] } {
  const windows = starts
    .map((s, i) => [s, i + 1 < starts.length ? starts[i + 1] : end] as const)
    .filter(([a, b]) => b > a);
  return {
    blink_per_min: windows.map(([a, b]) => round1(blinks.filter((x) => x.start >= a && x.start < b).length / ((b - a) / 60))),
    gaze_avg_sec: windows.map(([a, b]) => {
      const lens = gaze
        .filter((g) => g.type === 'fixation')
        .map((g) => Math.min(g.end, b) - Math.max(g.start, a))
        .filter((d) => d > 0);
      return lens.length ? round1(lens.reduce((x, y) => x + y, 0) / lens.length) : 0;
    }),
  };
}
