import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getNextQuestion } from './api';

describe('getNextQuestion 인증 헤더', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    localStorage.clear();
    fetchMock.mockReset();
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ question: 'Q?', source: 'llm' }) });
    vi.stubGlobal('fetch', fetchMock);
  });
  afterEach(() => vi.unstubAllGlobals());

  it('로그인 토큰이 있으면 Authorization 헤더를 같이 보낸다 (서버가 이 유저의 1·2단계 점수를 조회)', async () => {
    localStorage.setItem('rb.token', 'abc123');
    await getNextQuestion('standard', []);
    const headers = fetchMock.mock.calls[0][1].headers as Record<string, string>;
    expect(headers.Authorization).toBe('Bearer abc123');
  });

  it('토큰이 없으면 헤더를 붙이지 않고 요청은 그대로 진행한다', async () => {
    const res = await getNextQuestion('standard', []);
    const headers = fetchMock.mock.calls[0][1].headers as Record<string, string>;
    expect(headers.Authorization).toBeUndefined();
    expect(res.question).toBe('Q?');
  });

  it('tier·mode·이전 질문/답변을 본문에 담는다', async () => {
    await getNextQuestion('practice', ['q1'], '내 답변', 'follow_up');
    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(body).toEqual({
      tier: 'practice',
      previous_questions: ['q1'],
      previous_answer: '내 답변',
      mode: 'follow_up',
    });
  });
});
