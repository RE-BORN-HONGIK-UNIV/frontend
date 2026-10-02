/** Response shapes from the Flask backend (backend/app.py). */

export interface AnalyzeScores {
  stability: number;
  fluency: number;
  pause_ctrl: number;
  continuity: number;
  calm: number;
}

export interface AnalyzeResult {
  scores: AnalyzeScores;
  model_scores: Record<string, number>;
  probabilities: { tremor: number; prolongation: number; energy: number };
  filler_detail: {
    filler_count: number;
    sound_segment_count: number;
    filler_ratio_pct: number;
  };
  pause_detail: {
    pause_count: number;
    anxious_pause_count: number;
    anxious_pause_total_sec: number;
    anxious_pause_ratio: number;
    total_duration_sec: number;
  };
  cnn_window_count: number;
  demo_mode: boolean;
}

/** POST /analyze/feedback — LLM coaching paragraph, or null (falls back to template). */
export interface FeedbackResponse {
  feedback: string | null;
  source: 'llm' | 'template';
}

/** POST /analyze/gaze-blink — Step 2 (표정·시선) 분석 결과. */
export interface GazeBlinkResult {
  blink: {
    rate_per_min: number;
    status: string;
    score: number;
    events: { start: number; end: number }[];
    /** 깜빡임 순간만 이어붙인 짧은 mp4 (data URL), 만들 구간이 없으면 null */
    highlight: string | null;
  };
  gaze: {
    avg_fixation_sec: number;
    score: number;
    segments: { type: 'fixation' | 'aversion'; start: number; end: number }[];
    /** 시선을 피한 순간만 이어붙인 짧은 mp4 (data URL), 없으면 null */
    highlight: string | null;
  };
  expression: {
    smile_score: number;
    tension_score: number;
    score: number;
    status: string;
    smile_ratio: number;
    tension_ratio: number;
    frame_count: number;
    segments: { type: 'smile' | 'tension' | 'neutral'; start: number; end: number }[];
    /** 미소·긴장 순간만 이어붙인 짧은 mp4 (data URL), 없으면 null */
    highlight: string | null;
  };
  /** 로그인한 유저의 직전 2단계 기록 (서버 DB 조회) — 처음이면 null */
  previous: {
    at: string;
    blinkRatePerMin: number;
    avgFixationSec: number;
    smileRatio: number;
    tensionRatio: number;
  } | null;
}

/** POST /analyze/gaze-blink/live 요청 — 실시간 촬영 결과의 숫자 요약 (영상·구간 데이터 제외). */
export interface LiveSavePayload {
  blinkRatePerMin: number;
  blinkStatus: string;
  blinkScore: number;
  avgFixationSec: number;
  gazeScore: number;
  smileRatio: number;
  tensionRatio: number;
  expressionScore: number;
  expressionStatus: string;
}

/** POST /analyze/gaze-blink/live 응답 — 저장 직전의 2단계 기록(업로드·실시간 통합 이력), 처음이면 null. */
export interface LiveSaveResponse {
  previous: GazeBlinkResult['previous'];
}

/** GET /analyze/stage1/latest — 저장된 가장 최근 1단계(음성) 결과. 기록이 없으면 result: null. */
export interface Stage1Latest {
  at: string;
  stability: number;
  fluency: number;
  pauseCtrl: number;
  continuity: number;
  calm: number;
  /** 5축 평균 (0~100, 높을수록 안정적) */
  overallScore: number;
}

/** GET /analyze/stage2/latest — 저장된 가장 최근 2단계(표정·시선) 결과. 기록이 없으면 result: null. */
export interface GazeBlinkLatest {
  at: string;
  blinkScore: number;
  blinkStatus: string;
  gazeScore: number;
  expressionScore: number;
  expressionStatus: string;
  /** 깜빡임·시선·표정 점수 평균 (0~100, 높을수록 안정적) */
  overallScore: number;
}

/** GET /interview/sessions — 면접 1회 요약 (질문·답변 본문은 제외). completedAt이 null이면 끝까지 마치지 않은 면접. */
export interface InterviewSessionSummary {
  id: number;
  tier: 'warmup' | 'standard' | 'practice';
  startedAt: string;
  completedAt: string | null;
  turnCount: number;
}

/** 면접 직후 코치 노트 — 서버(coach/)가 만들고 검증한 것. 카드(다음 한 걸음)는 서버 코드가 정한 4종류. */
export type CoachCardKind = 'again' | 'light_practice' | 'daily_mission' | 'rest';

export interface CoachCard {
  kind: CoachCardKind;
  title: string;
  body: string;
  /** light_practice 카드가 보낼 화면 (/voice 또는 /face) — practiceTurn이 없을 때만 */
  path?: string;
  /** light_practice 카드: 방금 면접에서 한 번 더 답해볼 질문의 순번(0부터). 있으면 맞춤 연습 화면으로 간다 */
  practiceTurn?: number;
}

export interface CoachNote {
  greeting: string;
  /** 오늘 해낸 것 (행동 기준, 점수 아님) */
  won: string[];
  /** 사용자의 답변에서 글자 그대로 인용한 잘한 문장 — 서버가 원문과 대조해 검증한 것만 옴 */
  quote: { text: string; why: string } | null;
  recommended: CoachCardKind;
  cards: CoachCard[];
  /** 위기 신호가 감지됐을 때만 — 코칭 대신 돌봄 안내 */
  care: { body: string; resources: string } | null;
}

export interface CoachNoteResponse {
  note: CoachNote;
  /** llm: AI가 작성 / fallback: AI를 못 써서 사실만 말하는 대체 노트 / care: 돌봄 안내 */
  source: 'llm' | 'fallback' | 'care';
}

/** POST /interview/practice-hint — 맞춤 연습의 힌트 (AI가 만들었거나 일반 힌트) */
export interface PracticeHintResponse {
  hint: { opening: string; steps: string[] };
  source: 'llm' | 'fallback';
}

export interface LatestResponse<T> {
  result: T | null;
}

export interface LoginResponse {
  token: string;
  name: string;
}

export interface SignupPayload {
  email: string;
  password: string;
  name: string;
  nickname?: string;
  birthdate?: string;
  terms_agreed: boolean;
}

/** '이야기' 자유 게시판 — 목록에 쓰는 요약 shape. */
export interface PostSummary {
  id: number;
  title: string;
  content: string;
  author: string;
  created_at: string;
  comment_count: number;
  is_own: boolean;
}

export interface CommentItem {
  id: number;
  content: string;
  author: string;
  created_at: string;
  is_own: boolean;
}

/** GET /community/posts/<id> — 상세 화면(댓글 포함). */
export interface PostDetail extends PostSummary {
  comments: CommentItem[];
}
