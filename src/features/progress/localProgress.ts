/**
 * Thin localStorage progress tracker. Temporary — moves to the backend
 * (per-user table) in a later step so it survives across devices.
 */

const K = {
  s1done: 'rb.stage1.done',
  s1score: 'rb.stage1.score',
  s1at: 'rb.stage1.at',
  s3done: 'rb.stage3.done',
  s3tier: 'rb.stage3.tier',
  s3at: 'rb.stage3.at',
  s2history: 'rb.stage2.history',
  lastVisit: 'rb.lastVisit',
  streak: 'rb.streak',
};

const STAGE2_HISTORY_LIMIT = 10;

function get(k: string) {
  try {
    return localStorage.getItem(k);
  } catch {
    return null;
  }
}
function set(k: string, v: string) {
  try {
    localStorage.setItem(k, v);
  } catch {
    /* ignore */
  }
}
function del(k: string) {
  try {
    localStorage.removeItem(k);
  } catch {
    /* ignore */
  }
}

export interface Stage1Progress {
  done: boolean;
  score: number | null;
  at: string | null;
}

export interface Stage3Progress {
  done: boolean;
  /** 마지막으로 완료한 면접의 난이도(tier) — 어떤 면접관과 했는지 대시보드에 보여주는 용도 */
  tier: string | null;
  at: string | null;
}

/** 2단계(페이스 터치)는 절대 점수 대신 "지난 세션과 비교"로 보여주기 위한 요약 지표. */
export interface Stage2Metrics {
  blinkRatePerMin: number;
  avgFixationSec: number;
  smileRatio: number;
  tensionRatio: number;
}

export interface Stage2Entry extends Stage2Metrics {
  at: string;
}

export const localProgress = {
  stage1(): Stage1Progress {
    const raw = get(K.s1score);
    return {
      done: get(K.s1done) === 'true',
      score: raw ? Number(raw) : null,
      at: get(K.s1at),
    };
  },

  markStage1Done(score: number) {
    set(K.s1done, 'true');
    set(K.s1score, String(score));
    set(K.s1at, new Date().toISOString());
  },

  resetStage1() {
    del(K.s1done);
    del(K.s1score);
    del(K.s1at);
  },

  stage3(): Stage3Progress {
    return {
      done: get(K.s3done) === 'true',
      tier: get(K.s3tier),
      at: get(K.s3at),
    };
  },

  /** 3단계 모의 면접을 끝까지 마쳤을 때 기록 (가장 최근 완료로 덮어씀). */
  markStage3Done(tier: string) {
    set(K.s3done, 'true');
    set(K.s3tier, tier);
    set(K.s3at, new Date().toISOString());
  },

  resetStage3() {
    del(K.s3done);
    del(K.s3tier);
    del(K.s3at);
  },

  stage2History(): Stage2Entry[] {
    try {
      const raw = get(K.s2history);
      return raw ? (JSON.parse(raw) as Stage2Entry[]) : [];
    } catch {
      return [];
    }
  },

  /** 이번 세션 결과를 기록하고, 비교에 쓸 "직전 세션"을 함께 돌려준다 (처음이면 null). */
  appendStage2Result(metrics: Stage2Metrics): { previous: Stage2Entry | null; current: Stage2Entry } {
    const history = localProgress.stage2History();
    const previous = history.length ? history[history.length - 1] : null;
    const current: Stage2Entry = { ...metrics, at: new Date().toISOString() };
    set(K.s2history, JSON.stringify([...history, current].slice(-STAGE2_HISTORY_LIMIT)));
    return { previous, current };
  },

  resetStage2() {
    del(K.s2history);
  },

  /** Visit streak — increments once per calendar day, resets if a day is skipped. */
  bumpStreak(): number {
    const today = new Date().toDateString();
    const last = get(K.lastVisit);
    const prev = Number(get(K.streak) ?? '0');
    if (last === today) return prev || 1;

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const next = last === yesterday.toDateString() ? prev + 1 : 1;

    set(K.lastVisit, today);
    set(K.streak, String(next));
    return next;
  },
};

export function daysSince(iso: string | null): number | null {
  if (!iso) return null;
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
}
