import { auth } from '@/lib/auth';
import { mockApi } from './mock';
import type {
  AnalyzeResult,
  CalibrationResult,
  CommentItem,
  FeedbackResponse,
  GazeBlinkLatest,
  CoachNoteResponse,
  HaruProfileResponse,
  HaruReplyRequest,
  HaruReplyResponse,
  InterviewSessionDetail,
  InterviewSessionSummary,
  LatestResponse,
  LiveSavePayload,
  LiveSaveResponse,
  PracticeHintResponse,
  LoginResponse,
  PostDetail,
  PostSummary,
  SignupPayload,
  Stage1Latest,
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
  if (res.status === 401 && auth.token && path !== '/api/login') {
    // 토큰이 만료됐거나(로그인 7일·게스트 30일) 서버가 모르는 토큰 — 저장된 토큰만 보고 로그인 상태로
    // 두면 화면은 로그인된 것처럼 보이는데 저장·조회가 전부 실패한다. 토큰을 지우고 다시 시작하게 한다.
    // 게스트는 다시 로그인할 방법이 없으니 새로고침(PrivateRoute가 새 게스트로 시작), 회원은 로그인 화면으로.
    const wasGuest = auth.isGuest;
    auth.signOut();
    if (wasGuest) window.location.reload();
    else window.location.assign('/login?expired=1');
  }
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

  /** 로그인 없이 시작 — 서버가 이름 없는 게스트 계정을 만들어 토큰을 준다(backend POST /api/guest) */
  startGuest: () =>
    USE_MOCK ? mockApi.startGuest() : request<LoginResponse>('/api/guest', { method: 'POST' }),

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
          // 모델이 아직 없는 축(null)은 빼고 보낸다
          body: JSON.stringify({ ...result, scores: Object.fromEntries(Object.entries(result.scores).filter(([, v]) => v !== null)) }),
        }),

  /** 1·2단계 하루 대화 — 방금 대답에 한 문장 반응 + 다음 질문으로 잇는 말. 서버가 AI를 못 쓰면 정해 둔 문장을 준다. */
  haruReply: (body: HaruReplyRequest) =>
    USE_MOCK
      ? mockApi.haruReply(body)
      : request<HaruReplyResponse>('/haru/reply', { method: 'POST', body: JSON.stringify(body) }),

  /** "하루가 이렇게 이해했어요" 카드 — 1·2단계 대답을 항목별로 짧게 정리(서버에 저장하지 않음). */
  haruProfile: (items: { label: string; question: string; answer: string }[]) =>
    USE_MOCK
      ? mockApi.haruProfile(items)
      : request<HaruProfileResponse>('/haru/profile', { method: 'POST', body: JSON.stringify({ items }) }),

  /** 실시간 촬영 결과 저장 — 2단계 이력(Stage2Result)에 쌓이고, 저장 직전 기록을 돌려준다. */
  saveLiveGazeBlink: (payload: LiveSavePayload) =>
    USE_MOCK
      ? mockApi.saveLiveGazeBlink()
      : request<LiveSaveResponse>('/analyze/gaze-blink/live', {
          method: 'POST',
          body: JSON.stringify(payload),
        }),

  // ── 3단계 면접 기록 (로그인 필요, 본인만) ─────────────────────────
  /** 면접 시작 — 세션을 만들고 id를 받는다. */
  startInterviewSession: (tier: string) =>
    USE_MOCK
      ? mockApi.startInterviewSession()
      : request<{ id: number }>('/interview/sessions', { method: 'POST', body: JSON.stringify({ tier }) }),

  /** 질문이 화면에 나올 때 질문 저장. */
  addInterviewTurn: (sessionId: number, kind: 'main' | 'follow_up', question: string) =>
    USE_MOCK
      ? mockApi.addInterviewTurn()
      : request<{ id: number; order: number }>(`/interview/sessions/${sessionId}/turns`, {
          method: 'POST',
          body: JSON.stringify({ kind, question }),
        }),

  /** 답변 텍스트 저장 (다시 호출하면 덮어씀). */
  saveInterviewAnswer: (sessionId: number, turnId: number, answer: string) =>
    USE_MOCK
      ? mockApi.ok()
      : request<{ message: string }>(`/interview/sessions/${sessionId}/turns/${turnId}/answer`, {
          method: 'PUT',
          body: JSON.stringify({ answer }),
        }),

  /** 면접을 끝까지 마쳤을 때 완료 처리. */
  completeInterviewSession: (sessionId: number) =>
    USE_MOCK
      ? mockApi.ok()
      : request<InterviewSessionSummary>(`/interview/sessions/${sessionId}/complete`, { method: 'POST' }),

  /** 면접 직후 코치 노트 — 이미 있으면 그대로, 없으면 서버 에이전트가 만든다(수 초~수십 초 걸릴 수 있음). */
  createCoachNote: (sessionId: number) =>
    USE_MOCK
      ? mockApi.createCoachNote()
      : request<CoachNoteResponse>(`/interview/sessions/${sessionId}/coach-note`, { method: 'POST' }),

  /** 맞춤 연습 힌트 — 질문 하나를 다시 답할 때의 시작 문장 틀·말하는 순서. 이전 답변을 보내면 그걸 바탕으로 맞춤. */
  getPracticeHint: (question: string, previousAnswer: string) =>
    USE_MOCK
      ? mockApi.getPracticeHint()
      : request<PracticeHintResponse>('/interview/practice-hint', {
          method: 'POST',
          body: JSON.stringify({ question, previous_answer: previousAnswer }),
        }),

  /** 면접 기록 삭제 — 질문·답변 텍스트가 함께 지워진다. */
  deleteInterviewSession: (sessionId: number) =>
    USE_MOCK
      ? mockApi.ok()
      : request<{ message: string }>(`/interview/sessions/${sessionId}`, { method: 'DELETE' }),

  /** 내 면접 목록(최신순) — 대시보드 완료 표시용. */
  /** 면접 1회 상세 — 최종 리포트 다시 보기에서 3단계 질문·답변을 불러올 때 */
  getInterviewSession: (sessionId: number) =>
    USE_MOCK
      ? mockApi.getInterviewSession()
      : request<InterviewSessionDetail>(`/interview/sessions/${sessionId}`),

  listInterviewSessions: () =>
    USE_MOCK
      ? mockApi.listInterviewSessions()
      : request<{ sessions: InterviewSessionSummary[] }>('/interview/sessions'),

  /** 저장된 최신 1단계(음성) 결과 — 재분석 없이 조회. 3단계 난이도 산정용. */
  latestStage1: () =>
    USE_MOCK
      ? mockApi.latestStage1()
      : request<LatestResponse<Stage1Latest>>('/analyze/stage1/latest'),

  /** 저장된 최신 2단계(표정·시선) 결과 — 재분석 없이 조회. 3단계 난이도 산정용. */
  latestGazeBlink: () =>
    USE_MOCK
      ? mockApi.latestGazeBlink()
      : request<LatestResponse<GazeBlinkLatest>>('/analyze/stage2/latest'),

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
