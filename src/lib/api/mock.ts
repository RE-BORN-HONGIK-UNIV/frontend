import type {
  AnalyzeResult,
  FeedbackResponse,
  GazeBlinkResult,
  LoginResponse,
} from './types';

/** 백엔드 없이 프론트만 돌릴 때(VITE_USE_MOCK_API=true) 쓰는 가짜 응답들.
 * 실제 fetch 왕복 느낌을 주려고 약간의 지연만 흉내낸다. */
const MOCK_LATENCY_MS = 400;
const delay = (ms = MOCK_LATENCY_MS) => new Promise((r) => setTimeout(r, ms));

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
        segments: [{ type: 'neutral', start: 0, end: 15 }],
        highlight: null,
      },
      previous: null,
    };
  },
};
