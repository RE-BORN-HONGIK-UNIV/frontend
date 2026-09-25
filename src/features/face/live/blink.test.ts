import { describe, expect, it } from 'vitest';
import { detectBlinksEarBatch, detectBlinksFromBlendshapeBatch, eyeAspectRatio } from './blink';

// backend/tests/test_blink_analyzer.py의 픽스처를 그대로 옮김 — 기댓값을 다시
// 계산하지 말고, 여기서 수치가 안 맞으면 포팅 코드 쪽을 고칠 것.

describe('detectBlinksEarBatch (backend detect_blinks 포팅)', () => {
  it('threshold 아래로 떨어진 구간을 깜빡임으로 찾는다', () => {
    const baseline = 0.3; // threshold = 0.3 * 0.7 = 0.21
    const series: [number, number | null][] = [
      [0.0, 0.3], [0.1, 0.3], [0.2, 0.1],
      [0.3, 0.1], [0.4, 0.3], [0.5, 0.3],
    ];
    const blinks = detectBlinksEarBatch(series, baseline);
    expect(blinks).toEqual([{ start: 0.2, end: 0.4 }]);
  });

  it('min_blink_duration(0.08초)보다 짧은 딥은 무시한다', () => {
    const baseline = 0.3;
    const series: [number, number | null][] = [
      [0.0, 0.3], [0.05, 0.1], [0.1, 0.3],
    ]; // dip 0.05s < 0.08
    expect(detectBlinksEarBatch(series, baseline)).toEqual([]);
  });

  it('null(얼굴 미검출) 프레임은 건너뛴다', () => {
    const baseline = 0.3;
    const series: [number, number | null][] = [
      [0.0, 0.3], [0.1, null], [0.2, 0.1], [0.3, 0.3],
    ];
    expect(detectBlinksEarBatch(series, baseline)).toHaveLength(1);
  });
});

describe('detectBlinksFromBlendshapeBatch (backend detect_blinks_from_blendshape 포팅)', () => {
  it('threshold 이상으로 올라간 구간을 깜빡임으로 찾는다', () => {
    const series: [number, number | null][] = [
      [0.0, 0.1], [0.1, 0.1], [0.2, 0.8], [0.3, 0.8], [0.4, 0.1], [0.5, 0.1],
    ];
    const blinks = detectBlinksFromBlendshapeBatch(series);
    expect(blinks).toEqual([{ start: 0.2, end: 0.4 }]);
  });
});

describe('eyeAspectRatio', () => {
  it('완전히 뜬 눈(세로/가로 비율이 큰 형태)은 EAR이 크다', () => {
    // outer, top1, top2, inner, bottom1, bottom2 — 세로로 벌어진 육각형
    const openEye = [
      { x: 0, y: 0.5 }, { x: 0.3, y: 0.1 }, { x: 0.7, y: 0.1 },
      { x: 1, y: 0.5 }, { x: 0.7, y: 0.9 }, { x: 0.3, y: 0.9 },
    ];
    const closedEye = [
      { x: 0, y: 0.5 }, { x: 0.3, y: 0.48 }, { x: 0.7, y: 0.48 },
      { x: 1, y: 0.5 }, { x: 0.7, y: 0.52 }, { x: 0.3, y: 0.52 },
    ];
    expect(eyeAspectRatio(openEye)).toBeGreaterThan(eyeAspectRatio(closedEye));
  });
});
