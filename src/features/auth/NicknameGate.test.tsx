import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { NicknameGate } from './NicknameGate';
import { api, ApiError } from '@/lib/api/client';
import { auth } from '@/lib/auth';

vi.mock('@/lib/api/client', async (importOriginal) => {
  const real = await importOriginal<typeof import('@/lib/api/client')>();
  return { ApiError: real.ApiError, api: { setNickname: vi.fn() } };
});

const renderGate = () =>
  render(
    <NicknameGate>
      <button>대시보드 버튼</button>
    </NicknameGate>,
  );

describe('NicknameGate — 무료로 시작한 게스트에게 불러 줄 이름 묻기', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.mocked(api.setNickname).mockReset();
  });

  it('게스트가 이름을 정하기 전엔 가운데 창을 띄우고 뒤 화면은 누를 수 없게 둔다', () => {
    auth.signIn('guest-token', '게스트', undefined, true);
    renderGate();
    expect(screen.getByRole('dialog', { name: '어떻게 불러 드릴까요?' })).toBeInTheDocument();
    expect(screen.getByText('대시보드 버튼').closest('[inert]')).not.toBeNull();
  });

  it('입력한 이름(앞뒤 공백 제거)을 서버에 저장하고 창을 닫는다 — 새로 열어도 다시 묻지 않는다', async () => {
    auth.signIn('guest-token', '게스트', undefined, true);
    vi.mocked(api.setNickname).mockResolvedValue({ name: '하늘' });
    const { unmount } = renderGate();
    fireEvent.change(screen.getByLabelText('불러 드릴 이름'), { target: { value: '  하늘 ' } });
    fireEvent.click(screen.getByRole('button', { name: '시작하기' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(api.setNickname).toHaveBeenCalledWith('하늘');
    expect(auth.name).toBe('하늘');
    expect(screen.getByText('대시보드 버튼').closest('[inert]')).toBeNull();

    unmount();
    renderGate();
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('빈 이름은 보내지 않고, 서버 오류는 창 안에 보여 준다', async () => {
    auth.signIn('guest-token', '게스트', undefined, true);
    vi.mocked(api.setNickname).mockRejectedValue(new ApiError(400, '이름은 20자까지 쓸 수 있어요.'));
    renderGate();
    fireEvent.click(screen.getByRole('button', { name: '시작하기' }));
    expect(await screen.findByText('불러 드릴 이름을 입력해 주세요.')).toBeInTheDocument();
    expect(api.setNickname).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText('불러 드릴 이름'), { target: { value: '하늘' } });
    fireEvent.click(screen.getByRole('button', { name: '시작하기' }));
    expect(await screen.findByText('이름은 20자까지 쓸 수 있어요.')).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('회원(로그인)은 가입할 때 이름을 받았으니 묻지 않는다', () => {
    auth.signIn('real-token', '세연', 'me@test.com');
    renderGate();
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
