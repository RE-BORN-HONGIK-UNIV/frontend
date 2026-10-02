import { describe, expect, it } from 'vitest';
import type { GazeBlinkResult } from '@/lib/api/types';
import { buildLiveSavePayload } from './savePayload';

const RESULT: GazeBlinkResult = {
  blink: { rate_per_min: 18, status: '정상', score: 100, events: [{ start: 1, end: 1.2 }], highlight: null },
  gaze: {
    avg_fixation_sec: 3.6,
    score: 74,
    segments: [{ type: 'fixation', start: 0, end: 5 }],
    highlight: null,
  },
  expression: {
    smile_score: 45,
    tension_score: 30,
    score: 68,
    status: '보통',
    smile_ratio: 0.12,
    tension_ratio: 0.08,
    frame_count: 900,
    segments: [{ type: 'smile', start: 0, end: 2 }],
    highlight: null,
  },
  previous: null,
};

describe('buildLiveSavePayload', () => {
  it('서버 Stage2Result 컬럼에 대응하는 숫자 요약만 담는다', () => {
    expect(buildLiveSavePayload(RESULT)).toEqual({
      blinkRatePerMin: 18,
      blinkStatus: '정상',
      blinkScore: 100,
      avgFixationSec: 3.6,
      gazeScore: 74,
      smileRatio: 0.12,
      tensionRatio: 0.08,
      expressionScore: 68,
      expressionStatus: '보통',
    });
  });

  it('이벤트·구간·하이라이트 같은 원본에 가까운 데이터는 포함하지 않는다', () => {
    const keys = Object.keys(buildLiveSavePayload(RESULT));
    expect(keys).not.toContain('events');
    expect(keys).not.toContain('segments');
    expect(keys).not.toContain('highlight');
  });
});
