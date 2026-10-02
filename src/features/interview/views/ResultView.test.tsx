import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ResultView } from './ResultView';
import { api } from '@/lib/api/client';
import type { InterviewResult } from '../resultSummary';

vi.mock('@/lib/api/client', () => ({ api: { deleteInterviewSession: vi.fn() } }));

const RESULT: InterviewResult = {
  turns: [
    { kind: 'main', question: '자기소개 부탁드려요', answer: '안녕하세요, 저는 연습 중이에요.' },
    { kind: 'follow_up', question: '조금 더 설명해주실 수 있을까요?', answer: '' },
    { kind: 'main', question: '강점은 무엇인가요?', answer: '꾸준함이에요.' },
  ],
  sessionId: 42,
  startedAt: 0,
  endedAt: 7 * 60_000,
};

function renderView(over: Partial<InterviewResult> = {}, onRetry = vi.fn()) {
  render(
    <MemoryRouter initialEntries={['/interview']}>
      <Routes>
        <Route path="/interview" element={<ResultView result={{ ...RESULT, ...over }} tier="practice" onRetry={onRetry} />} />
        <Route path="/dashboard" element={<div>DASHBOARD_PAGE</div>} />
      </Routes>
    </MemoryRouter>,
  );
  return { onRetry };
}

describe('ResultView', () => {
  beforeEach(() => {
    vi.mocked(api.deleteInterviewSession).mockReset();
    vi.restoreAllMocks();
  });

  it('요약(질문·답변 수, 소요 시간)과 질문·답변 목록을 보여준다 (점수나 평가는 없음)', () => {
    renderView();
    expect(screen.getByText('질문 3개')).toBeTruthy();
    expect(screen.getByText('답변 2개')).toBeTruthy();
    expect(screen.getByText('약 7분')).toBeTruthy();
    expect(screen.getByText('자기소개 부탁드려요')).toBeTruthy();
    expect(screen.getByText('안녕하세요, 저는 연습 중이에요.')).toBeTruthy();
    expect(screen.getAllByText('기본 질문').length).toBe(2);
    expect(screen.getByText('꼬리질문')).toBeTruthy();
    expect(screen.queryByText(/점수|등급|평가/)).toBeNull();
  });

  it('답변을 남기지 못한 질문은 담담한 안내 문구로 표시하고, 격려 문구는 "끝까지 해낸 것" 위주다', () => {
    renderView();
    expect(screen.getByText('이 질문은 답변을 남기지 못했어요.')).toBeTruthy();
    expect(screen.getByText(/모든 질문에 답하지 못했어도 괜찮아요/)).toBeTruthy();
  });

  it('모든 질문에 답했으면 그 사실을 알려준다', () => {
    renderView({ turns: RESULT.turns.filter((t) => t.answer) });
    expect(screen.getByText(/2개의 질문에 끝까지 답했어요/)).toBeTruthy();
  });

  it('서버에 저장되지 않은 면접이면 그 사실을 알리고 삭제 버튼을 숨긴다', () => {
    renderView({ sessionId: null });
    expect(screen.getByText(/기록이 저장되지 않았어요/)).toBeTruthy();
    expect(screen.queryByText('이 면접 기록 삭제')).toBeNull();
    expect(screen.getByText('자기소개 부탁드려요')).toBeTruthy(); // 내용은 그대로 볼 수 있음
  });

  it('삭제를 확인하면 서버에 삭제를 요청하고, 화면에서도 질문·답변을 치운다', async () => {
    vi.mocked(api.deleteInterviewSession).mockResolvedValue({ message: 'ok' });
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    renderView();
    fireEvent.click(screen.getByText('이 면접 기록 삭제'));
    expect(await screen.findByText(/면접 기록을 삭제했어요/)).toBeTruthy();
    expect(api.deleteInterviewSession).toHaveBeenCalledWith(42);
    expect(screen.queryByText('안녕하세요, 저는 연습 중이에요.')).toBeNull();
    expect(screen.queryByText('이 면접 기록 삭제')).toBeNull();
  });

  it('삭제 확인 창에서 취소하면 아무 것도 지우지 않는다', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    renderView();
    fireEvent.click(screen.getByText('이 면접 기록 삭제'));
    expect(api.deleteInterviewSession).not.toHaveBeenCalled();
    expect(screen.getByText('안녕하세요, 저는 연습 중이에요.')).toBeTruthy();
  });

  it('삭제가 실패하면 안내만 하고 내용은 그대로 둔다 (서버엔 아직 남아 있으므로)', async () => {
    vi.mocked(api.deleteInterviewSession).mockRejectedValue(new Error('500'));
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    renderView();
    fireEvent.click(screen.getByText('이 면접 기록 삭제'));
    expect(await screen.findByText(/삭제하지 못했어요/)).toBeTruthy();
    expect(screen.getByText('안녕하세요, 저는 연습 중이에요.')).toBeTruthy();
    await waitFor(() => expect(screen.getByText('이 면접 기록 삭제')).toBeTruthy()); // 다시 시도 가능
  });

  it('"대시보드로"는 /dashboard로 이동하고, "한 번 더 연습하기"는 onRetry를 호출한다', () => {
    const { onRetry } = renderView();
    fireEvent.click(screen.getByText('한 번 더 연습하기'));
    expect(onRetry).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByText('대시보드로'));
    expect(screen.getByText('DASHBOARD_PAGE')).toBeTruthy();
  });
});
