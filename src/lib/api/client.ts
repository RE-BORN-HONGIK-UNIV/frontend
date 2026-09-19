import { auth } from '@/lib/auth';
import { mockApi } from './mock';
import type {
  AnalyzeResult,
  CalibrationResult,
  CommentItem,
  FeedbackResponse,
  GazeBlinkResult,
  LoginResponse,
  PostDetail,
  PostSummary,
  SignupPayload,
} from './types';

/** Empty in dev (Vite proxy handles /api, /analyze). Set VITE_API_BASE_URL for deployed builds. */
const BASE = import.meta.env.VITE_API_BASE_URL ?? '';

/** true면 백엔드를 아예 안 켜고 프론트만 실행 — 요청 대신 mock.ts의 가짜 응답을 씀. */
const USE_MOCK = import.meta.env.VITE_USE_MOCK_API === 'true';

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
    USE_MOCK
      ? mockApi.login()
      : request<LoginResponse>('/api/login', {
          method: 'POST',
          body: JSON.stringify({ email, password }),
        }),

  signup: (payload: SignupPayload) =>
    USE_MOCK
      ? mockApi.signup()
      : request<{ message: string }>('/api/signup', {
          method: 'POST',
          body: JSON.stringify(payload),
        }),

    /** calibration을 넘기면 그 사람 목소리 기준으로 filler 판정을 보정해서 분석.
   * 넘기지 않으면 백엔드가 이 녹음 자체에서 기준값을 추정 (하위 호환). */
  analyze: (file: File, calibration?: CalibrationResult | null) => {
    if (USE_MOCK) return mockApi.analyze();
    const fd = new FormData();
    fd.append('file', file);
    if (calibration) fd.append('calibration', JSON.stringify(calibration));
    return request<AnalyzeResult>('/analyze', { method: 'POST', body: fd });
  },

  /** POST /api/stage1/calibrate — 5초 무음 + 10초 낭독 + 자유발화 녹음 분석.
   * 결과는 오각형 차트/점수에 안 들어가고, analyze()에 넘겨서 filler 임계값 보정에만 쓰임. */
  calibrate: (file: File) => {
    if (USE_MOCK) {
      // mock 모드에선 백엔드가 없으니 그럴듯한 더미값으로 흉내만 냄
      return Promise.resolve<CalibrationResult>({
        background_noise_rms: 0.001,
        background_peak_db: -40,
        background_zcr: 0.05,
        clipped_ratio: 0,
        is_clipping: false,
        overall_peak_db: -6,
        personal_filler_zcr: 0.08,
        personal_breath_zcr: 0.04,
      });
    }
    const fd = new FormData();
    fd.append('file', file, 'calibration.webm');
    return request<CalibrationResult>('/api/stage1/calibrate', { method: 'POST', body: fd });
  },

  feedback: (result: AnalyzeResult) =>
    USE_MOCK
      ? mockApi.feedback()
      : request<FeedbackResponse>('/analyze/feedback', {
          method: 'POST',
          body: JSON.stringify(result),
        }),

  analyzeGazeBlink: (file: File) => {
    if (USE_MOCK) return mockApi.analyzeGazeBlink();
    const fd = new FormData();
    fd.append('file', file);
    return request<GazeBlinkResult>('/analyze/gaze-blink', { method: 'POST', body: fd });
  },

  // ── '이야기' 자유 게시판 ──────────────────────────────────────
  listPosts: () =>
    USE_MOCK ? mockApi.listPosts() : request<{ posts: PostSummary[] }>('/community/posts'),

  createPost: (title: string, content: string) =>
    USE_MOCK
      ? mockApi.createPost(title, content)
      : request<PostSummary>('/community/posts', {
          method: 'POST',
          body: JSON.stringify({ title, content }),
        }),

  getPost: (id: number) =>
    USE_MOCK ? mockApi.getPost(id) : request<PostDetail>(`/community/posts/${id}`),

  deletePost: (id: number) =>
    USE_MOCK
      ? mockApi.deletePost(id)
      : request<{ message: string }>(`/community/posts/${id}`, { method: 'DELETE' }),

  createComment: (postId: number, content: string) =>
    USE_MOCK
      ? mockApi.createComment(postId, content)
      : request<CommentItem>(`/community/posts/${postId}/comments`, {
          method: 'POST',
          body: JSON.stringify({ content }),
        }),
};
