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
        <FinalReport writingIntro answeredCount={0} interview={<div>면접</div>} details={{}} />
      </MemoryRouter>,
    );
    expect(screen.getByText(/리포트/).closest('.rb-report-writing')).toBeTruthy();
    for (let i = 0; i < 6; i++) act(() => vi.advanceTimersByTime(700));
    expect(document.querySelector('.rb-report-writing')).toBeNull();
    // 대답 수가 0이면 '질문 0개에 대답' 대신
    expect(screen.getByText('실전 면접을 끝까지 마쳤어요')).toBeTruthy();
  });

  it('날짜에 요일과 시:분:초', () => {
    expect(reportDateTime(new Date(2026, 10, 7, 19, 54, 12))).toBe('2026년 11월 7일 (토) 19:54:12');
  });
});
