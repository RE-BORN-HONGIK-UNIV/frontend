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

/** POST /api/stage1/calibrate — 점수엔 반영 안 됨, filler 임계값 보정용 기준값. */
export interface CalibrationResult {
  background_noise_rms: number;
  background_peak_db: number;
  background_zcr: number | null;
  clipped_ratio: number;
  is_clipping: boolean;
  overall_peak_db: number;
  personal_filler_zcr: number | null;
  personal_breath_zcr: number | null;
}