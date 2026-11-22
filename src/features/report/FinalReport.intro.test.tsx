import { act, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '@/lib/api/client';
import type { ReportCoachResponse } from '@/lib/api/types';
import { FinalReport, reportDateTime } from './FinalReport';

vi.mock('@/lib/api/client', () => ({
  api: {
    latestStage1: vi.fn(async () => ({ result: null })),
    latestGazeBlink: vi.fn(async () => ({ result: null })),
    createReportCoach: vi.fn(),
  },
}));

const INTERVIEW = {
  sessionId: 7,
  startedAt: 0,
  endedAt: 0,
  turns: [
    { kind: 'main' as const, question: '자기소개 해 주세요', answer: '음 저는 요리를 좋아하고 음 요즘은 반찬을 만들어요.' },
    { kind: 'main' as const, question: '장점은요?', answer: '꼼꼼한 편이에요.' },
  ],
};
const MARKS = [{ question: '자기소개 해 주세요', script: '[f:음] 저는 요리를 좋아하고 [f:음] [p:4초 멈춤] 요즘은 반찬을 만들어요.' }];
const COACH: ReportCoachResponse = {
  source: 'llm',
  result: {
    picked: ['자기소개 해 주세요'],
    rewrites: [{ question: '자기소개 해 주세요', text: '저는 요리를 좋아합니다. 요즘은 반찬을 만들고 있어요.', changes: ["'음'을 뺐어요"] }],
    plan: [],
    care: null,
  },
};

describe('최종 리포트 첫 화면', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('면접 직후엔 리포트를 쓰는 화면을 잠깐 보여 주고 리포트로 넘어간다', () => {
    render(
      <MemoryRouter>
        <FinalReport writingIntro interview={{ turns: [], sessionId: null, startedAt: 0, endedAt: 0 }} details={{}} />
      </MemoryRouter>,
    );
    expect(screen.getByText(/리포트/).closest('.rb-report-writing')).toBeTruthy();
    for (let i = 0; i < 6; i++) act(() => vi.advanceTimersByTime(700));
    expect(document.querySelector('.rb-report-writing')).toBeNull();
    // 면접을 마쳤으면 하루가 맨 위에서 맞아 준다
    expect(screen.getByText('수고했어요! 끝까지 해냈네요.')).toBeTruthy();
  });

  it('리포트 AI가 끝날 때까지 쓰는 화면에서 기다렸다가, 다듬은 말과 함께 한 번에 보여 준다', async () => {
    let resolve: (r: ReportCoachResponse) => void = () => undefined;
    vi.mocked(api.createReportCoach).mockReturnValue(new Promise((r) => (resolve = r)));
    render(
      <MemoryRouter>
        <FinalReport writingIntro interview={INTERVIEW} details={{ stage3Marks: MARKS }} />
      </MemoryRouter>,
    );
    for (let i = 0; i < 6; i++) act(() => vi.advanceTimersByTime(700));
    expect(document.querySelector('.rb-report-writing')).toBeTruthy(); // AI가 아직이라 기다린다
    // 서버는 표시를 모르니 질문별 말버릇 수·긴 멈춤 수를 같이 보낸다
    expect(vi.mocked(api.createReportCoach).mock.calls[0]).toEqual([
      7,
      expect.objectContaining({
        turns: [
          { question: '자기소개 해 주세요', fillers: 2, pauses: 1 },
          { question: '장점은요?', fillers: 0, pauses: 0 },
        ],
      }),
    ]);
    await act(async () => resolve(COACH));
    for (let i = 0; i < 3; i++) act(() => vi.advanceTimersByTime(700));
    expect(document.querySelector('.rb-report-writing')).toBeNull();
    expect(screen.getByText('이렇게 말해 보면')).toBeTruthy();
    expect(screen.getByText('저는 요리를 좋아합니다. 요즘은 반찬을 만들고 있어요.')).toBeTruthy();
    expect(screen.getByLabelText('다듬은 말 있음')).toBeTruthy();
    act(() => screen.getByRole('tab', { name: '질문 2' }).click());
    expect(screen.getByText('이 대답은 그대로도 잘 전해져요.')).toBeTruthy();
  });

  it('AI가 너무 오래 걸리면 기다리지 않고 리포트를 먼저 보여 준다', () => {
    vi.mocked(api.createReportCoach).mockReturnValue(new Promise(() => undefined));
    render(
      <MemoryRouter>
        <FinalReport writingIntro interview={INTERVIEW} details={{ stage3Marks: MARKS }} />
      </MemoryRouter>,
    );
    act(() => vi.advanceTimersByTime(30000));
    expect(document.querySelector('.rb-report-writing')).toBeNull();
    expect(screen.getByText('대답을 다듬고 있어요. 조금 뒤에 나타나요.')).toBeTruthy();
  });

  it('날짜에 요일과 시:분:초', () => {
    expect(reportDateTime(new Date(2026, 10, 7, 19, 54, 12))).toBe('2026년 11월 7일 (토) 19:54:12');
  });
});
