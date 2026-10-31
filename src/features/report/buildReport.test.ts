import { describe, expect, it } from 'vitest';
import type { AnalyzeResult, GazeBlinkResult } from '@/lib/api/types';
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
