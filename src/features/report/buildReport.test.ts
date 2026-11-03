import { describe, expect, it } from 'vitest';
import type { AnalyzeResult, GazeBlinkResult } from '@/lib/api/types';
import { TRAINING_TIPS } from '@/features/voice/constants';
import { buildFaceReport, buildSummary, buildVoiceReport, FIRST_WORDS_SEC } from './buildReport';

const analyze = (over: Partial<AnalyzeResult> = {}): AnalyzeResult => ({
  scores: { stability: 80, fluency: 60, pause_ctrl: 40, continuity: 90, calm: 76 },
  model_scores: {},
  probabilities: { tremor: 0, prolongation: 0, energy: 0 },
  filler_detail: {
    filler_count: 3,
    sound_segment_count: 10,
    filler_ratio_pct: 30,
    events: [
      { text: '음', start: 0.5, end: 0.8 },
      { text: '음', start: 20.4, end: 20.7 },
      { text: '그', start: 50, end: 50.2 },
    ],
  },
  pause_detail: {
    pause_count: 4,
    anxious_pause_count: 2,
    anxious_pause_total_sec: 6,
    anxious_pause_ratio: 0.06,
    total_duration_sec: 100,
    long_pauses: [
      { start: 30, end: 33.2, duration: 3.2 },
      { start: 70, end: 71.5, duration: 1.5 },
    ],
  },
  cnn_window_count: 10,
  demo_mode: false,
  ...over,
});

describe('말하기 습관 (1단계)', () => {
  it('점수는 칩의 세 구간을 고르는 데만 쓰고, 화면 문구엔 점수 숫자가 없다', () => {
    const r = buildVoiceReport({ at: 'x', result: analyze() });
    expect(r.habits.map((h) => h.chip.tone)).toEqual(['g', 'y', 'p', 'g', 'g']);
    r.habits.forEach((h) => {
      expect(h.line).not.toMatch(/\d+\s*점/);
      expect(h.chip.text).not.toMatch(/\d+\s*점/);
    });
  });

  it('채움말은 말별 횟수와 녹음 안 위치(%)로, 첫마디에 몰렸으면 그렇게 말한다', () => {
    const r = buildVoiceReport({ at: 'x', result: analyze(), turnStarts: [0, 20, 45] });
    expect(r.fillers?.words).toEqual([
      ['음', 2],
      ['그', 1],
    ]);
    expect(r.fillers?.ticks).toEqual([0.5, 20.4, 50]);
    // 0.5초(대답1 시작 0초), 20.4초(대답2 시작 20초)는 첫마디 → 3개 중 2개
    expect(FIRST_WORDS_SEC).toBe(3);
    expect(r.fillers?.line).toContain('시작하자마자');
    expect(r.fillers?.chip.text).toBe('가끔 나와요 · 3번');
  });

  it('긴 멈춤은 위치·길이로 표시하고 가장 긴 멈춤을 말한다', () => {
    const r = buildVoiceReport({ at: 'x', result: analyze() });
    expect(r.pauses?.marks[0]).toEqual({ left: 30, width: 3.2, label: '3.2초' });
    expect(r.pauses?.line).toContain('3.2초');
  });

  it('위치 목록이 없는 예전 서버 응답이면 세부 카드를 만들지 않는다 (지어내지 않음)', () => {
    const old = analyze();
    delete old.filler_detail.events;
    delete old.pause_detail.long_pauses;
    const r = buildVoiceReport({ at: 'x', result: old });
    expect(r.fillers).toBeNull();
    expect(r.pauses).toBeNull();
  });

  it('다른 기기라 서버 요약 점수만 있으면 오각형과 칩만 만든다', () => {
    const r = buildVoiceReport({
      at: 'x',
      latest: { at: 'x', stability: 90, fluency: 90, pauseCtrl: 90, continuity: 90, calm: 50, overallScore: 82 },
    });
    expect(r.fillers).toBeNull();
    expect(r.spokenSec).toBeNull();
    expect(r.habits[4].chip.tone).toBe('p');
    expect(r.tip).toBeTruthy(); // 가장 연습할 축(에너지)의 연습 제안
  });

  it('모든 축이 좋으면 연습 제안을 따로 띄우지 않는다', () => {
    const r = buildVoiceReport({ at: 'x', result: analyze({ scores: { stability: 90, fluency: 90, pause_ctrl: 90, continuity: 90, calm: 90 } }) });
    expect(r.tip).toBeNull();
  });
  it('분석 모델이 아직 없는 축(서버가 null)은 0점이 아니라 "준비 중"으로 둔다', () => {
    // 떨림(stability)·에너지(calm) 모델이 없는 경우 — 0점으로 읽으면 "자주 흔들렸어요"가 된다
    const r = buildVoiceReport({
      at: 'x',
      result: analyze({ scores: { stability: null, fluency: 90, pause_ctrl: 40, continuity: 90, calm: null } }),
    });
    expect(r.habits[0].chip).toEqual({ tone: 'n', text: '준비 중' });
    expect(r.habits[4].chip).toEqual({ tone: 'n', text: '준비 중' });
    expect(r.habits[0].flow[0]).toBeNull();
    expect(r.v[0]).toBeNull();
    expect(r.v[4]).toBeNull();
    expect(r.v[1]).toBe(0.9);
    // 연습 팁은 값이 있는 축 중 가장 낮은 침묵 조절에서 고른다
    expect(r.tip).toBe(TRAINING_TIPS.pause_ctrl);
    // 정리에도 '준비 중' 축은 들어가지 않는다
    const { good, next } = buildSummary(r, null);
    expect(good).toEqual(['"음, 어"가 적어요', '또박또박']);
    expect(next).toEqual(['오래 멈추기']);
  });

  it('참고용 모델(시험 미통과) 판정은 참고용이라고 붙이고 정리·연습 팁에는 쓰지 않는다', () => {
    const r = buildVoiceReport({
      at: 'x',
      result: analyze({
        scores: { stability: 20, fluency: 90, pause_ctrl: 90, continuity: 90, calm: 90 },
        model_status: { tremor: 'reference', prolongation: 'ready', energy: 'ready' },
      }),
    });
    expect(r.habits[0].chip).toEqual({ tone: 'p', text: '자주 흔들렸어요 · 참고용' });
    expect(r.habits[0].line).toContain('참고만');
    expect(r.habits[3].reference).toBe(false);
    expect(r.tip).toBeNull();
    expect(buildSummary(r, null).next).toEqual([]);
  });
});

const gaze = (): GazeBlinkResult => ({
  blink: { rate_per_min: 22.4, status: '정상', score: 100, events: [], highlight: null },
  gaze: { avg_fixation_sec: 3.6, score: 60, segments: [{ type: 'fixation', start: 0, end: 4 }], highlight: null },
  expression: {
    smile_score: 40, tension_score: 70, score: 40, status: '긴장됨', smile_ratio: 0.12, tension_ratio: 0.06, frame_count: 100,
    segments: [], highlight: null,
  },
  previous: null,
});

describe('시선과 표정 (2단계)', () => {
  it('실제 값(횟수·초·비율)과 사용자에게 보이는 상태 말로 만든다', () => {
    const r = buildFaceReport({ at: 'x', result: gaze() });
    expect(r.blink.big).toBe('1분에 22번');
    expect(r.blink.chip).toEqual({ tone: 'g', text: '편안한 범위예요' });
    expect(r.gaze.big).toBe('평균 3.6초');
    expect(r.expr.chip).toEqual({ tone: 'p', text: '굳은 순간이 있었어요' });
    expect(r.expr.smilePct).toBe(12);
  });

  it('서버 요약만 있으면 숫자 없이 칩만', () => {
    const r = buildFaceReport({
      at: 'x',
      latest: { at: 'x', blinkScore: 100, blinkStatus: '정상', gazeScore: 80, expressionScore: 60, expressionStatus: '보통', overallScore: 80 },
    });
    expect(r.blink.big).toBeNull();
    expect(r.expr.smilePct).toBeNull();
    expect(r.expr.chip.text).toBe('평소 표정이었어요');
  });
});

describe('이번 연습 정리', () => {
  it('좋은 구간은 "잘하고 있어요", 낮은 구간만 "연습하면 좋아져요"에 넣는다(중간은 어디에도 안 넣음)', () => {
    const s = buildSummary(buildVoiceReport({ at: 'x', result: analyze() }), buildFaceReport({ at: 'x', result: gaze() }));
    expect(s.good).toEqual(['고른 목소리', '또박또박', '끝까지 또렷하게', '편안한 깜빡임']);
    expect(s.next).toEqual(['오래 멈추기', '표정 풀기']);
  });
});

describe('아직 값이 없는 칸 (값이 오면 그려짐)', () => {
  it('서버가 안 주면 null → 화면은 "준비 중"', () => {
    const r = buildVoiceReport({ at: 'x', result: analyze() });
    expect(r.prolong).toBeNull();
    expect(r.energy).toBeNull();
    expect(r.tremor).toBeNull();
    expect(r.habits[0].flow).toEqual([80, null, null]);
    const f = buildFaceReport({ at: 'x', result: gaze() });
    expect(f.blink.perQ).toBeNull();
    expect(f.gaze.perQ).toBeNull();
  });

  it('서버가 정해 둔 이름으로 주면 그대로 채운다', () => {
    const r = buildVoiceReport(
      {
        at: 'x',
        result: analyze({
          prolong_detail: { events: [{ text: '저어', start: 63, end: 63.5 }] },
          energy_detail: { sentence_bars: [80, 70, 60] },
          tremor_detail: { curve: [0.2, 1.4, -1] },
        }),
      },
      { stage3: analyze({ scores: { stability: 70, fluency: 50, pause_ctrl: 60, continuity: 80, calm: 70 } }) },
    );
    expect(r.prolong?.items).toEqual([{ word: '저어', at: '1:03' }]);
    expect(r.energy?.line).toContain('처음의 75%');
    expect(r.tremor?.curve).toEqual([0.2, 1, 0]); // 0~1 밖은 잘라냄
    expect(r.habits[0].flow).toEqual([80, null, 70]);
  });

  it('질문별 값과 표정 비율', () => {
    const f = buildFaceReport({ at: 'x', result: { ...gaze(), per_question: { blink_per_min: [20, 25], gaze_avg_sec: [3, 4] } } });
    expect(f.blink.perQ).toEqual([20, 25]);
    expect(f.gaze.perQ).toEqual([3, 4]);
    expect(f.expr.emo).toEqual({ smile: 12, neutral: 82, tension: 6 });
  });
});


describe('2단계 — 어떻게 쟀는지와 얼굴이 자주 벗어났을 때 안내', () => {
  it('대답하는 동안만 쟀으면 그렇게 말하고, 얼굴이 잘 보였으면 안내가 없다', () => {
    const r = buildFaceReport({ at: 'x', result: { ...gaze(), measured_scope: 'answer', face_visible_ratio: 0.95 } });
    expect(r.scope).toContain('대답하는 동안');
    expect(r.caution).toBeNull();
  });

  it('잰 동안 얼굴이 잡힌 비율이 70% 미만이면 결과를 그대로 믿기 어렵다고 알린다', () => {
    const r = buildFaceReport({ at: 'x', result: { ...gaze(), measured_scope: 'answer', face_visible_ratio: 0.6 } });
    expect(r.caution).toContain('얼굴이 카메라에서 벗어난');
  });

  it('예전 기록(비율 없음)은 안내 없이 원래 문구', () => {
    const r = buildFaceReport({ at: 'x', result: gaze() });
    expect(r.scope).not.toContain('대답하는 동안');
    expect(r.caution).toBeNull();
  });
});
