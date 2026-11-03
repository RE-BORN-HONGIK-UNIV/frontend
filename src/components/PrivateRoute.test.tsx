import { StrictMode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { PrivateRoute } from './PrivateRoute';
import { api } from '@/lib/api/client';
import { auth } from '@/lib/auth';

vi.mock('@/lib/api/client', () => ({ api: { startGuest: vi.fn() } }));

function LoginProbe() {
  const state = useLocation().state as { from?: string; guestFailed?: boolean } | null;
  return <p>로그인 화면 {state?.guestFailed ? '(게스트 실패)' : ''} {state?.from}</p>;
}

function renderAt(path: string) {
  return render(
    <StrictMode>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/login" element={<LoginProbe />} />
          <Route
            path="/voice"
            element={
              <PrivateRoute>
                <p>1단계 화면</p>
              </PrivateRoute>
            }
          />
        </Routes>
      </MemoryRouter>
    </StrictMode>,
  );
}

describe('PrivateRoute — 로그인 없이 시작', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.mocked(api.startGuest).mockReset();
  });

  it('로그인했으면 게스트를 만들지 않고 바로 보여 준다', async () => {
    auth.signIn('real-token', '세연', 'me@test.com');
    renderAt('/voice');
    expect(await screen.findByText('1단계 화면')).toBeInTheDocument();
    expect(api.startGuest).not.toHaveBeenCalled();
    expect(auth.isGuest).toBe(false);
  });

  it('로그인하지 않았으면 로그인 화면 대신 게스트로 바로 시작한다 (StrictMode에서도 계정은 하나)', async () => {
    vi.mocked(api.startGuest).mockResolvedValue({ token: 'guest-token', name: '게스트', guest: true });
    renderAt('/voice');
    expect(await screen.findByText('1단계 화면')).toBeInTheDocument();
    expect(api.startGuest).toHaveBeenCalledTimes(1);
    expect(auth.token).toBe('guest-token');
    expect(auth.isGuest).toBe(true);
  });

  it('게스트를 못 만들면(서버 꺼짐·시간당 제한) 그때만 로그인 화면으로 보낸다', async () => {
    vi.mocked(api.startGuest).mockRejectedValue(new Error('429'));
    renderAt('/voice');
    expect(await screen.findByText(/로그인 화면 \(게스트 실패\) \/voice/)).toBeInTheDocument();
    expect(auth.isAuthed()).toBe(false);
  });

  it('게스트였다가 로그인하면 게스트 표시가 지워진다', () => {
    auth.signIn('guest-token', '게스트', undefined, true);
    expect(auth.isGuest).toBe(true);
    auth.signIn('real-token', '세연', 'me@test.com');
    expect(auth.isGuest).toBe(false);
    expect(auth.email).toBe('me@test.com');
  });
});
