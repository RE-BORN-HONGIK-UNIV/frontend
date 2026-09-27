import { describe, expect, it } from 'vitest';
import {
  computeExpressionSeriesBatch,
  detectExpressionSegmentsBatch,
  summarizeExpression,
} from './expression';

// backend/tests/test_expression_analyzer.py의 픽스처를 그대로 옮김 — 기댓값을
// 다시 계산하지 말고, 여기서 수치가 안 맞으면 포팅 코드 쪽을 고칠 것.

describe('computeExpressionSeriesBatch (backend compute_expression_series 포팅)', () => {
  it('jawOpen이 게이트를 넘고 미소 점수가 고득점 예외 미만이면 게이팅으로 0점 처리', () => {
    const frames: [number, Record<string, number> | null][] = [
      [0.0, { mouthSmileLeft: 0.3, mouthSmileRight: 0.3, jawOpen: 0.2 }],
    ];
    const series = computeExpressionSeriesBatch(frames);
    expect(series[0][1]).toBe(0.0);
  });

  it('원본 미소 점수가 확실히 높으면(>=0.5) jawOpen과 무관하게 통과', () => {
    const frames: [number, Record<string, number> | null][] = [
      [0.0, { mouthSmileLeft: 0.6, mouthSmileRight: 0.6, jawOpen: 0.3 }],
    ];
    const series = computeExpressionSeriesBatch(frames);
    expect(series[0][1]).toBe(0.6);
  });

  it('jawOpen이 게이트 이하면 미소 점수를 그대로 유지', () => {
    const frames: [number, Record<string, number> | null][] = [
      [0.0, { mouthSmileLeft: 0.2, mouthSmileRight: 0.2, jawOpen: 0.01 }],
    ];
    const series = computeExpressionSeriesBatch(frames);
    expect(series[0][1]).toBe(0.2);
  });

  it('eyeSquint(AU7)는 긴장 점수에 영향 없음(browDown만 반영)', () => {
    const frames: [number, Record<string, number> | null][] = [
      [
        0.0,
        {
          browDownLeft: 0.005,
          browDownRight: 0.005,
          eyeSquintLeft: 0.37,
          eyeSquintRight: 0.37,
        },
      ],
    ];
    const series = computeExpressionSeriesBatch(frames);
    expect(series[0][2]).toBe(0.005);
  });

  it('긴장 점수는 browDown 단독으로 계산된다', () => {
    const frames: [number, Record<string, number> | null][] = [
      [0.0, { browDownLeft: 0.45, browDownRight: 0.45 }],
    ];
    const series = computeExpressionSeriesBatch(frames);
    expect(series[0][2]).toBe(0.45);
  });

  it('baselineTension을 넘기면 절대값이 아니라 편차로 계산된다', () => {
    const frames: [number, Record<string, number> | null][] = [
      [0.0, { browDownLeft: 0.3, browDownRight: 0.3 }],
    ];
    const series = computeExpressionSeriesBatch(frames, 0.25);
    expect(series[0][2]).toBeCloseTo(0.05, 4);
  });

  it('baselineTension을 안 넘기면 기본값 0으로 절대값 그대로 동작', () => {
    const frames: [number, Record<string, number> | null][] = [
      [0.0, { browDownLeft: 0.3, browDownRight: 0.3 }],
    ];
    const series = computeExpressionSeriesBatch(frames);
    expect(series[0][2]).toBe(0.3);
  });
});

describe('summarizeExpression (backend summarize_expression 포팅)', () => {
  it('빈 시리즈(얼굴 미검출)는 전부 0', () => {
    const result = summarizeExpression([[0.0, null, null]]);
    expect(result).toEqual({ smileRatio: 0.0, tensionRatio: 0.0, frameCount: 0 });
  });

  it('임계값 넘긴 프레임 비율을 계산한다', () => {
    const series: [number, number | null, number | null][] = [
      [0.0, 0.5, 0.1], // smile hit (>=0.35)
      [0.1, 0.1, 0.5], // tension hit (>=0.4)
      [0.2, 0.1, 0.1], // neither
      [0.3, 0.4, 0.0], // smile hit
    ];
    const result = summarizeExpression(series);
    expect(result.frameCount).toBe(4);
    expect(result.smileRatio).toBe(0.5);
    expect(result.tensionRatio).toBe(0.25);
  });
});

describe('detectExpressionSegmentsBatch (backend detect_expression_segments 포팅)', () => {
  it('짧은 neutral blip은 흡수된다', () => {
    const series: [number, number | null, number][] = [
      [0.0, 0.5, 0.0],
      [0.1, 0.5, 0.0],
      [0.15, 0.0, 0.0], // 0.05s짜리 neutral blip -> min_segment_sec(0.3)보다 짧아서 흡수됨
      [0.2, 0.5, 0.0],
      [0.6, 0.5, 0.0],
    ];
    const segments = detectExpressionSegmentsBatch(series, 0.3);
    expect(segments).toHaveLength(1);
    expect(segments[0].type).toBe('smile');
    expect(segments[0].start).toBe(0.0);
    expect(segments[0].end).toBe(0.6);
  });
});
