import { describe, expect, it } from 'vitest';
import { buildHistory, formatHistoryDate, nextStep } from './history';

describe('마이페이지 지난 기록', () => {
  it('1·2단계 최근 기록과 끝까지 마친 면접을 최근 순으로, 점수 없이', () => {
    const items = buildHistory('2026-11-05T10:00:00Z', '2026-11-06T10:00:00Z', [
      { id: 7, tier: 'standard', startedAt: '2026-11-07T09:00:00', completedAt: '2026-11-07T09:10:00', turnCount: 6 },
      { id: 8, tier: 'standard', startedAt: '2026-11-07T11:00:00', completedAt: null, turnCount: 2 },
    ]);
    expect(items.map((i) => i.title)).toEqual(['3단계 실전 면접', '2단계 영상 통화', '1단계 목소리 대화']);
    expect(items[0].to).toBe('/report?session=7');
    expect(items.some((i) => /점/.test(i.detail))).toBe(false);
  });

  it('기록이 없으면 빈 목록', () => {
    expect(buildHistory(null, null, [])).toEqual([]);
  });

  it('날짜: 오늘·어제·월일', () => {
    const now = new Date(2026, 10, 7, 15);
    expect(formatHistoryDate(new Date(2026, 10, 7, 9).toISOString(), now)).toBe('오늘');
    expect(formatHistoryDate(new Date(2026, 10, 6, 23).toISOString(), now)).toBe('어제');
    expect(formatHistoryDate(new Date(2026, 10, 1, 9).toISOString(), now)).toBe('11월 1일');
  });
});

describe('이어서 하기', () => {
  it('아직 안 한 가장 앞 단계로, 다 했으면 리포트', () => {
    expect(nextStep(false, false, false).to).toBe('/voice');
    expect(nextStep(true, false, false).to).toBe('/face');
    expect(nextStep(true, true, false).to).toBe('/interview');
    expect(nextStep(true, true, true).to).toBe('/report');
  });
});
