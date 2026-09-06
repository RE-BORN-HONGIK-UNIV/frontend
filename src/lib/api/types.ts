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
