import { describe, expect, it } from 'vitest';
import { createAccumulator, faceVisibleRatio, finishAccumulator, stepAccumulator, type MeasureFrame } from './measure';

const BASE = { yaw: 0, pitch: 0 };
const looking: MeasureFrame = { blendshapes: {}, gazeRaw: { yaw: 0, pitch: 0, ox: 0, oy: 0 } };
const away: MeasureFrame = { blendshapes: {}, gazeRaw: { yaw: 30, pitch: 0, ox: 0, oy: 0 } };
const noFace: MeasureFrame = { blendshapes: null, gazeRaw: null };

/** fps 프레임으로 [from, to) 구간을 같은 프레임으로 흘려보낸다 */
function run(acc: ReturnType<typeof createAccumulator>, from: number, to: number, frame: MeasureFrame, measuring: boolean, fps = 10) {
  for (let i = Math.round(from * fps); i < Math.round(to * fps); i++) stepAccumulator(acc, i / fps, frame, BASE, measuring);
}

describe('측정 누적 — 2단계: 사용자가 대답하는 동안만 잰다', () => {
  it('하루가 말하는 동안(measuring=false) 다른 곳을 본 건 시선 회피에 들어가지 않는다', () => {
    const acc = createAccumulator();
    run(acc, 0, 5, away, false); // 하루가 질문 — 자막을 봄
    run(acc, 5, 10, looking, true); // 대답 — 하루를 봄
    run(acc, 10, 15, away, false); // 하루가 반응
    finishAccumulator(acc);
    const segs = acc.gazeFsm.segmentBuffer.committed;
    expect(segs.every((s) => s.type === 'fixation')).toBe(true);
    expect(segs[0].start).toBe(5);
    expect(acc.sec).toBeCloseTo(4.9, 5);
    expect(acc.intervals).toEqual([[5, 9.9]]);
  });

  it('멈춘 시간은 구간 길이와 잰 시간에 섞이지 않는다 (대답 두 번)', () => {
    const acc = createAccumulator();
    run(acc, 0, 3, looking, true);
    run(acc, 3, 20, away, false);
    run(acc, 20, 23, looking, true);
    finishAccumulator(acc);
    const segs = acc.gazeFsm.segmentBuffer.committed;
    expect(segs).toHaveLength(2);
    expect(segs.map((s) => s.end - s.start).every((d) => d < 3)).toBe(true);
    expect(acc.sec).toBeCloseTo(5.8, 5);
    expect(acc.intervals.length).toBe(2);
  });

  it('잰 프레임 중 얼굴이 잡힌 비율을 센다 (안 잰 프레임은 빼고)', () => {
    const acc = createAccumulator();
    run(acc, 0, 5, noFace, false); // 안 잼 — 비율에 안 들어감
    run(acc, 5, 8, looking, true);
    run(acc, 8, 9, noFace, true); // 대답 중 얼굴이 화면 밖으로
    expect(faceVisibleRatio(acc)).toBeCloseTo(0.75, 5);
    expect(faceVisibleRatio(createAccumulator())).toBeNull();
  });
});
