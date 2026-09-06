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

export function useSignup() {
  return useMutation({
    mutationFn: (payload: SignupPayload) => api.signup(payload),
  });
}
