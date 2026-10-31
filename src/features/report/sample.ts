import type { AnalyzeResult } from '@/lib/api/types';
import type { InterviewResult } from '@/features/interview/resultSummary';
import type { StageDetails } from './stageDetails';

/**
 * 예시 리포트(/report/sample)에 쓰는 값 — 실제 사용자의 기록이 아니다. 판넬·팀 확인용으로 리포트 모양을
 * 보여 주려고 만든 값이고, 화면에도 "예시"라고 크게 표시한다. 실제 리포트(/report, 3단계 결과)에는 쓰지 않는다.
 * 숫자는 각 분석이 실제로 내는 형태(채움말 위치, 긴 멈춤 초, 깜빡임 횟수, 구간)를 그대로 따른다.
 */
/** 흐름 막대용 다른 단계 목소리 분석 예시 — 점수만 쓰고 나머지는 비워 둔다 */
function voiceAt(scores: AnalyzeResult['scores']): AnalyzeResult {
  return {
    scores,
    model_scores: {},
    probabilities: { tremor: 0, prolongation: 0, energy: 0 },
    filler_detail: { filler_count: 0, sound_segment_count: 0, filler_ratio_pct: 0 },
    pause_detail: { pause_count: 0, anxious_pause_count: 0, anxious_pause_total_sec: 0, anxious_pause_ratio: 0, total_duration_sec: 0 },
    cnn_window_count: 0,
    demo_mode: false,
  };
}

export const SAMPLE_DETAILS: StageDetails = {
  stage1: {
    at: '2026-10-31T10:00:00Z',
    turnStarts: [0, 30, 60, 90],
    result: {
      scores: { stability: 80, fluency: 60, pause_ctrl: 50, continuity: 90, calm: 76 },
      model_scores: {},
      probabilities: { tremor: 0, prolongation: 0, energy: 0 },
      filler_detail: {
        filler_count: 5,
        sound_segment_count: 20,
        filler_ratio_pct: 25,
        events: [
          { text: '음', start: 1, end: 1.3 },
          { text: '음', start: 31, end: 31.2 },
          { text: '그', start: 47, end: 47.3 },
          { text: '약간', start: 80, end: 80.4 },
          { text: '음', start: 91, end: 91.2 },
        ],
      },
      pause_detail: {
        pause_count: 6,
        anxious_pause_count: 2,
        anxious_pause_total_sec: 5.4,
        anxious_pause_ratio: 0.05,
        total_duration_sec: 120,
        long_pauses: [
          { start: 20, end: 23.4, duration: 3.4 },
          { start: 66, end: 68, duration: 2 },
        ],
      },
      cnn_window_count: 10,
      demo_mode: false,
      // ↓ 아직 서버가 안 주는 값 — 예시 화면에서만 "값이 오면 이렇게 보인다"를 보여 주려고 넣음
      prolong_detail: {
        events: [
          { text: '저어', start: 33, end: 33.6 },
          { text: '그으', start: 84, end: 84.5 },
        ],
      },
      energy_detail: { sentence_bars: [88, 92, 90, 86, 88, 84, 85, 82, 80, 81] },
      tremor_detail: { curve: [0.5, 0.42, 0.55, 0.62, 0.68, 0.7, 0.73, 0.76, 0.74, 0.79, 0.77, 0.79, 0.78].map((v) => 1 - v) },
    },
  },
  stage2Voice: { at: '2026-10-31T10:10:00Z', result: voiceAt({ stability: 78, fluency: 64, pause_ctrl: 66, continuity: 86, calm: 76 }) },
  stage3Voice: { at: '2026-10-31T10:32:00Z', result: voiceAt({ stability: 82, fluency: 58, pause_ctrl: 82, continuity: 88, calm: 78 }) },
  stage3Marks: [
    {
      question: '간단히 자기소개를 해 주시겠어요?',
      script:
        '[f:음] 저는 [l:저어는] 요리하는 걸 좋아하는 사람이에요. [f:음] 요즘은 [f:약간] 영상을 보면서 집에서 반찬을 만들어 보고 있고요, [p:3초 멈춤] [k:그러면서 순서를 정해서 하나씩 끝내는 게 재미있다는 걸 알게 됐어요.]',
    },
  ],
  stage2: {
    at: '2026-10-31T10:10:00Z',
    result: {
      blink: { rate_per_min: 22, status: '정상', score: 100, events: [], highlight: null },
      gaze: {
        avg_fixation_sec: 3.6,
        score: 80,
        highlight: null,
        segments: [
          { type: 'fixation', start: 0, end: 3 },
          { type: 'aversion', start: 3, end: 3.8 },
          { type: 'fixation', start: 3.8, end: 8 },
          { type: 'aversion', start: 8, end: 8.5 },
          { type: 'fixation', start: 8.5, end: 14 },
        ],
      },
      expression: {
        smile_score: 40,
        tension_score: 70,
        score: 50,
        status: '긴장됨',
        smile_ratio: 0.18,
        tension_ratio: 0.06,
        frame_count: 400,
        highlight: null,
        segments: [
          { type: 'tension', start: 0, end: 1.4 },
          { type: 'neutral', start: 1.4, end: 4 },
          { type: 'smile', start: 4, end: 5 },
          { type: 'neutral', start: 5, end: 12 },
        ],
      },
      previous: { at: '2026-10-24T10:00:00Z', blinkRatePerMin: 19, avgFixationSec: 2.4, smileRatio: 0.12, tensionRatio: 0.09 },
      per_question: { blink_per_min: [28, 21, 19, 22], gaze_avg_sec: [2.1, 3.4, 4.0, 3.8] },
    },
  },
};

/** sessionId가 null이라 코치 노트를 요청하지 않고(AI 호출 없음) 기본 카드만 보인다. */
export const SAMPLE_INTERVIEW: InterviewResult = {
  sessionId: null,
  startedAt: Date.parse('2026-10-31T10:20:00Z'),
  endedAt: Date.parse('2026-10-31T10:32:00Z'),
  turns: [
    { kind: 'main', question: '간단히 자기소개를 해 주시겠어요?', answer: '저는 요리하는 걸 좋아하는 사람이에요. 요즘은 집에서 반찬을 만들어 보고 있어요.' },
    { kind: 'follow_up', question: '반찬을 만들면서 어떤 점이 재미있으세요?', answer: '순서를 정해서 하나씩 끝내는 게 재미있어요.' },
    { kind: 'main', question: '편의점에서 일할 때 기억에 남는 일이 있나요?', answer: '바쁜 시간에 진열을 끝까지 마쳤던 게 기억나요.' },
    { kind: 'main', question: '맡은 일을 끝까지 하는 점이 일할 때 어떤 도움이 될까요?', answer: '' },
    { kind: 'main', question: '마지막으로 하고 싶은 말이 있으세요?', answer: '천천히지만 꾸준히 하겠습니다.' },
  ],
};
