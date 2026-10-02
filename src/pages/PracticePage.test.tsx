import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import PracticePage from './PracticePage';
import { api } from '@/lib/api/client';
import type { PracticeState } from '@/features/interview/practice';

vi.mock('@/lib/api/client', () => ({ api: { getPracticeHint: vi.fn() } }));

// 음성 인식은 가짜로: supported / transcript를 테스트가 정한다
const speech = vi.hoisted(() => ({ supported: true, transcript: '' }));
vi.mock('@/features/interview/useLiveTranscript', () => ({
  useLiveTranscript: () => ({ supported: speech.supported, transcript: speech.transcript, isFinal: true, reset: vi.fn() }),
}));

const STATE: PracticeState = { question: '강점은 무엇인가요?', previousAnswer: '꾸준함이에요', tier: 'standard' };
const HINT = {
  opening: '제가 ___에서 ___을 맡았을 때 ___예요.',
  steps: ['상황을 한 문장으로 말해보세요.', '내가 한 일을 말해보세요.'],
};

function renderPage(state: PracticeState | null = STATE) {
  render(
    <MemoryRouter initialEntries={[{ pathname: '/practice', state }]}>
      <Routes>
        <Route path="/practice" element={<PracticePage />} />
        <Route path="/dashboard" element={<div>DASHBOARD_PAGE</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

/** 말로 답하는 흐름: 답변 시작 → 답변 끝 → (확인 화면) */
async function speakAndFinish(transcript: string) {
  speech.transcript = transcript;
  fireEvent.click(await screen.findByText('🎙️ 답변 시작'));
  fireEvent.click(screen.getByText('✓ 답변 끝'));
}

describe('PracticePage', () => {
  beforeEach(() => {
    speech.supported = true;
    speech.transcript = '';
    vi.mocked(api.getPracticeHint).mockReset();
    vi.mocked(api.getPracticeHint).mockResolvedValue({ hint: HINT, source: 'llm' });
  });

  it('연습할 내용(router state)이 없으면 대시보드로 돌려보낸다 (새로고침 등)', () => {
    renderPage(null);
    expect(screen.getByText('DASHBOARD_PAGE')).toBeTruthy();
    expect(api.getPracticeHint).not.toHaveBeenCalled();
  });

  describe('힌트', () => {
    it('질문과 함께, 이전 답변을 보내 받은 AI 힌트(시작 문장 틀·말하는 순서)를 보여준다', async () => {
      renderPage();
      expect(screen.getByText('강점은 무엇인가요?')).toBeTruthy();
      expect(screen.getByText('힌트를 준비하고 있어요…')).toBeTruthy();
      expect(await screen.findByText(/제가 ___에서 ___을 맡았을 때/)).toBeTruthy();
      expect(screen.getByText('상황을 한 문장으로 말해보세요.')).toBeTruthy();
      expect(screen.getByText('AI가 만든 힌트')).toBeTruthy();
      expect(api.getPracticeHint).toHaveBeenCalledWith('강점은 무엇인가요?', '꾸준함이에요');
    });

    it('서버가 일반 힌트를 주면 "기본 힌트"라고 솔직하게 표시한다', async () => {
      vi.mocked(api.getPracticeHint).mockResolvedValue({ hint: HINT, source: 'fallback' });
      renderPage();
      expect(await screen.findByText('기본 힌트')).toBeTruthy();
      expect(screen.queryByText('AI가 만든 힌트')).toBeNull();
    });

    it('힌트 요청이 실패해도 연습은 막히지 않고, 프론트의 일반 힌트가 나온다', async () => {
      vi.mocked(api.getPracticeHint).mockRejectedValue(new Error('network'));
      renderPage();
      expect(await screen.findByText('기본 힌트')).toBeTruthy();
      expect(screen.getByText(/저는 ___라고 생각해요/)).toBeTruthy();
      expect(screen.getByText('🎙️ 답변 시작')).toBeTruthy();
    });
  });

  describe('말로 답하기 (음성 인식 가능)', () => {
    it('답변 시작 → 답변 끝 → 말한 내용이 적힌 상태로 확인 → 제출', async () => {
      renderPage();
      await speakAndFinish('저는 꾸준히 해내는 사람이에요');
      const box = screen.getByLabelText('내 답변') as HTMLTextAreaElement;
      expect(box.value).toBe('저는 꾸준히 해내는 사람이에요');
      fireEvent.click(screen.getByText('제출하기'));
      expect(await screen.findByText('저는 꾸준히 해내는 사람이에요')).toBeTruthy();
    });

    it('내용이 비어 있으면 제출할 수 없다', async () => {
      renderPage();
      await speakAndFinish('');
      expect((screen.getByText('제출하기').closest('button') as HTMLButtonElement).disabled).toBe(true);
    });
  });

  describe('직접 적어서 답하기 (음성 인식 불가 브라우저)', () => {
    it('안내와 함께 적어서 연습하는 방법을 제공한다', async () => {
      speech.supported = false;
      renderPage();
      expect(await screen.findByText(/음성 인식이 안 돼요/)).toBeTruthy();
      expect(screen.queryByText('🎙️ 답변 시작')).toBeNull();
      fireEvent.click(screen.getByText('✍️ 직접 적어서 연습하기'));
      fireEvent.change(screen.getByLabelText('내 답변'), { target: { value: '저는 성실해요' } });
      fireEvent.click(screen.getByText('제출하기'));
      expect(await screen.findByText('저는 성실해요')).toBeTruthy();
    });
  });

  describe('결과: 좋아진 점만 알린다', () => {
    it('이전에 답을 못 남겼는데 이번엔 남겼으면 그걸 알아준다', async () => {
      renderPage({ ...STATE, previousAnswer: '' });
      await speakAndFinish('이번엔 이렇게 말해봤어요');
      fireEvent.click(screen.getByText('제출하기'));
      expect(await screen.findByText(/이번엔 답을 남겼어요/)).toBeTruthy();
    });

    it('이전보다 눈에 띄게 길어졌으면 그걸 알아준다', async () => {
      renderPage();
      await speakAndFinish('꾸준함이 제 강점이에요. 팀 프로젝트에서 자료 정리를 맡아 매주 공유했어요');
      fireEvent.click(screen.getByText('제출하기'));
      expect(await screen.findByText(/이전보다 더 길게 이야기했어요/)).toBeTruthy();
    });

    it('줄었거나 비슷해도 비교하지 않고 격려만 한다 (부정적인 비교 문구가 없다)', async () => {
      renderPage({ ...STATE, previousAnswer: '꾸준함이 제 강점이고 팀 프로젝트에서 자료 정리를 맡아 매주 공유했어요' });
      await speakAndFinish('꾸준함이에요');
      fireEvent.click(screen.getByText('제출하기'));
      expect(await screen.findByText('한 번 더 해본 것만으로도 충분해요.')).toBeTruthy();
      expect(screen.queryByText(/줄었|짧아|부족|더 길게/)).toBeNull();
    });

    it('처음 답변은 접힌 영역에서 다시 볼 수 있고, 처음에 답이 없었으면 그 영역이 없다', async () => {
      renderPage();
      await speakAndFinish('새 답변이에요 오늘은');
      fireEvent.click(screen.getByText('제출하기'));
      expect(await screen.findByText('처음 답변 보기')).toBeTruthy();
    });

    it('이전 답변이 없었으면 "처음 답변 보기"를 그리지 않는다', async () => {
      renderPage({ ...STATE, previousAnswer: '' });
      await speakAndFinish('새 답변이에요 오늘은');
      fireEvent.click(screen.getByText('제출하기'));
      await screen.findByText(/이번엔 답을 남겼어요/);
      expect(screen.queryByText('처음 답변 보기')).toBeNull();
    });
  });

  describe('끝낸 뒤', () => {
    async function finish() {
      renderPage();
      await speakAndFinish('새 답변이에요 오늘은 이렇게 말해요');
      fireEvent.click(screen.getByText('제출하기'));
      await screen.findByText('이번 답변');
    }

    it('"마치기"는 대시보드로 간다', async () => {
      await finish();
      fireEvent.click(screen.getByText('마치기'));
      expect(screen.getByText('DASHBOARD_PAGE')).toBeTruthy();
    });

    it('"한 번 더 해보기"는 같은 질문의 처음 상태로 돌아가 다시 답할 수 있다', async () => {
      await finish();
      fireEvent.click(screen.getByText('한 번 더 해보기'));
      expect(await screen.findByText('🎙️ 답변 시작')).toBeTruthy();
      expect(screen.queryByText('이번 답변')).toBeNull();
      await waitFor(() => expect(screen.getByText('강점은 무엇인가요?')).toBeTruthy());
    });
  });
});
