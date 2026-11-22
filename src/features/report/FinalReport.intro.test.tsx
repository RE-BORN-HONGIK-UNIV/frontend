import { act, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FinalReport, reportDateTime } from './FinalReport';

vi.mock('@/lib/api/client', () => ({
  api: { latestStage1: vi.fn(async () => ({ result: null })), latestGazeBlink: vi.fn(async () => ({ result: null })) },
}));

describe('최종 리포트 첫 화면', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('면접 직후엔 리포트를 쓰는 화면을 잠깐 보여 주고 리포트로 넘어간다', () => {
    render(
      <MemoryRouter>
        <FinalReport writingIntro interview={{ turns: [], sessionId: null, startedAt: 0, endedAt: 0 }} details={{}} />
      </MemoryRouter>,
    );
    expect(screen.getByText(/리포트/).closest('.rb-report-writing')).toBeTruthy();
    for (let i = 0; i < 6; i++) act(() => vi.advanceTimersByTime(700));
    expect(document.querySelector('.rb-report-writing')).toBeNull();
    // 면접을 마쳤으면 하루가 맨 위에서 맞아 준다
    expect(screen.getByText('수고했어요! 끝까지 해냈네요.')).toBeTruthy();
  });

  it('날짜에 요일과 시:분:초', () => {
    expect(reportDateTime(new Date(2026, 10, 7, 19, 54, 12))).toBe('2026년 11월 7일 (토) 19:54:12');
  });
});
