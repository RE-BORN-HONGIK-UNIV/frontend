import { auth } from '@/lib/auth';
import type {
  AnalyzeResult,
  FeedbackResponse,
  GazeBlinkResult,
  LoginResponse,
  SignupPayload,
} from './types';

/** Empty in dev (Vite proxy handles /api, /analyze). Set VITE_API_BASE_URL for deployed builds. */
const BASE = import.meta.env.VITE_API_BASE_URL ?? '';

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const isForm = init?.body instanceof FormData;
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      ...(isForm ? {} : { 'Content-Type': 'application/json' }),
      ...(auth.token ? { Authorization: `Bearer ${auth.token}` } : {}),
      ...init?.headers,
    },
  });

  const data: unknown = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message =
      (data as { error?: string; detail?: string }).error ?? res.statusText;
    throw new ApiError(res.status, message);
  }
  return data as T;
}

export const api = {
  login: (email: string, password: string) =>
    request<LoginResponse>('/api/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  signup: (payload: SignupPayload) =>
    request<{ message: string }>('/api/signup', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  analyze: (file: File) => {
    const fd = new FormData();
    fd.append('file', file);
    return request<AnalyzeResult>('/analyze', { method: 'POST', body: fd });
  },

  feedback: (result: AnalyzeResult) =>
    request<FeedbackResponse>('/analyze/feedback', {
      method: 'POST',
      body: JSON.stringify(result),
    }),

  analyzeGazeBlink: (file: File) => {
    const fd = new FormData();
    fd.append('file', file);
    return request<GazeBlinkResult>('/analyze/gaze-blink', { method: 'POST', body: fd });
  },
};
