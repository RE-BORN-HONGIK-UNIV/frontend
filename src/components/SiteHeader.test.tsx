import { act, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, describe, expect, it } from 'vitest';
import { auth } from '@/lib/auth';
import { SiteHeader } from './SiteHeader';

const renderHeader = () =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter>
        <SiteHeader />
      </MemoryRouter>
    </QueryClientProvider>,
  );

describe('머리줄 계정 표시', () => {
  afterEach(() => auth.signOut());

  it('로그아웃하면 새로고침 없이 바로 "로그인"으로 바뀐다', () => {
    auth.signIn('t', '꿀', undefined, true);
    renderHeader();
    expect(screen.getByText('꿀님')).toBeTruthy();
    act(() => auth.signOut());
    expect(screen.queryByText('꿀님')).toBeNull();
    expect(screen.getByText('로그인')).toBeTruthy();
  });

  it('로그인·닉네임을 정하면 바로 이름이 보인다', () => {
    renderHeader();
    expect(screen.getByText('로그인')).toBeTruthy();
    act(() => {
      auth.signIn('t', '손님', undefined, true);
      auth.setNickname('꿀');
    });
    expect(screen.getByText('꿀님')).toBeTruthy();
  });
});
