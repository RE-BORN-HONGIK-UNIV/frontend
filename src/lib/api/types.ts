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
    /** 점수에 반영된 채움말이 언제 나왔는지 (2026-10 추가 — 그 전 서버는 안 줌) */
    events?: { text: string; start: number; end: number }[];
  };
  pause_detail: {
    pause_count: number;
    anxious_pause_count: number;
    anxious_pause_total_sec: number;
    anxious_pause_ratio: number;
    total_duration_sec: number;
    /** 긴 멈춤이 언제 몇 초였는지 (2026-10 추가 — 그 전 서버는 안 줌) */
    long_pauses?: { start: number; end: number; duration: number }[];
  };
  cnn_window_count: number;
  demo_mode: boolean;
  /*
   * ── 최종 리포트의 "준비 중" 칸을 채울 값 (아직 서버가 안 줌) ──────────────────
   * 백엔드가 /analyze 응답에 아래 이름으로 넣어 주면 리포트(features/report/buildReport.ts)가 바로 그린다.
   * 없으면 그 칸은 "준비 중"으로 보인다. 지어낸 값을 보여 주지 않기 위해 프론트에서 추정하지 않는다.
   */
  /** 소리를 길게 늘인 순간 — text: 늘인 말(예: "저어"), start/end: 녹음 안 초 */
  prolong_detail?: { events: { text: string; start: number; end: number }[] };
  /** 한 문장 안 목소리 크기를 문장 처음→끝으로 나눈 평균(0~100, 보통 10칸). 끝이 흐려지는지 보는 막대 */
  energy_detail?: { sentence_bars: number[] };
  /** 시간 순 목소리 떨림 정도(0~1, CNN 조각마다). 0에 가까울수록 고름 */
  tremor_detail?: { curve: number[] };
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
  /** 질문별 값 (아직 안 만듦 — 통화 중 질문이 바뀐 시각으로 나누면 계산 가능). 있으면 리포트가 질문별 막대로 그린다 */
  per_question?: { blink_per_min: number[]; gaze_avg_sec: number[] };
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

/** GET /interview/sessions/<id> — 면접 1회 상세 (질문·답변 텍스트 포함, 본인 것만) */
export interface InterviewSessionDetail extends InterviewSessionSummary {
  turns: { id: number; order: number; kind: 'main' | 'follow_up'; question: string; answer: string | null; askedAt: string; answeredAt: string | null }[];
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
/** POST /haru/reply — 하루(1·2단계 대화 상대)의 반응 한마디. care: 위기 신호가 있어 AI로 보내지 않은 경우. */
export interface HaruReplyRequest {
  question: string;
  answer: string;
  next: string | null;
  retried: boolean;
  index: number;
  history: { ai: boolean; text: string }[];
}
export interface HaruReplyResponse {
  say: string;
  retry: boolean;
  source: 'llm' | 'fallback' | 'care';
}

/** POST /haru/profile — "하루가 이렇게 이해했어요" 카드 항목. */
export interface HaruProfileItem {
  label: string;
  value: string;
}
export interface HaruProfileResponse {
  items: HaruProfileItem[];
  source: 'llm' | 'fallback' | 'care';
}

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