import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Dashboard from './Dashboard';
import { localProgress } from '@/features/progress/localProgress';
import { api } from '@/lib/api/client';

vi.mock('@/lib/api/client', () => ({
  api: { latestStage1: vi.fn(), latestGazeBlink: vi.fn(), listInterviewSessions: vi.fn() },
}));

const S1 = {
  at: '2026-10-02T01:11:04', stability: 90, fluency: 60, pauseCtrl: 100, continuity: 70, calm: 80, overallScore: 80,
};
const S2 = {
  at: '2026-10-02T02:00:00', blinkScore: 100, blinkStatus: '정상', gazeScore: 60,
  expressionScore: 50, expressionStatus: '보통', overallScore: 70,
};

type Sessions = Awaited<ReturnType<typeof api.listInterviewSessions>>['sessions'];

function server(s1: typeof S1 | null, s2: typeof S2 | null, sessions: Sessions = []) {
  vi.mocked(api.latestStage1).mockResolvedValue({ result: s1 });
  vi.mocked(api.latestGazeBlink).mockResolvedValue({ result: s2 });
  vi.mocked(api.listInterviewSessions).mockResolvedValue({ sessions });
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
    vi.mocked(api.listInterviewSessions).mockReset();
    vi.mocked(api.listInterviewSessions).mockResolvedValue({ sessions: [] });
  });

  it('서버에 기록이 없으면 완료 배지가 없고 2·3단계 카드는 잠겨 있다', async () => {
    server(null, null);
    renderDashboard();
    await waitFor(() => expect(api.latestGazeBlink).toHaveBeenCalled());
    expect(screen.queryByText('완료 ✓')).toBeNull();
    expect(screen.getAllByText('잠김').length).toBe(2);
    expect(screen.getByText('1단계를 마치면 열려요.')).toBeTruthy();
    expect(screen.getByText('1·2단계를 마치면 열려요.')).toBeTruthy();
  });

  it('1단계만 마치면 2단계는 열리고 3단계는 잠겨 있다', async () => {
    server(S1, null);
    renderDashboard();
    expect(await screen.findByText('목소리 대화를 마쳤어요. 언제든 다시 할 수 있어요.')).toBeTruthy();
    expect(screen.getAllByText('잠김').length).toBe(1);
    expect(screen.getByText('2단계를 마치면 열려요.')).toBeTruthy();
    expect(screen.getByText(/하루와 영상 통화하며 시선과 표정을/)).toBeTruthy();
  });

  it('서버에 2단계 기록이 있으면 2단계 카드가 완료로 표시된다(점수 없이)', async () => {
    server(null, S2);
    renderDashboard();
    expect(await screen.findByText('영상 통화를 마쳤어요. 언제든 다시 할 수 있어요.')).toBeTruthy();
    expect(screen.getAllByText('완료 ✓').length).toBe(1);
  });

  it('서버에 1·2단계 기록이 있고 면접까지 마치면 완료 배지가 세 개이고 모든 단계 완료 문구가 뜬다', async () => {
    server(S1, S2);
    localProgress.markStage3Done('practice');
    renderDashboard();
    expect(await screen.findByText('목소리 대화를 마쳤어요. 언제든 다시 할 수 있어요.')).toBeTruthy();
    expect(await screen.findByText('실전 면접을 마쳤어요. 언제든 다시 할 수 있어요.')).toBeTruthy();
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

  it('서버에 끝까지 마친 면접이 있으면 3단계가 완료로 표시된다(면접관 이름 없이) (브라우저 기록 없이도)', async () => {
    server(S1, S2, [
      { id: 2, tier: 'warmup', startedAt: '2026-10-03T01:00:00', completedAt: null, turnCount: 1 },       // 중간에 나간 최신 면접
      { id: 1, tier: 'practice', startedAt: '2026-10-02T01:00:00', completedAt: '2026-10-02T01:10:00', turnCount: 5 },
    ]);
    renderDashboard();
    expect(await screen.findByText('실전 면접을 마쳤어요. 언제든 다시 할 수 있어요.')).toBeTruthy(); // 최신이지만 미완료인 건 건너뛰고 완료 건 사용
  });

  it('서버에 면접 기록이 있어도 모두 중간에 나간 것이면 3단계는 완료가 아니다', async () => {
    server(S1, S2, [{ id: 1, tier: 'standard', startedAt: '2026-10-02T01:00:00', completedAt: null, turnCount: 2 }]);
    renderDashboard();
    await waitFor(() => expect(api.listInterviewSessions).toHaveBeenCalled());
    await waitFor(() => expect(screen.getAllByText('완료 ✓').length).toBe(2)); // 1·2단계만
    expect(screen.queryByText(/모의 면접 완료/)).toBeNull();
  });

  it('서버엔 면접 기록이 없어도 브라우저에 완료 메모가 있으면 3단계는 완료로 유지된다 (이전 면접 사용자 보호)', async () => {
    server(S1, S2, []);
    localProgress.markStage3Done('standard');
    renderDashboard();
    expect(await screen.findByText('실전 면접을 마쳤어요. 언제든 다시 할 수 있어요.')).toBeTruthy();
  });

  it('서버 조회가 실패하면 브라우저의 1단계 완료 기록으로 대신 보여준다', async () => {
    vi.mocked(api.latestStage1).mockRejectedValue(new Error('network'));
    vi.mocked(api.latestGazeBlink).mockRejectedValue(new Error('network'));
    localProgress.markStage1Done(88);
    renderDashboard();
    expect(await screen.findByText('목소리 대화를 마쳤어요. 언제든 다시 할 수 있어요.')).toBeTruthy();
  });

  it('서버 조회가 실패하면 2단계도 브라우저의 완료 메모로 대신 보여준다', async () => {
    vi.mocked(api.latestStage1).mockRejectedValue(new Error('network'));
    vi.mocked(api.latestGazeBlink).mockRejectedValue(new Error('network'));
    localProgress.markStage2Done(66);
    renderDashboard();
    expect(await screen.findByText('영상 통화를 마쳤어요. 언제든 다시 할 수 있어요.')).toBeTruthy();
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
