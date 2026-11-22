import { beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LogoutButton } from './LogoutButton';
import { auth } from '@/lib/auth';
import { localProgress } from '@/features/progress/localProgress';

function renderAt() {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route path="/dashboard" element={<LogoutButton />} />
          <Route path="/" element={<p>메인 화면</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('LogoutButton — 로그아웃하면 이 기기 기록을 지우고 다음엔 새 닉네임부터', () => {
  beforeEach(() => localStorage.clear());

  it('게스트: 기록이 저장되지 않는다고 묻고, 확인하면 이름·진행 기록을 지우고 메인으로 (화면 설정은 남김)', () => {
    auth.signIn('guest-token', '게스트', undefined, true);
    auth.setNickname('하늘');
    localProgress.markStage1Done(70);
    localStorage.setItem('rb.report.details', '{}');
    localStorage.setItem('rb.theme', 'dark');

    renderAt();
    fireEvent.click(screen.getByText('로그아웃'));
    expect(screen.getByText(/지금까지의 기록은 저장되지 않아요/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '로그아웃' }));

    expect(screen.getByText('메인 화면')).toBeInTheDocument();
    expect(auth.isAuthed()).toBe(false);
    expect(auth.name).toBe('');
    expect(localProgress.stage1().done).toBe(false);
    expect(localStorage.getItem('rb.report.details')).toBeNull();
    expect(localStorage.getItem('rb.theme')).toBe('dark');

    // 다시 게스트로 시작하면 닉네임을 새로 묻는다
    auth.signIn('new-guest-token', '게스트', undefined, true);
    expect(auth.needsNickname).toBe(true);
  });

  it('취소하면 아무것도 지우지 않는다', () => {
    auth.signIn('guest-token', '게스트', undefined, true);
    renderAt();
    fireEvent.click(screen.getByText('로그아웃'));
    fireEvent.click(screen.getByRole('button', { name: '취소' }));
    expect(auth.isAuthed()).toBe(true);
  });

  it('회원: 다시 로그인하면 이어서 볼 수 있다고 안내', () => {
    auth.signIn('real-token', '세연', 'me@test.com');
    renderAt();
    fireEvent.click(screen.getByText('로그아웃'));
    expect(screen.getByText(/다시 로그인하면 기록을 이어서 볼 수 있어요/)).toBeInTheDocument();
  });
});
