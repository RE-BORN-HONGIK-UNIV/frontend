import { describe, expect, it } from 'vitest';
import {
  detectSegmentsBatch,
  mergeShortSegmentsBatch,
  rawSegmentsBatch,
  type Segment,
} from './segmentBuffer';

// backend _merge_short_segments에 대응하는 pytest 픽스처는 없어서(원본도
// 테스트가 없음), 소스 로직 자체(mergeShortSegmentsBatch, backend 함수의 1:1
// 포팅)를 "정답"으로 두고, 실시간용으로 재구성한 지연 버퍼 스트리밍
// (detectSegmentsBatch)이 매 케이스마다 똑같은 결과를 내는지 동등성 검증.

function expandFrames(spec: [number, number, string][], step = 0.1): [number, string][] {
  // spec: [start, end, type][] — 각 구간을 step 간격 프레임으로 펼침(마지막 프레임 포함)
  const frames: [number, string][] = [];
  for (const [start, end, type] of spec) {
    for (let t = start; t < end - 1e-9; t += step) {
      frames.push([Math.round(t * 100) / 100, type]);
    }
  }
  return frames;
}

function assertEquivalent(frames: [number, string][], minSegmentSec = 0.3) {
  const viaBatchMerge = mergeShortSegmentsBatch(rawSegmentsBatch(frames), minSegmentSec);
  const viaStreaming = detectSegmentsBatch(frames, minSegmentSec);
  expect(viaStreaming).toEqual(viaBatchMerge);
  return viaStreaming;
}

describe('segmentBuffer 스트리밍(지연 버퍼)과 배치(mergeShortSegmentsBatch) 동등성', () => {
  it('짧은 반대 타입 blip은 흡수되고 원래 구간만 남는다', () => {
    const frames = expandFrames([
      [0, 1, 'A'],
      [1, 1.05, 'B'], // 0.05s < 0.3 → 흡수
      [1.05, 3, 'A'],
    ]);
    const result = assertEquivalent(frames);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject<Partial<Segment>>({ type: 'A', start: 0 });
  });

  it('min_segment_sec 이상 버틴 구간은 진짜 구간으로 확정된다', () => {
    const frames = expandFrames([
      [0, 1, 'A'],
      [1, 1.5, 'B'], // 0.5s >= 0.3 → 확정
      [1.5, 3, 'A'],
    ]);
    const result = assertEquivalent(frames);
    expect(result.map((s) => s.type)).toEqual(['A', 'B', 'A']);
  });

  it('스트림이 끝날 때 매듭 안 지어진 짧은 꼬리 구간도 흡수된다', () => {
    const frames = expandFrames([
      [0, 3, 'A'],
      [3, 3.1, 'B'], // 0.1s, 스트림이 바로 끝나서 확정될 기회가 없음
    ]);
    const result = assertEquivalent(frames);
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('A');
  });

  it('연속으로 여러 번 짧게 흔들려도(hysteresis) 하나로 합쳐진다', () => {
    const frames = expandFrames([
      [0, 1, 'A'],
      [1, 1.05, 'B'],
      [1.05, 1.1, 'A'],
      [1.1, 1.15, 'B'],
      [1.15, 3, 'A'],
    ]);
    const result = assertEquivalent(frames);
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('A');
  });

  it('빈 프레임 시퀀스는 빈 결과', () => {
    expect(detectSegmentsBatch([])).toEqual([]);
  });
});
