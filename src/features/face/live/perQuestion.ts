import type { Blink } from './blink';

/**
 * 2단계 통화의 깜빡임·시선을 하루의 질문별로 나눈다 (순수 함수).
 * 새 판정이 아니라 이미 판정된 깜빡임(시각)과 시선 구간을 질문이 바뀐 시각으로 자르기만 한다 —
 * 그래서 임계값 검증 없이 쓸 수 있다. 시각은 모두 같은 기준(세션 시작부터 초)이어야 한다.
 *
 * - 질문 i의 구간: starts[i] ~ starts[i+1] (마지막은 end까지)
 * - 깜빡임: 구간 안에서 시작한 횟수 ÷ 구간 길이(분). measured(실제로 잰 시간들)를 주면 구간 길이 대신
 *   구간 안에서 실제로 잰 시간만 센다 — 2단계는 사용자가 대답하는 동안만 재므로(useLiveFaceSession)
 *   하루가 말한 시간까지 나누면 분당 횟수가 실제보다 작게 나온다. 잰 시간이 없는 구간은 0
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
  measured?: [number, number][],
): { blink_per_min: number[]; gaze_avg_sec: number[] } {
  const measuredIn = (a: number, b: number) =>
    measured ? measured.reduce((sum, [x, y]) => sum + Math.max(0, Math.min(y, b) - Math.max(x, a)), 0) : b - a;
  const windows = starts
    .map((s, i) => [s, i + 1 < starts.length ? starts[i + 1] : end] as const)
    .filter(([a, b]) => b > a);
  return {
    blink_per_min: windows.map(([a, b]) => {
      const sec = measuredIn(a, b);
      return sec > 0 ? round1(blinks.filter((x) => x.start >= a && x.start < b).length / (sec / 60)) : 0;
    }),
    gaze_avg_sec: windows.map(([a, b]) => {
      const lens = gaze
        .filter((g) => g.type === 'fixation')
        .map((g) => Math.min(g.end, b) - Math.max(g.start, a))
        .filter((d) => d > 0);
      return lens.length ? round1(lens.reduce((x, y) => x + y, 0) / lens.length) : 0;
    }),
  };
}
