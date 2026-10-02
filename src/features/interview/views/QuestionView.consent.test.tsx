import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QuestionView } from './QuestionView';
import { getNextQuestion } from '@/features/interview/api';
import { api } from '@/lib/api/client';

/**
 * 개인정보 약속을 면접 화면 수준에서 검증한다: **동의하지 않으면 서버에 아무것도 저장하지 않고 답변 텍스트를 AI로
 * 보내지 않는다.** 카메라·음성 인식·TTS는 가짜로 대체하고, 질문 → 답변 시작 → 답변 끝 → 제출까지 한 바퀴 돌린다.
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
async function answerFirstQuestion(consent: boolean) {
  render(<QuestionView stream={null} tier="warmup" consent={consent} onAllDone={vi.fn()} />);
  fireEvent.click(await screen.findByText('🎙️ 답변 시작'));
  fireEvent.click(await screen.findByText('✓ 답변 끝'));
  fireEvent.click(await screen.findByText('제출하기'));
  await waitFor(() => expect(getNextQuestion).toHaveBeenCalled());
  await new Promise((r) => setTimeout(r, 0)); // 뒤에서 도는 저장 큐가 끝나도록
}

describe('QuestionView 동의 여부에 따른 서버 호출', () => {
  beforeEach(() => vi.clearAllMocks());

  it('동의하지 않으면 면접 기록을 서버에 만들지도, 질문·답변을 저장하지도 않는다', async () => {
    await answerFirstQuestion(false);
    expect(api.startInterviewSession).not.toHaveBeenCalled();
    expect(api.addInterviewTurn).not.toHaveBeenCalled();
    expect(api.saveInterviewAnswer).not.toHaveBeenCalled();
    expect(api.completeInterviewSession).not.toHaveBeenCalled();
  });

  it('동의하지 않으면 방금 한 답변 텍스트를 AI(질문 생성)로 보내지 않는다', async () => {
    await answerFirstQuestion(false);
    const [, , previousAnswer] = vi.mocked(getNextQuestion).mock.calls[0];
    expect(previousAnswer).toBeUndefined();
  });

  it('동의하면 면접 기록을 만들고 질문과 답변 텍스트를 저장한다', async () => {
    await answerFirstQuestion(true);
    expect(api.startInterviewSession).toHaveBeenCalledTimes(1);
    expect(api.startInterviewSession).toHaveBeenCalledWith('warmup');
    expect(api.addInterviewTurn).toHaveBeenCalledWith(9, 'main', expect.stringContaining('자기소개'));
    expect(api.saveInterviewAnswer).toHaveBeenCalledWith(9, 1, '내 답변이에요');
  });

  it('동의하면 답변 텍스트가 다음 질문 생성(AI)에 전달된다', async () => {
    await answerFirstQuestion(true);
    const [, , previousAnswer] = vi.mocked(getNextQuestion).mock.calls[0];
    expect(previousAnswer).toBe('내 답변이에요');
  });
});
