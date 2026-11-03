import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import type { SignupPayload } from '@/lib/api/types';
import { auth } from '@/lib/auth';

export function useLogin() {
  return useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      api.login(email, password),
    onSuccess: (data, vars) => auth.signIn(data.token, data.name, vars.email),
  });
}

/** 로그인 없이 시작 — 버튼으로 직접 시작할 때 (PrivateRoute는 startGuestOnce로 자동 시작) */
export function useGuestStart() {
  return useMutation({
    mutationFn: () => startGuestOnce(),
  });
}

let pendingGuest: Promise<void> | null = null;

/**
 * 게스트 계정을 한 번만 만든다. 화면 두 곳이 동시에 부르거나(React StrictMode의 effect 두 번 실행 등)
 * 버튼을 연달아 눌러도 서버에 계정이 여러 개 생기지 않게 진행 중인 요청을 같이 쓴다.
 */
export function startGuestOnce(): Promise<void> {
  if (auth.isAuthed()) return Promise.resolve();
  pendingGuest ??= api
    .startGuest()
    .then((data) => auth.signIn(data.token, data.name, undefined, true))
    .finally(() => {
      pendingGuest = null;
    });
  return pendingGuest;
}

export function useSignup() {
  return useMutation({
    mutationFn: (payload: SignupPayload) => api.signup(payload),
  });
}
