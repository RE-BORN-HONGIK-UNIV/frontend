import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ResultView } from './ResultView';
import { api } from '@/lib/api/client';
import type { CoachNote, CoachNoteResponse } from '@/lib/api/types';
import type { InterviewResult } from '../resultSummary';

vi.mock('@/lib/api/client', () => ({ api: { createCoachNote: vi.fn(), deleteInterviewSession: vi.fn() } }));

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

const NOTE: CoachNote = {
  greeting: '오늘도 끝까지 와줘서 고마워요.',
  won: ['꼬리질문에도 답해봤어요', '처음으로 3개 질문을 마쳤어요'],
  quote: { text: '꾸준함이 제 강점이에요', why: '강점을 한 단어로 또렷하게 말했어요' },
  recommended: 'daily_mission',
  cards: [
    { kind: 'again', title: '한 번 더 해보기', body: '한 번 더 이어가 봐요.' },
    { kind: 'light_practice', title: '가볍게 연습', body: '표정으로 몸을 풀어봐요.', path: '/face' },
    { kind: 'daily_mission', title: '현실로 한 걸음', body: '거울 앞에서 인사 한마디 해보기' },
    { kind: 'rest', title: '오늘은 여기까지', body: '쉬는 것도 연습의 일부예요.' },
  ],
  care: null,
};

const ok = (note: CoachNote = NOTE, source: CoachNoteResponse['source'] = 'llm'): CoachNoteResponse => ({ note, source });

function renderView(props: { result?: Partial<InterviewResult> } = {}, onRetry = vi.fn()) {
  render(
    <MemoryRouter initialEntries={['/interview']}>
      <Routes>
        <Route
          path="/interview"
          element={<ResultView result={{ ...RESULT, ...props.result }} tier="practice" onRetry={onRetry} />}
        />
        <Route path="/dashboard" element={<div>DASHBOARD_PAGE</div>} />
        <Route path="/face" element={<div>FACE_PAGE</div>} />
        <Route path="/voice" element={<div>VOICE_PAGE</div>} />
      </Routes>
    </MemoryRouter>,
  );
  return { onRetry };
}

describe('ResultView', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.mocked(api.createCoachNote).mockReset();
    vi.mocked(api.deleteInterviewSession).mockReset();
  });

  describe('코치 노트를 기다리는 동안', () => {
    it('화면을 막지 않고 사실만 말하는 기본 내용과 기본 카드를 먼저 보여준다', () => {
      vi.mocked(api.createCoachNote).mockReturnValue(new Promise(() => {})); // 아직 도착 안 함
      renderView();
      expect(screen.getByText('코치 노트를 쓰고 있어요…')).toBeTruthy();
      expect(screen.getByText(/면접을 끝까지 마쳤어요/)).toBeTruthy();
      expect(screen.getByText(/2개의 질문에 답했어요/)).toBeTruthy();
      expect(screen.getByText('한 번 더 해보기')).toBeTruthy();
      expect(screen.getByText('오늘은 여기까지')).toBeTruthy();
    });

    it('서버에 저장된 면접이면 코치 노트를 요청한다', () => {
      vi.mocked(api.createCoachNote).mockReturnValue(new Promise(() => {}));
      renderView();
      expect(api.createCoachNote).toHaveBeenCalledWith(42);
    });
  });

  describe('코치 노트가 도착하면', () => {
    beforeEach(() => vi.mocked(api.createCoachNote).mockResolvedValue(ok()));

    it('인사·해낸 것·내 말 인용·다음 한 걸음 카드로 채운다', async () => {
      renderView();
      expect(await screen.findByText('오늘도 끝까지 와줘서 고마워요.')).toBeTruthy();
      expect(screen.getByText(/꼬리질문에도 답해봤어요/)).toBeTruthy();
      expect(screen.getByText(/꾸준함이 제 강점이에요/)).toBeTruthy();
      expect(screen.getByText('강점을 한 단어로 또렷하게 말했어요')).toBeTruthy();
      expect(screen.getByText('현실로 한 걸음')).toBeTruthy();
      expect(screen.queryByText('코치 노트를 쓰고 있어요…')).toBeNull();
    });

    it('추천 카드에만 "추천" 표시가 붙고, 일상 미션 카드는 눌러서 이동하는 버튼이 아니다', async () => {
      renderView();
      await screen.findByText('현실로 한 걸음');
      expect(screen.getAllByText('추천').length).toBe(1);
      expect(screen.getByText('현실로 한 걸음').closest('button')).toBeNull();   // 읽는 카드
      expect(screen.getByText('한 번 더 해보기').closest('button')).not.toBeNull();
    });

    it('카드를 누르면 각각 다시 하기 / 가벼운 연습 화면 / 대시보드로 간다', async () => {
      const { onRetry } = renderView();
      await screen.findByText('현실로 한 걸음');
      fireEvent.click(screen.getByText('한 번 더 해보기'));
      expect(onRetry).toHaveBeenCalledTimes(1);
      fireEvent.click(screen.getByText('가볍게 연습'));
      expect(screen.getByText('FACE_PAGE')).toBeTruthy();   // 카드가 정한 경로로 이동
    });

    it('"오늘은 여기까지"는 다른 카드와 같은 무게의 선택지로 대시보드로 보낸다', async () => {
      renderView();
      await screen.findByText('현실로 한 걸음');
      fireEvent.click(screen.getByText('오늘은 여기까지'));
      expect(screen.getByText('DASHBOARD_PAGE')).toBeTruthy();
    });

    it('인용이 없는 노트면 인용 영역을 그리지 않는다', async () => {
      vi.mocked(api.createCoachNote).mockResolvedValue(ok({ ...NOTE, quote: null }));
      renderView();
      await screen.findByText('현실로 한 걸음');
      expect(screen.queryByText('내 말 중 좋았던 한 문장')).toBeNull();
    });

    it('점수·등급·순위 같은 평가 표현이 화면 어디에도 없다', async () => {
      renderView();
      await screen.findByText('현실로 한 걸음');
      expect(screen.queryByText(/점수|등급|순위|부족|평가/)).toBeNull();
    });
  });

  describe('코치 노트가 실패하거나 없는 경우', () => {
    it('요청이 실패해도 결과 화면은 그대로 쓸 수 있고, 안내만 한다', async () => {
      vi.mocked(api.createCoachNote).mockRejectedValue(new Error('500'));
      renderView();
      expect(await screen.findByText(/코치 노트를 불러오지 못했어요/)).toBeTruthy();
      expect(screen.getByText(/면접을 끝까지 마쳤어요/)).toBeTruthy();
      expect(screen.getByText('오늘은 여기까지')).toBeTruthy();
    });

    it('서버 저장이 안 됐으면(세션 없음) 노트를 요청하지 않고 그 사실을 알린다', () => {
      renderView({ result: { sessionId: null } });
      expect(api.createCoachNote).not.toHaveBeenCalled();
      expect(screen.getByText(/기록이 저장되지 않았어요/)).toBeTruthy();
      expect(screen.queryByText('이 면접 기록 삭제')).toBeNull();
      expect(screen.getByText('자기소개 부탁드려요')).toBeTruthy(); // 이 화면 안의 내용은 그대로 볼 수 있음
    });
  });

  describe('위기 신호가 감지된 노트', () => {
    const CARE: CoachNote = {
      greeting: '오늘 이야기해줘서 고마워요.',
      won: [],
      quote: null,
      recommended: 'rest',
      cards: [{ kind: 'rest', title: '오늘은 여기까지', body: '쉬어도 괜찮아요.' }],
      care: { body: '가까운 사람이나 전문 상담에 도움을 요청해 보세요.', resources: '팀이 확정한 안내 문구' },
    };

    it('코칭 대신 돌봄 안내와 쉬는 선택지만 보여준다 (해낸 것·인용·다른 카드 없음)', async () => {
      vi.mocked(api.createCoachNote).mockResolvedValue(ok(CARE, 'care'));
      renderView();
      expect(await screen.findByText(/전문 상담에 도움을 요청해 보세요/)).toBeTruthy();
      expect(screen.getByText('팀이 확정한 안내 문구')).toBeTruthy();
      expect(screen.queryByText('오늘 해낸 것')).toBeNull();
      expect(screen.queryByText('한 번 더 해보기')).toBeNull();
      expect(screen.getByText('오늘은 여기까지')).toBeTruthy();
    });

    it('안내 연락처가 비어 있으면 일반 안내만 보이고 빈 칸이 생기지 않는다', async () => {
      vi.mocked(api.createCoachNote).mockResolvedValue(ok({ ...CARE, care: { body: '도움을 요청해 보세요.', resources: '' } }, 'care'));
      renderView();
      expect(await screen.findByText('도움을 요청해 보세요.')).toBeTruthy();
    });
  });

  describe('질문·답변 다시 보기와 기록 삭제', () => {
    beforeEach(() => vi.mocked(api.createCoachNote).mockResolvedValue(ok()));

    it('질문·답변은 접힌 영역 안에 있고, 답변을 못 남긴 질문은 담담한 문구로 표시한다', async () => {
      renderView();
      await screen.findByText('현실로 한 걸음');
      const details = screen.getByText(/오늘의 질문과 답변 다시 보기/).closest('details')!;
      expect(details.open).toBe(false);                      // 기본은 접혀 있음
      expect(screen.getByText('안녕하세요, 저는 연습 중이에요.')).toBeTruthy();
      expect(screen.getByText('이 질문은 답변을 남기지 못했어요.')).toBeTruthy();
    });

    it('삭제를 확인하면 서버에 요청하고, 코치 노트와 질문·답변을 화면에서도 치운다', async () => {
      vi.mocked(api.deleteInterviewSession).mockResolvedValue({ message: 'ok' });
      vi.spyOn(window, 'confirm').mockReturnValue(true);
      renderView();
      await screen.findByText('현실로 한 걸음');
      fireEvent.click(screen.getByText('이 면접 기록 삭제'));
      expect(await screen.findByText(/면접 기록을 삭제했어요/)).toBeTruthy();
      expect(api.deleteInterviewSession).toHaveBeenCalledWith(42);
      expect(screen.queryByText('안녕하세요, 저는 연습 중이에요.')).toBeNull();
      expect(screen.queryByText(/꾸준함이 제 강점이에요/)).toBeNull();   // 코치 노트의 인용도 함께
      expect(screen.queryByText('이 면접 기록 삭제')).toBeNull();
    });

    it('삭제 확인 창에서 취소하면 아무 것도 지우지 않는다', async () => {
      vi.spyOn(window, 'confirm').mockReturnValue(false);
      renderView();
      await screen.findByText('현실로 한 걸음');
      fireEvent.click(screen.getByText('이 면접 기록 삭제'));
      expect(api.deleteInterviewSession).not.toHaveBeenCalled();
    });

    it('삭제가 실패하면 안내만 하고 내용은 그대로 둔다 (서버에 아직 남아 있으므로)', async () => {
      vi.mocked(api.deleteInterviewSession).mockRejectedValue(new Error('500'));
      vi.spyOn(window, 'confirm').mockReturnValue(true);
      renderView();
      await screen.findByText('현실로 한 걸음');
      fireEvent.click(screen.getByText('이 면접 기록 삭제'));
      expect(await screen.findByText(/삭제하지 못했어요/)).toBeTruthy();
      expect(screen.getByText(/꾸준함이 제 강점이에요/)).toBeTruthy();
      await waitFor(() => expect(screen.getByText('이 면접 기록 삭제')).toBeTruthy()); // 다시 시도 가능
    });
  });
});
