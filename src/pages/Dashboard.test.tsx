import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Dashboard from './Dashboard';
import { localProgress } from '@/features/progress/localProgress';
import { api } from '@/lib/api/client';

vi.mock('@/lib/api/client', () => ({
  api: { latestStage1: vi.fn(), latestGazeBlink: vi.fn() },
}));

const S1 = {
  at: '2026-10-02T01:11:04', stability: 90, fluency: 60, pauseCtrl: 100, continuity: 70, calm: 80, overallScore: 80,
};
const S2 = {
  at: '2026-10-02T02:00:00', blinkScore: 100, blinkStatus: '정상', gazeScore: 60,
  expressionScore: 50, expressionStatus: '보통', overallScore: 70,
};

function server(s1: typeof S1 | null, s2: typeof S2 | null) {
  vi.mocked(api.latestStage1).mockResolvedValue({ result: s1 });
  vi.mocked(api.latestGazeBlink).mockResolvedValue({ result: s2 });
}

function renderDashboard() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('Dashboard 단계 진행 표시', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.mocked(api.latestStage1).mockReset();
    vi.mocked(api.latestGazeBlink).mockReset();
  });

  it('서버에 기록이 없으면 완료 배지가 없고 3단계 카드는 열려 있다', async () => {
    server(null, null);
    renderDashboard();
    await waitFor(() => expect(api.latestGazeBlink).toHaveBeenCalled());
    expect(screen.queryByText('완료 ✓')).toBeNull();
    expect(screen.queryByText('준비 중')).toBeNull();
    expect(screen.getByText(/맞춤형 난이도의 모의 면접을 진행합니다/)).toBeTruthy();
  });

  it('서버에 2단계 기록이 있으면 2단계 카드가 점수와 함께 완료로 표시된다', async () => {
    server(null, S2);
    renderDashboard();
    expect(await screen.findByText('표정·시선 분석 완료 · 종합 점수 70점')).toBeTruthy();
    expect(screen.getAllByText('완료 ✓').length).toBe(1);
  });

  it('서버에 1·2단계 기록이 있고 면접까지 마치면 완료 배지가 세 개이고 모든 단계 완료 문구가 뜬다', async () => {
    server(S1, S2);
    localProgress.markStage3Done('practice');
    renderDashboard();
    expect(await screen.findByText('음성 분석 완료 · 종합 점수 80점')).toBeTruthy();
    expect(await screen.findByText('모의 면접 완료 · 서진 면접관')).toBeTruthy();
    expect(screen.getAllByText('완료 ✓').length).toBe(3);
    expect(screen.getByText('모든 단계를 완료했어요! 정말 잘하셨어요 🎉')).toBeTruthy();
  });

  it('브라우저에만 1단계 완료 기록이 있고 서버엔 없으면 미완료로 표시한다 (3단계가 쓰는 서버 점수와 일치)', async () => {
    server(null, null);
    localProgress.markStage1Done(88);
    renderDashboard();
    await waitFor(() => expect(api.latestStage1).toHaveBeenCalled());
    await waitFor(() => expect(screen.queryByText('완료 ✓')).toBeNull());
  });

  it('서버 조회가 실패하면 브라우저의 1단계 완료 기록으로 대신 보여준다', async () => {
    vi.mocked(api.latestStage1).mockRejectedValue(new Error('network'));
    vi.mocked(api.latestGazeBlink).mockRejectedValue(new Error('network'));
    localProgress.markStage1Done(88);
    renderDashboard();
    expect(await screen.findByText('음성 분석 완료 · 종합 점수 88점')).toBeTruthy();
  });

  it('서버 조회가 실패하면 2단계도 브라우저의 완료 메모로 대신 보여준다', async () => {
    vi.mocked(api.latestStage1).mockRejectedValue(new Error('network'));
    vi.mocked(api.latestGazeBlink).mockRejectedValue(new Error('network'));
    localProgress.markStage2Done(66);
    renderDashboard();
    expect(await screen.findByText('표정·시선 분석 완료 · 종합 점수 66점')).toBeTruthy();
  });

  it('서버 조회가 실패했고 브라우저 메모도 없으면 2단계는 미완료다', async () => {
    vi.mocked(api.latestStage1).mockRejectedValue(new Error('network'));
    vi.mocked(api.latestGazeBlink).mockRejectedValue(new Error('network'));
    renderDashboard();
    await waitFor(() => expect(api.latestGazeBlink).toHaveBeenCalled());
    expect(screen.queryByText(/표정·시선 분석 완료/)).toBeNull();
  });

  it('서버에 2단계 기록이 없으면 브라우저 메모가 있어도 미완료다', async () => {
    server(null, null);
    localProgress.markStage2Done(66);
    renderDashboard();
    await waitFor(() => expect(api.latestGazeBlink).toHaveBeenCalled());
    await waitFor(() => expect(screen.queryByText(/표정·시선 분석 완료/)).toBeNull());
  });
});
