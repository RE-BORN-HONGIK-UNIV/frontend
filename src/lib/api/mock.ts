import { auth } from '@/lib/auth';
import type {
  AnalyzeResult,
  CommentItem,
  FeedbackResponse,
  GazeBlinkResult,
  LoginResponse,
  PostDetail,
  PostSummary,
} from './types';

/** 백엔드 없이 프론트만 돌릴 때(VITE_USE_MOCK_API=true) 쓰는 가짜 응답들.
 * 실제 fetch 왕복 느낌을 주려고 약간의 지연만 흉내낸다. */
const MOCK_LATENCY_MS = 400;
const delay = (ms = MOCK_LATENCY_MS) => new Promise((r) => setTimeout(r, ms));

let mockPostSeq = 2;
let mockPosts: PostSummary[] = [
  {
    id: 2,
    title: '오늘 처음으로 발표 연습 끝까지 해봤어요',
    content: '떨렸지만 중간에 멈추지 않고 끝까지 말했다는 것만으로도 스스로 뿌듯했어요. 다들 화이팅이에요.',
    author: '익명의 새싹',
    created_at: new Date(Date.now() - 3600_000).toISOString(),
    comment_count: 1,
    is_own: false,
  },
  {
    id: 1,
    title: '비슷한 고민 있으신 분 계세요?',
    content: '사람들 앞에서 말할 때마다 목소리가 떨려서 고민이에요. 다들 어떻게 극복하고 계신가요?',
    author: '조용한하루',
    created_at: new Date(Date.now() - 86_400_000).toISOString(),
    comment_count: 1,
    is_own: false,
  },
];
const mockComments: Record<number, CommentItem[]> = {
  1: [
    {
      id: 1,
      content: '저도 똑같아요. 천천히 연습하다 보면 조금씩 나아지더라고요!',
      author: '익명의 새싹',
      created_at: new Date(Date.now() - 80_000_000).toISOString(),
      is_own: false,
    },
  ],
  2: [
    {
      id: 1,
      content: '진짜 대단해요, 저도 오늘 용기 내볼게요',
      author: '조용한하루',
      created_at: new Date(Date.now() - 3_000_000).toISOString(),
      is_own: false,
    },
  ],
};

export const mockApi = {
  async login(): Promise<LoginResponse> {
    await delay();
    return { token: 'mock-token', name: '목업 사용자' };
  },

  async signup(): Promise<{ message: string }> {
    await delay();
    return { message: '회원가입이 완료됐어요. (mock)' };
  },

  async analyze(): Promise<AnalyzeResult> {
    await delay();
    return {
      scores: { stability: 78, fluency: 72, pause_ctrl: 65, continuity: 80, calm: 70 },
      model_scores: { prolongation: 81, energy: 77, tremor: 67 },
      probabilities: { tremor: 0.18, prolongation: 0.22, energy: 0.15 },
      filler_detail: { filler_count: 4, sound_segment_count: 32, filler_ratio_pct: 12.5 },
      pause_detail: {
        pause_count: 9,
        anxious_pause_count: 2,
        anxious_pause_total_sec: 3.4,
        anxious_pause_ratio: 0.22,
        total_duration_sec: 45.2,
      },
      cnn_window_count: 14,
      demo_mode: true,
    };
  },

  async feedback(): Promise<FeedbackResponse> {
    await delay();
    return {
      feedback:
        '(mock) 전반적으로 안정적인 발화였어요. 멈춤 구간이 조금 길게 나타난 부분이 있으니, 다음엔 문장을 짧게 끊어 말하는 연습을 해보면 좋겠어요.',
      source: 'template',
    };
  },

  // ── '이야기' 자유 게시판 — 세션 동안만 유지되는 인메모리 mock ──
  async listPosts(): Promise<{ posts: PostSummary[] }> {
    await delay();
    return { posts: [...mockPosts].sort((a, b) => b.id - a.id) };
  },

  async createPost(title: string, content: string): Promise<PostSummary> {
    await delay();
    const post: PostSummary = {
      id: ++mockPostSeq,
      title,
      content,
      author: auth.name || '목업 사용자',
      created_at: new Date().toISOString(),
      comment_count: 0,
      is_own: true,
    };
    mockPosts.push(post);
    mockComments[post.id] = [];
    return post;
  },

  async getPost(id: number): Promise<PostDetail> {
    await delay();
    const post = mockPosts.find((p) => p.id === id);
    if (!post) throw new Error('글을 찾을 수 없습니다.');
    return { ...post, comments: mockComments[id] ?? [] };
  },

  async deletePost(id: number): Promise<{ message: string }> {
    await delay();
    mockPosts = mockPosts.filter((p) => p.id !== id);
    delete mockComments[id];
    return { message: '삭제됐어요. (mock)' };
  },

  async createComment(postId: number, content: string): Promise<CommentItem> {
    await delay();
    const comment: CommentItem = {
      id: mockComments[postId]?.length ? Math.max(...mockComments[postId].map((c) => c.id)) + 1 : 1,
      content,
      author: auth.name || '목업 사용자',
      created_at: new Date().toISOString(),
      is_own: true,
    };
    mockComments[postId] = [...(mockComments[postId] ?? []), comment];
    const post = mockPosts.find((p) => p.id === postId);
    if (post) post.comment_count += 1;
    return comment;
  },

  async analyzeGazeBlink(): Promise<GazeBlinkResult> {
    await delay();
    return {
      blink: {
        rate_per_min: 18,
        status: '정상 범위',
        score: 82,
        events: [{ start: 2.1, end: 2.3 }, { start: 9.0, end: 9.2 }],
        highlight: null,
      },
      gaze: {
        avg_fixation_sec: 3.6,
        score: 74,
        segments: [
          { type: 'fixation', start: 0, end: 3.5 },
          { type: 'aversion', start: 3.5, end: 3.8 },
          { type: 'fixation', start: 3.8, end: 12 },
        ],
        highlight: null,
      },
      expression: {
        smile_score: 45,
        tension_score: 30,
        score: 68,
        status: '보통',
        smile_ratio: 0.12,
        tension_ratio: 0.08,
        frame_count: 450,
        segments: [
          { type: 'neutral', start: 0, end: 4 },
          { type: 'smile', start: 4, end: 6 },
          { type: 'neutral', start: 6, end: 9 },
          { type: 'tension', start: 9, end: 10.5 },
          { type: 'neutral', start: 10.5, end: 15 },
        ],
        highlight: null,
      },
      previous: null,
    };
  },
};
