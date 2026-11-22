import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { api } from '@/lib/api/client';
import ReportPage, { SampleReportPage } from './ReportPage';

vi.mock('@/lib/api/client', () => ({
  api: {
    listInterviewSessions: vi.fn(async () => ({ sessions: [] })),
    getInterviewSession: vi.fn(),
    latestStage1: vi.fn(async () => ({ result: null })),
    latestGazeBlink: vi.fn(async () => ({ result: null })),
    createCoachNote: vi.fn(),
    deleteInterviewSession: vi.fn(),
  },
}));

describe('최종 리포트 화면', () => {
  it('예시 리포트는 예시라고 먼저 밝히고, 서버·AI를 부르지 않는다', () => {
    render(
      <MemoryRouter>
        <SampleReportPage />
      </MemoryRouter>,
    );
    expect(screen.getByText('예시 화면이에요.')).toBeTruthy();
    // 시선과 표정은 2단계와 실전 면접을 나란히, 실전 면접 질문은 넘겨 보기
    expect(screen.getByText('실전 면접에서는 조금 덜 깜빡였어요.')).toBeTruthy();
    expect(screen.getByRole('tab', { name: '질문 2' })).toBeTruthy();
    expect(api.createCoachNote).not.toHaveBeenCalled();
    expect(api.latestStage1).not.toHaveBeenCalled();
  });

  it('다시 보기: 기록이 하나도 없으면 단계마다 하러 가는 길을 보여 준다', async () => {
    localStorage.clear();
    render(
      <MemoryRouter>
        <ReportPage />
      </MemoryRouter>,
    );
    expect(await screen.findByText('끝까지 마친 3단계 면접 기록이 아직 없어요.')).toBeTruthy();
    expect(await screen.findByText('1단계 하러 가기 →')).toBeTruthy();
    expect(screen.getByText('2단계 하러 가기 →')).toBeTruthy();
  });
});
