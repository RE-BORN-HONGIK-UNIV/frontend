import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { api } from '@/lib/api/client';
import { auth } from '@/lib/auth';
import { HaruProfileView } from './HaruProfileView';
import { loadHaruTalk, saveStageAnswers } from './store';

vi.mock('@/lib/api/client', () => ({ api: { haruProfile: vi.fn() } }));

describe('하루가 이렇게 이해했어요 카드', () => {
  beforeEach(() => {
    localStorage.clear();
    auth.signIn('token', '지우', 'jiwoo@example.com');
    vi.mocked(api.haruProfile).mockReset();
    saveStageAnswers(1, [
      { label: '부를 이름', question: '뭐라고 불러 드릴까요?', answer: '지우라고 불러 주세요' },
      { label: '관심 있는 것', question: '관심 있는 건?', answer: '요리를 배우고 있어요' },
    ]);
  });

  it('하루가 정리한 내용을 고쳐서 확인하면, 고친 내용을 3단계에 넘기고 기기에 남긴다', async () => {
    vi.mocked(api.haruProfile).mockResolvedValue({
      items: [
        { label: '부를 이름', value: '지우' },
        { label: '관심 있는 것', value: '요리' },
      ],
      source: 'llm',
    });
    const onNext = vi.fn();
    render(<HaruProfileView onNext={onNext} />);
    const input = await screen.findByLabelText('관심 있는 것');
    fireEvent.change(input, { target: { value: '집에서 반찬 만들기' } });
    fireEvent.click(screen.getByText('맞아요, 다음으로 →'));
    expect(onNext).toHaveBeenCalledWith(['부를 이름: 지우', '관심 있는 것: 집에서 반찬 만들기']);
    expect(loadHaruTalk().profile?.items[1].value).toBe('집에서 반찬 만들기');
  });

  it('정리 요청이 실패하면 대답 앞부분을 그대로 보여 주고 고치게 한다', async () => {
    vi.mocked(api.haruProfile).mockRejectedValue(new Error('offline'));
    render(<HaruProfileView onNext={vi.fn()} />);
    expect(await screen.findByDisplayValue('요리를 배우고 있어요')).toBeTruthy();
    expect(screen.getByText(/대답을 그대로 가져왔어요/)).toBeTruthy();
  });

  it('지우고 넘어가면 기록이 사라지고 아무 이야기도 넘기지 않는다', async () => {
    vi.mocked(api.haruProfile).mockResolvedValue({ items: [], source: 'fallback' });
    const onNext = vi.fn();
    render(<HaruProfileView onNext={onNext} />);
    fireEvent.click(screen.getByText('이 내용 지우고 넘어가기'));
    expect(onNext).toHaveBeenCalledWith([]);
    expect(loadHaruTalk().stage1).toBeUndefined();
  });

  it('이미 확인한 카드가 지금 대답 기준이면 다시 정리하지 않는다', async () => {
    vi.mocked(api.haruProfile).mockResolvedValue({ items: [{ label: '부를 이름', value: '지우' }], source: 'llm' });
    const first = render(<HaruProfileView onNext={vi.fn()} />);
    await screen.findByDisplayValue('지우');
    fireEvent.click(screen.getByText('맞아요, 다음으로 →'));
    first.unmount();
    render(<HaruProfileView onNext={vi.fn()} />);
    expect(await screen.findByDisplayValue('지우')).toBeTruthy();
    expect(api.haruProfile).toHaveBeenCalledTimes(1);
  });
});
