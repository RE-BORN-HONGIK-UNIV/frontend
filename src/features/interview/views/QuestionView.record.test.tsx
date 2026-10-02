import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QuestionView } from './QuestionView';
import { getNextQuestion } from '@/features/interview/api';
import { api } from '@/lib/api/client';

/**
 * 면접 중 질문·답변 텍스트가 서버에 저장되고 다음 질문 생성(AI)에 전달되는지 확인한다.
 * 카메라·음성 인식·TTS는 가짜로 대체하고, 질문 → 답변 시작 → 답변 끝 → 제출까지 한 바퀴 돌린다.
 */
vi.mock('@/features/interview/useRecorder', () => ({
  useRecorder: () => ({ start: vi.fn(), stop: vi.fn(async () => new Blob(['x'])) }),
}));
vi.mock('@/features/interview/useLiveTranscript', () => ({
  useLiveTranscript: () => ({ supported: true, transcript: '내 답변이에요', isFinal: true, reset: vi.fn() }),
}));
vi.mock('@/features/interview/api', () => ({
  getNextQuestion: vi.fn(async () => ({ question: '다음 질문이에요', source: 'llm' })),
  getSpeechAudioUrl: vi.fn(async () => null),
  transcribeAnswer: vi.fn(async () => ''),
  uploadAnswer: vi.fn(async () => ({ ok: true })),
}));
vi.mock('@/lib/api/client', () => ({
  api: {
    startInterviewSession: vi.fn(async () => ({ id: 9 })),
    addInterviewTurn: vi.fn(async () => ({ id: 1, order: 0 })),
    saveInterviewAnswer: vi.fn(async () => ({})),
    completeInterviewSession: vi.fn(async () => ({})),
  },
}));

/** 첫 질문(고정)에 한 번 답하고 제출해서, 다음 질문을 요청하는 지점까지 진행 */
async function answerFirstQuestion() {
  render(<QuestionView stream={null} tier="warmup" onAllDone={vi.fn()} />);
  fireEvent.click(await screen.findByText('🎙️ 답변 시작'));
  fireEvent.click(await screen.findByText('✓ 답변 끝'));
  fireEvent.click(await screen.findByText('제출하기'));
  await waitFor(() => expect(getNextQuestion).toHaveBeenCalled());
  await new Promise((r) => setTimeout(r, 0)); // 뒤에서 도는 저장 큐가 끝나도록
}

describe('QuestionView 면접 기록 저장', () => {
  beforeEach(() => vi.clearAllMocks());

  it('면접 기록을 만들고 질문과 답변 텍스트를 저장한다', async () => {
    await answerFirstQuestion();
    expect(api.startInterviewSession).toHaveBeenCalledTimes(1);
    expect(api.startInterviewSession).toHaveBeenCalledWith('warmup');
    expect(api.addInterviewTurn).toHaveBeenCalledWith(9, 'main', expect.stringContaining('자기소개'));
    expect(api.saveInterviewAnswer).toHaveBeenCalledWith(9, 1, '내 답변이에요');
  });

  it('답변 텍스트를 다음 질문 생성(AI)에 전달한다', async () => {
    await answerFirstQuestion();
    const [, , previousAnswer] = vi.mocked(getNextQuestion).mock.calls[0];
    expect(previousAnswer).toBe('내 답변이에요');
  });

  it('서버 저장이 실패해도 면접은 계속된다 (다음 질문이 그대로 나옴)', async () => {
    vi.mocked(api.startInterviewSession).mockRejectedValueOnce(new Error('401'));
    await answerFirstQuestion();
    expect(await screen.findByText('다음 질문이에요')).toBeTruthy();
    expect(api.addInterviewTurn).not.toHaveBeenCalled(); // 세션이 없으니 이후 저장은 건너뜀
  });
});
