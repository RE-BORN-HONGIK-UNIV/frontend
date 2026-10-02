import { describe, expect, it } from 'vitest';
import type { GazeBlinkLatest, Stage1Latest } from '@/lib/api/types';
import { parseServerTime, resolveStage1Progress, resolveStage2Progress } from './stageProgress';

const S1: Stage1Latest = {
  at: '2026-10-02T01:11:04.523876',
  stability: 90, fluency: 60, pauseCtrl: 100, continuity: 70, calm: 80,
  overallScore: 79.6,
};
const S2: GazeBlinkLatest = {
  at: '2026-10-02T02:00:00',
  blinkScore: 100, blinkStatus: '정상', gazeScore: 60,
  expressionScore: 50, expressionStatus: '보통',
  overallScore: 70,
};
const LOCAL_DONE = { done: true, score: 88, at: '2026-09-01T00:00:00.000Z' };
const LOCAL_NONE = { done: false, score: null, at: null };

describe('parseServerTime', () => {
  it('타임존 표시가 없으면 UTC로 보고 Z를 붙인다', () => {
    expect(parseServerTime('2026-10-02T01:11:04.523876')).toBe('2026-10-02T01:11:04.523876Z');
  });

  it('이미 Z나 오프셋이 있으면 그대로 둔다', () => {
    expect(parseServerTime('2026-10-02T01:11:04Z')).toBe('2026-10-02T01:11:04Z');
    expect(parseServerTime('2026-10-02T10:11:04+09:00')).toBe('2026-10-02T10:11:04+09:00');
  });

  it('붙인 결과가 정확히 UTC 시각으로 해석된다 (로컬 시간대와 무관)', () => {
    expect(new Date(parseServerTime('2026-10-02T01:11:04')).toISOString()).toBe('2026-10-02T01:11:04.000Z');
  });
});

describe('resolveStage1Progress', () => {
  it('서버에 기록이 있으면 완료이고 점수는 반올림해서 쓴다', () => {
    expect(resolveStage1Progress('success', S1, LOCAL_NONE)).toEqual({
      done: true, score: 80, at: '2026-10-02T01:11:04.523876Z',
    });
  });

  it('서버에 기록이 없으면, 브라우저에 완료 기록이 남아 있어도 미완료다 (3단계는 서버 점수를 쓰기 때문)', () => {
    expect(resolveStage1Progress('success', null, LOCAL_DONE)).toEqual(LOCAL_NONE);
  });

  it('조회 실패·진행 중이면 브라우저 기록으로 대신 보여준다', () => {
    expect(resolveStage1Progress('error', undefined, LOCAL_DONE)).toEqual(LOCAL_DONE);
    expect(resolveStage1Progress('pending', undefined, LOCAL_DONE)).toEqual(LOCAL_DONE);
  });
});

describe('resolveStage2Progress', () => {
  it('서버에 기록이 있으면 완료', () => {
    expect(resolveStage2Progress('success', S2)).toEqual({
      done: true, score: 70, at: '2026-10-02T02:00:00Z',
    });
  });

  it('기록 없음·조회 실패·진행 중은 모두 미완료', () => {
    const none = { done: false, score: null, at: null };
    expect(resolveStage2Progress('success', null)).toEqual(none);
    expect(resolveStage2Progress('error', undefined)).toEqual(none);
    expect(resolveStage2Progress('pending', undefined)).toEqual(none);
  });
});
