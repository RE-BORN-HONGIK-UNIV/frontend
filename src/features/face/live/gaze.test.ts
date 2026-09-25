import { describe, expect, it } from 'vitest';
import { createGazeFsmState, detectGazeSegmentsBatch, flushGaze, smoothGaze, stepGaze } from './gaze';

describe('smoothGaze (backend _smooth 포팅)', () => {
  it('이전 값이 없으면 새 값을 그대로 쓴다', () => {
    const next = { yaw: 10, pitch: 5, ox: 0.1, oy: -0.1 };
    expect(smoothGaze(null, next)).toEqual(next);
  });

  it('alpha만큼 새 값 쪽으로 섞는다', () => {
    const prev = { yaw: 0, pitch: 0, ox: 0, oy: 0 };
    const next = { yaw: 10, pitch: 0, ox: 0, oy: 0 };
    const smoothed = smoothGaze(prev, next, 0.3);
    expect(smoothed.yaw).toBeCloseTo(3, 5); // 0.3*10 + 0.7*0
  });
});

describe('stepGaze / detectGazeSegmentsBatch', () => {
  it('얼굴 미검출(raw=null) 프레임은 무조건 aversion으로 취급한다', () => {
    const series: [number, { yaw: number; pitch: number; ox: number; oy: number } | null][] = [
      [0, null], [0.1, null], [0.2, null], [0.3, null],
    ];
    const segments = detectGazeSegmentsBatch(series, 0, 0, 1);
    expect(segments).toHaveLength(1);
    expect(segments[0].type).toBe('aversion');
  });

  it('정면 → 큰 각도 회피(충분히 오래) → 정면, smoothingAlpha=1(스무딩 없음)로 결정론적 검증', () => {
    const series: [number, { yaw: number; pitch: number; ox: number; oy: number } | null][] = [];
    for (let t = 0; t <= 1.0 + 1e-9; t += 0.1) {
      series.push([Math.round(t * 10) / 10, { yaw: 0, pitch: 0, ox: 0, oy: 0 }]);
    }
    for (let t = 1.1; t <= 2.0 + 1e-9; t += 0.1) {
      series.push([Math.round(t * 10) / 10, { yaw: 20, pitch: 0, ox: 0, oy: 0 }]);
    }
    for (let t = 2.1; t <= 3.0 + 1e-9; t += 0.1) {
      series.push([Math.round(t * 10) / 10, { yaw: 0, pitch: 0, ox: 0, oy: 0 }]);
    }

    const segments = detectGazeSegmentsBatch(series, 0, 0, 1);
    expect(segments.map((s) => s.type)).toEqual(['fixation', 'aversion', 'fixation']);
  });

  it('baseline_yaw가 개인별 정면 기준을 이동시킨다', () => {
    const state = createGazeFsmState();
    // baseline_yaw=20인 사람에게 yaw=25(차이 5)는 정면
    const seg1 = stepGaze(state, 0, { yaw: 25, pitch: 0, ox: 0, oy: 0 }, 20, 0, 1);
    expect(seg1).toBeNull(); // 아직 구간 시작만, 확정된 건 없음
    const flushed = flushGaze(state);
    expect(flushed?.type).toBe('fixation');
  });
});
