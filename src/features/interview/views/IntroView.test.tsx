import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { IntroView } from './IntroView';
import { getInterviewConsent } from '../consent';

// 1·2단계 기록이 모두 있는 상태 → 추천 면접관이 정해져 시작 버튼이 나오는 화면까지 간다
vi.mock('@/lib/api/client', () => ({
  api: {
    latestStage1: vi.fn(async () => ({ result: { at: '2026-10-02T00:00:00', overallScore: 55 } })),
    latestGazeBlink: vi.fn(async () => ({ result: { at: '2026-10-02T00:00:00', overallScore: 55 } })),
  },
}));

const START = '면접 준비 시작하기';

describe('IntroView 동의', () => {
  beforeEach(() => localStorage.clear());

  it('동의는 기본적으로 해제돼 있고, 무엇이 저장·전송되는지와 동의하지 않아도 된다는 점을 알려준다', async () => {
    render(<IntroView onStart={vi.fn()} />);
    const box = (await screen.findByLabelText(/기록 저장과 AI 코치 노트에 동의해요/)) as HTMLInputElement;
    expect(box.checked).toBe(false);
    expect(screen.getByText(/AI\(Anthropic\)에\s*전송돼요/)).toBeTruthy();
    expect(screen.getByText(/영상과 음성은 저장하지 않아요/)).toBeTruthy();
    expect(screen.getByText(/동의하지 않아도 면접은 그대로 할 수 있어요/)).toBeTruthy();
  });

  it('동의하지 않고 시작하면 consent=false로 넘기고, 아무 것도 기억하지 않는다', async () => {
    const onStart = vi.fn();
    render(<IntroView onStart={onStart} />);
    fireEvent.click(await screen.findByText(START));
    expect(onStart).toHaveBeenCalledWith('standard', false);
    expect(getInterviewConsent()).toBe(false);
  });

  it('체크하고 시작하면 consent=true로 넘기고 이 기기에 선택을 기억한다', async () => {
    const onStart = vi.fn();
    render(<IntroView onStart={onStart} />);
    fireEvent.click(await screen.findByLabelText(/기록 저장과 AI 코치 노트에 동의해요/));
    fireEvent.click(screen.getByText(START));
    expect(onStart).toHaveBeenCalledWith('standard', true);
    expect(getInterviewConsent()).toBe(true);
  });

  it('이전에 동의했던 기기에서는 체크된 채로 시작하고, 해제하면 다시 동의 안 함으로 기억한다', async () => {
    localStorage.setItem('rb.consent.interview', 'true');
    render(<IntroView onStart={vi.fn()} />);
    const box = (await screen.findByLabelText(/기록 저장과 AI 코치 노트에 동의해요/)) as HTMLInputElement;
    expect(box.checked).toBe(true);
    fireEvent.click(box);
    expect(getInterviewConsent()).toBe(false);
  });
});
