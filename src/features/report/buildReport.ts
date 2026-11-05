import type { AnalyzeResult, CnnLabel, GazeBlinkLatest, GazeBlinkResult, Stage1Latest } from '@/lib/api/types';
import { scoreTier, type ScoreTier } from '@/lib/scoreColor';
import { TRAINING_TIPS, type AxisKey } from '@/features/voice/constants';
import { extractMetrics, COMPARISON_BUILDERS } from '@/features/face/comparison';

/**
 * 최종 통합 리포트(3단계 뒤) 화면 모델 — 경량 웹 report.ts의 Report 모양을 실제 분석 값으로 채운다.
 * 경량 웹은 값이 전부 고정 예시였고, 여기서는 1단계(/analyze)·2단계(실시간 분석) 결과에서 만든다.
 * 값이 없는 칸(문장 끝 에너지 막대, 떨림 곡선, 질문별 음성 표시)은 만들지 않는다 — 지어낸 값을 보여 주지 않기 위해.
 *
 * 점수 숫자(0~100)는 화면에 내보내지 않는다. 점수는 상태 칩의 세 구간(scoreTier: 75+/55+/그 미만 — 기존
 * scoreColor와 같은 경계)을 고르는 데만 쓰고, 화면에는 "가끔 나와요" 같은 말과 실제로 센 횟수·초만 보인다.
 */

export type Tone = 'g' | 'y' | 'p' | 'n'; // 초록 지금처럼 / 노랑 가끔 / 주황 다음 연습 포인트 / 회색 준비 중(분석 모델이 아직 없음)
export interface Chip {
  tone: Tone;
  text: string;
}
const TONE: Record<ScoreTier, Tone> = { good: 'g', mid: 'y', low: 'p' };

interface AxisCopy {
  name: string;
  easy: string;
  line: Record<ScoreTier, string>;
  chip: Record<ScoreTier, string>;
  good: string; // "잘하고 있어요" 칩
  next: string; // "연습하면 좋아져요" 칩
}

/** 오각형 축 순서 (경량 웹과 같음): 안정성·유창성·침묵 조절·지속성·에너지 */
export const VOICE_AXES: AxisKey[] = ['stability', 'fluency', 'pause_ctrl', 'continuity', 'calm'];
export const VOICE_AXIS_LABELS = ['안정성', '유창성', '침묵 조절', '지속성', '에너지'];

/** CNN 축 → 서버 라벨 (backend app.py: stability=떨림, continuity=연장, calm=에너지) */
const CNN_AXIS_LABEL: Partial<Record<AxisKey, CnnLabel>> = { stability: 'tremor', continuity: 'prolongation', calm: 'energy' };

const AXIS_COPY: Record<AxisKey, AxisCopy> = {
  stability: {
    name: '음성 안정성', easy: '목소리 떨림',
    line: { good: '목소리가 처음부터 끝까지 고르게 나왔어요.', mid: '가끔 목소리가 살짝 흔들렸어요.', low: '목소리가 흔들린 순간이 여러 번 있었어요.' },
    chip: { good: '고르게 나왔어요', mid: '가끔 흔들렸어요', low: '자주 흔들렸어요' },
    good: '고른 목소리', next: '목소리 떨림',
  },
  fluency: {
    name: '발화 유창성', easy: '"음, 어" 같은 말',
    line: { good: '"음, 어" 같은 말이 거의 없었어요.', mid: '"음, 어" 같은 말이 가끔 나왔어요.', low: '"음, 어" 같은 말이 자주 나왔어요.' },
    chip: { good: '거의 없어요', mid: '가끔 나와요', low: '자주 나와요' },
    good: '"음, 어"가 적어요', next: '"음, 어" 줄이기',
  },
  pause_ctrl: {
    name: '침묵 조절력', easy: '오래 멈추기',
    line: { good: '멈춤이 적당했어요. 짧게 숨 고르는 멈춤은 오히려 자연스러워요.', mid: '가끔 오래 멈췄어요.', low: '오래 멈춘 순간이 여러 번 있었어요.' },
    chip: { good: '적당해요', mid: '가끔 길어요', low: '자주 길어요' },
    good: '적당한 멈춤', next: '오래 멈추기',
  },
  continuity: {
    name: '발화 지속성', easy: '소리 늘이기',
    line: { good: '소리를 늘이지 않고 또박또박 이어 갔어요.', mid: '"저어는"처럼 소리를 늘인 순간이 가끔 있었어요.', low: '소리를 길게 늘인 순간이 자주 있었어요.' },
    chip: { good: '또박또박해요', mid: '가끔 늘였어요', low: '자주 늘였어요' },
    good: '또박또박', next: '소리 늘이기',
  },
  calm: {
    name: '발화 에너지', easy: '끝까지 또렷하게',
    line: { good: '문장 끝까지 또렷하게 말했어요.', mid: '문장 끝이 가끔 작아졌어요.', low: '문장 끝이 자주 작아졌어요.' },
    chip: { good: '끝까지 또렷해요', mid: '가끔 작아져요', low: '자주 작아져요' },
    good: '끝까지 또렷하게', next: '문장 끝 또렷하게',
  },
};

/** "첫마디"로 보는 범위: 대답을 시작하고 이 초 안. 화면 문구("시작하자마자 몰려 있어요")를 고르는 데만 쓰고
 * 점수엔 안 쓴다. 경량 웹 리포트의 "대답 첫마디에 '음'이 자주" 문구를 실제 값으로 판단하려고 둔 구분. */
export const FIRST_WORDS_SEC = 3;

export interface VoiceReport {
  at: string;
  /** 오각형 축 5개의 0~1 값. 분석 모델이 아직 없는 축(CNN 3축 중 서버가 null로 준 것)은 null → "준비 중" */
  v: (number | null)[];
  /** flow: 1·2·3단계 이 축의 값(0~100). 2·3단계 목소리 분석이 아직 없으면 null → 막대가 "준비 중" 모양 */
  /** reference: 시험을 통과하지 못한 참고용 모델의 판정 — 칩·문구에 참고용이라고 붙고, 요약과 연습 팁에는 쓰지 않는다 */
  habits: { key: AxisKey; name: string; easy: string; line: string; chip: Chip; flow: (number | null)[]; reference: boolean }[];
  /** 세부 목록 — 이 기기에서 분석했고 서버가 위치 목록을 준 경우에만 */
  fillers: { chip: Chip; count: number; words: [string, number][]; ticks: number[]; line: string } | null;
  pauses: { chip: Chip; count: number; marks: { left: number; width: number; label: string }[]; line: string } | null;
  spokenSec: number | null;
  tip: string | null;
  /* ↓ 서버가 값을 주기 전까지 null → 화면은 "준비 중" 칸 (types.ts AnalyzeResult의 *_detail 참고) */
  prolong: { chip: Chip; items: { word: string; at: string }[]; line: string } | null;
  energy: { chip: Chip; bars: number[]; line: string } | null;
  tremor: { chip: Chip; curve: number[]; line: string } | null;
}

const mmss = (t: number) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;

/** 다른 단계 목소리 분석(아직 없음) — 있으면 말하기 습관 흐름 막대에 쓴다 */
export interface VoiceFlowSources {
  stage2?: AnalyzeResult;
  stage3?: AnalyzeResult;
}

type Stage1Source = { at: string; result: AnalyzeResult; turnStarts?: number[] } | { at: string; latest: Stage1Latest };

const pct = (x: number, total: number) => Math.max(0, Math.min(100, (x / total) * 100));
const sec = (x: number) => `${(Math.round(x * 10) / 10).toString()}초`;

export function buildVoiceReport(src: Stage1Source, others: VoiceFlowSources = {}): VoiceReport {
  // CNN 3축(안정성·지속성·에너지)은 그 라벨의 모델이 서버에 아직 없으면 null로 온다(backend /analyze).
  // 0점으로 바꾸면 "자주 흔들렸어요"처럼 잘못 읽히므로 null 그대로 두고 "준비 중"으로 보인다.
  const scores: Record<AxisKey, number | null> =
    'result' in src
      ? src.result.scores
      : { stability: src.latest.stability, fluency: src.latest.fluency, pause_ctrl: src.latest.pauseCtrl, continuity: src.latest.continuity, calm: src.latest.calm };

  const habits = VOICE_AXES.map((key) => {
    const score = scores[key];
    const c = AXIS_COPY[key];
    if (score === null) {
      return {
        key,
        name: c.name,
        easy: c.easy,
        line: '이 부분을 살펴볼 분석을 아직 준비하고 있어요.',
        chip: { tone: 'n' as const, text: '준비 중' },
        flow: [null, others.stage2?.scores[key] ?? null, others.stage3?.scores[key] ?? null],
        reference: false,
      };
    }
    const tier = scoreTier(score);
    // 참고용 모델(시험 미통과, 예: 떨림 v1)은 판정 옆에 참고용이라고 붙인다 — 확정된 결과처럼 보이지 않게
    const label = CNN_AXIS_LABEL[key];
    const reference = 'result' in src && label !== undefined && src.result.model_status?.[label] === 'reference';
    return {
      key,
      name: c.name,
      easy: c.easy,
      line: reference ? `${c.line[tier]} (아직 시험 중인 분석이라 참고만 해 주세요.)` : c.line[tier],
      chip: { tone: TONE[tier], text: reference ? `${c.chip[tier]} · 참고용` : c.chip[tier] },
      flow: [score, others.stage2?.scores[key] ?? null, others.stage3?.scores[key] ?? null],
      reference,
    };
  });
  // 연습 팁은 값이 있고 참고용이 아닌 축 중에서만 고른다 (유창성·침묵 조절은 CNN이 아니라 항상 값이 있다)
  const ready = habits.flatMap((h) => {
    const v = scores[h.key];
    return v === null || h.reference ? [] : [{ k: h.key, v }];
  });
  const worst = ready.length ? ready.reduce((a, b) => (b.v < a.v ? b : a)) : null;
  const tip = worst === null || scoreTier(worst.v) === 'good' ? null : TRAINING_TIPS[worst.k];

  let fillers: VoiceReport['fillers'] = null;
  let pauses: VoiceReport['pauses'] = null;
  let spokenSec: number | null = null;
  let prolong: VoiceReport['prolong'] = null;
  let energy: VoiceReport['energy'] = null;
  let tremor: VoiceReport['tremor'] = null;
  if ('result' in src) {
    const r = src.result;
    const total = r.pause_detail.total_duration_sec || 0;
    spokenSec = total || null;
    const fluencyChip = habits[1].chip;
    const events = r.filler_detail.events;
    if (events && total > 0) {
      const counts = new Map<string, number>();
      events.forEach((e) => counts.set(e.text, (counts.get(e.text) ?? 0) + 1));
      const words = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4);
      const starts = src.turnStarts ?? [];
      const atStart = events.filter((e) => starts.some((t) => e.start >= t && e.start - t < FIRST_WORDS_SEC)).length;
      const line =
        events.length === 0
          ? '"음, 어" 같은 말이 들리지 않았어요.'
          : starts.length && atStart * 2 >= events.length
            ? '대답을 **시작하자마자** 나온 경우가 많았어요. 첫 문장을 미리 정해 두면 줄어요.'
            : '주황 줄이 나온 순간이에요. 대답 중간중간 고르게 나왔어요.';
      fillers = {
        chip: { tone: fluencyChip.tone, text: `${fluencyChip.text} · ${events.length}번` },
        count: events.length,
        words,
        ticks: events.map((e) => pct(e.start, total)),
        line,
      };
    }
    const longs = r.pause_detail.long_pauses;
    if (longs && total > 0) {
      const pauseChip = habits[2].chip;
      pauses = {
        chip: { tone: pauseChip.tone, text: `${pauseChip.text} · ${longs.length}번` },
        count: longs.length,
        marks: longs.map((p) => ({ left: pct(p.start, total), width: Math.max(1.5, pct(p.duration, total)), label: sec(p.duration) })),
        line: longs.length
          ? `오래 멈춘 순간이 ${longs.length}번 있었어요. 가장 길게는 **${sec(Math.max(...longs.map((p) => p.duration)))}** 멈췄어요.`
          : '오래 멈춘 순간 없이 이어서 말했어요.',
      };
    }

    // ↓ 아직 서버가 안 주는 값들 — 오면 그대로 그린다
    const pro = r.prolong_detail?.events;
    if (pro) {
      prolong = {
        chip: { tone: habits[3].chip.tone, text: `${habits[3].chip.text} · ${pro.length}번` },
        items: pro.slice(0, 4).map((e) => ({ word: e.text, at: mmss(e.start) })),
        line: pro.length ? '생각을 고를 때 소리를 늘이는 경우가 많아요. 늘이는 대신 입을 닫고 1초 쉬어 봐요.' : '소리를 늘이지 않고 또박또박 이어 갔어요.',
      };
    }
    const bars = r.energy_detail?.sentence_bars;
    if (bars && bars.length >= 2 && bars[0] > 0) {
      const keep = Math.round((bars[bars.length - 1] / bars[0]) * 100);
      energy = {
        chip: habits[4].chip,
        bars: bars.map((b) => Math.max(0, Math.min(100, b))),
        line: `문장 끝에서도 목소리가 **처음의 ${keep}%** 정도로 유지됐어요.`,
      };
    }
    const curve = r.tremor_detail?.curve;
    if (curve && curve.length >= 2) {
      tremor = {
        chip: habits[0].chip,
        curve: curve.map((c) => Math.max(0, Math.min(1, c))),
        line: habits[0].line,
      };
    }
  }

  return {
    at: src.at,
    v: VOICE_AXES.map((k) => {
      const v = scores[k];
      return v === null ? null : Math.max(0.05, Math.min(1, v / 100));
    }),
    habits,
    fillers,
    pauses,
    spokenSec,
    tip,
    prolong,
    energy,
    tremor,
  };
}

export interface FaceReport {
  at: string;
  /** perQ: 질문별 값 — 아직 계산하지 않아서 null이면 "준비 중" */
  blink: { chip: Chip; big: string | null; ratePerMin: number | null; line: string; perQ: number[] | null };
  gaze: { chip: Chip; big: string | null; line: string; segments: GazeBlinkResult['gaze']['segments'] | null; perQ: number[] | null };
  expr: {
    chip: Chip;
    smilePct: number | null;
    tensionPct: number | null;
    line: string;
    segments: GazeBlinkResult['expression']['segments'] | null;
    /** 미소·평소·굳은 순간이 차지한 비율(%) — 지금 값으로 계산 */
    emo: { smile: number; neutral: number; tension: number } | null;
  };
  summary: { good: string[]; next: string[] };
}

type Stage2Source = { at: string; result: GazeBlinkResult } | { at: string; latest: GazeBlinkLatest };

/** 상태 이름(서버·scoring.ts의 판정 결과)을 사용자에게 보이는 말로 — "과응시" 같은 용어를 그대로 보이지 않게 */
const BLINK_WORDS: Record<string, string> = { 정상: '편안한 범위예요', 빈번: '자주 깜빡였어요', 과응시: '적게 깜빡였어요' };
const EXPR_WORDS: Record<string, string> = { 편안함: '편안했어요', 보통: '평소 표정이었어요', 긴장됨: '굳은 순간이 있었어요' };
const words = (map: Record<string, string>, s: string) => map[s] ?? s;

/** 1분 깜빡임의 편안한 범위 — face/live/scoring.ts(=backend score_blink_rate)의 '정상' 판정 범위와 같다. */
export const BLINK_NORMAL: [number, number] = [10, 30];

const GAZE_CHIP: Record<ScoreTier, string> = { good: '자연스러운 길이예요', mid: '가끔 짧게 옮겼어요', low: '자주 옮겼어요' };
const FACE_SUMMARY = {
  blink: { good: '편안한 깜빡임', next: '깜빡임' },
  gaze: { good: '자연스러운 눈 맞춤', next: '눈 맞춤' },
  expr: { good: '편안한 표정', next: '표정 풀기' },
};

export function buildFaceReport(src: Stage2Source): FaceReport {
  const scores =
    'result' in src
      ? { blink: src.result.blink.score, gaze: src.result.gaze.score, expr: src.result.expression.score }
      : { blink: src.latest.blinkScore, gaze: src.latest.gazeScore, expr: src.latest.expressionScore };
  const status =
    'result' in src
      ? { blink: src.result.blink.status, expr: src.result.expression.status }
      : { blink: src.latest.blinkStatus, expr: src.latest.expressionStatus };
  const tier = { blink: scoreTier(scores.blink), gaze: scoreTier(scores.gaze), expr: scoreTier(scores.expr) };

  const summary = { good: [] as string[], next: [] as string[] };
  (['blink', 'gaze', 'expr'] as const).forEach((k) => {
    if (tier[k] === 'good') summary.good.push(FACE_SUMMARY[k].good);
    if (tier[k] === 'low') summary.next.push(FACE_SUMMARY[k].next);
  });

  if (!('result' in src)) {
    return {
      at: src.at,
      blink: { chip: { tone: TONE[tier.blink], text: words(BLINK_WORDS, status.blink) }, big: null, ratePerMin: null, line: '세부 기록은 2단계를 했던 기기에서 볼 수 있어요.', perQ: null },
      gaze: { chip: { tone: TONE[tier.gaze], text: GAZE_CHIP[tier.gaze] }, big: null, line: '', segments: null, perQ: null },
      expr: { chip: { tone: TONE[tier.expr], text: words(EXPR_WORDS, status.expr) }, smilePct: null, tensionPct: null, line: '', segments: null, emo: null },
      summary,
    };
  }

  const r = src.result;
  const m = extractMetrics(r);
  const prev = r.previous;
  return {
    at: src.at,
    blink: {
      chip: { tone: TONE[tier.blink], text: words(BLINK_WORDS, status.blink) },
      big: `1분에 ${Math.round(r.blink.rate_per_min)}번`,
      ratePerMin: r.blink.rate_per_min,
      line: COMPARISON_BUILDERS.blink(m, prev),
      perQ: r.per_question?.blink_per_min ?? null,
    },
    gaze: {
      chip: { tone: TONE[tier.gaze], text: GAZE_CHIP[tier.gaze] },
      big: `평균 ${sec(r.gaze.avg_fixation_sec)}`,
      line: COMPARISON_BUILDERS.gaze(m, prev),
      segments: r.gaze.segments,
      perQ: r.per_question?.gaze_avg_sec ?? null,
    },
    expr: {
      chip: { tone: TONE[tier.expr], text: words(EXPR_WORDS, status.expr) },
      smilePct: Math.round(r.expression.smile_ratio * 100),
      tensionPct: Math.round(r.expression.tension_ratio * 100),
      line: COMPARISON_BUILDERS.expression(m, prev),
      segments: r.expression.segments,
      emo: (() => {
        const smile = Math.round(r.expression.smile_ratio * 100);
        const tension = Math.round(r.expression.tension_ratio * 100);
        return { smile, tension, neutral: Math.max(0, 100 - smile - tension) };
      })(),
    },
    summary,
  };
}

/** "이번 연습 정리"의 두 칩 줄 — 지금처럼 하면 되는 것 / 연습하면 좋아지는 것 */
export function buildSummary(voice: VoiceReport | null, face: FaceReport | null) {
  const good: string[] = [];
  const next: string[] = [];
  voice?.habits.forEach((h) => {
    if (h.reference) return; // 참고용 판정은 정리에 넣지 않는다 ('준비 중' 칩은 tone 'n'이라 아래에서 자연히 빠진다)
    if (h.chip.tone === 'g') good.push(AXIS_COPY[h.key].good);
    if (h.chip.tone === 'p') next.push(AXIS_COPY[h.key].next);
  });
  if (face) {
    good.push(...face.summary.good);
    next.push(...face.summary.next);
  }
  return { good, next };
}

/**
 * 3단계 면접 중(대답하는 동안) 깜빡임·시선·표정을 2단계와 나란히 적는 한 줄씩 — 경량 웹 리포트의
 * "실전 면접에서 1분에 22번 깜빡였어요(2단계 19번)"처럼. 평가 말 없이 센 값만 쓴다(좋다·나쁘다 판단은 칩이 이미 함).
 * stage2가 없으면(기기를 바꿔 세부값이 없음) 3단계 값만.
 */
export function buildStage3FaceLines(stage3: GazeBlinkResult, stage2?: GazeBlinkResult | null) {
  const n = (x: number) => Math.round(x);
  const sec1 = (x: number) => `${Math.round(x * 10) / 10}초`;
  const pct = (x: number) => `${Math.round(x * 100)}%`;
  return {
    blink: `실전 면접에서는 1분에 ${n(stage3.blink.rate_per_min)}번 깜빡였어요${stage2 ? `(2단계 ${n(stage2.blink.rate_per_min)}번)` : ''}.`,
    gaze: `실전 면접에서는 면접관을 한 번 볼 때 평균 ${sec1(stage3.gaze.avg_fixation_sec)} 바라봤어요${stage2 ? `(2단계 ${sec1(stage2.gaze.avg_fixation_sec)})` : ''}.`,
    expr: `실전 면접에서는 미소 지은 시간 ${pct(stage3.expression.smile_ratio)}, 굳은 시간 ${pct(stage3.expression.tension_ratio)}였어요${
      stage2 ? `(2단계 미소 ${pct(stage2.expression.smile_ratio)}, 굳은 시간 ${pct(stage2.expression.tension_ratio)})` : ''
    }.`,
  };
}
