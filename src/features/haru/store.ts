import { auth } from '@/lib/auth';
import type { HaruProfileItem } from '@/lib/api/types';

/**
 * 하루와 나눈 대답·이해 카드를 이 기기(localStorage)에만 둔다 — 서버 DB에는 저장하지 않는다.
 * 1단계와 2단계를 다른 날 할 수 있어서 둘을 이어 붙이려면 어딘가엔 남아야 하는데, 대답 내용은 민감정보라
 * 서버에 쌓는 것보다 기기에만 두는 쪽을 택했다(기기를 바꾸면 이어지지 않음 — 이해 카드를 건너뛰면 그만).
 * 로그인한 계정(email)별로 따로 두고, 다른 계정의 기록은 읽지 않는다. 카드에서 "지우기"로 언제든 지운다.
 */

export interface HaruAnswer {
  label: string;
  question: string;
  answer: string;
}

interface StageRecord {
  at: string;
  answers: HaruAnswer[];
}

export interface HaruTalkRecord {
  owner: string;
  stage1?: StageRecord;
  stage2?: StageRecord;
  /** 사용자가 이해 카드에서 확인한 항목. basedOn: 어떤 대답(최근 단계 시각) 기준으로 만든 카드인지 */
  profile?: { at: string; basedOn: string; items: HaruProfileItem[] };
}

const KEY = 'rb.haru.talk';

function owner() {
  return auth.email || 'anonymous';
}

export function loadHaruTalk(): HaruTalkRecord {
  try {
    const raw = localStorage.getItem(KEY);
    const rec = raw ? (JSON.parse(raw) as HaruTalkRecord) : null;
    if (rec && rec.owner === owner()) return rec;
  } catch {
    /* 읽기 실패·형식 깨짐 — 없는 것으로 */
  }
  return { owner: owner() };
}

function save(rec: HaruTalkRecord) {
  try {
    localStorage.setItem(KEY, JSON.stringify(rec));
  } catch {
    /* 저장 못 해도 대화·분석은 그대로 진행 */
  }
}

export function saveStageAnswers(stage: 1 | 2, answers: HaruAnswer[], now = new Date()) {
  const rec = loadHaruTalk();
  rec[stage === 1 ? 'stage1' : 'stage2'] = { at: now.toISOString(), answers };
  save(rec);
}

export function saveProfile(items: HaruProfileItem[], now = new Date()) {
  const rec = loadHaruTalk();
  rec.profile = { at: now.toISOString(), basedOn: latestAnswerAt(rec) ?? '', items };
  save(rec);
}

export function clearHaruTalk() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

/** 1·2단계 대답 중 가장 최근에 남긴 시각. 대답이 하나도 없으면 null. */
export function latestAnswerAt(rec: HaruTalkRecord): string | null {
  const ats = [rec.stage1?.at, rec.stage2?.at].filter((x): x is string => !!x);
  return ats.length ? ats.sort().at(-1)! : null;
}

/** 이해 카드에 넣을 대답 목록 (1단계 → 2단계 순). 대답이 하나도 없으면 빈 목록. */
export function profileSourceItems(rec: HaruTalkRecord): HaruAnswer[] {
  const all = [...(rec.stage1?.answers ?? []), ...(rec.stage2?.answers ?? [])];
  return all.some((a) => a.answer.trim()) ? all : [];
}

/** 저장된 카드가 지금 대답 기준으로 만든 것인지 (그 뒤에 1·2단계를 다시 했으면 새로 만들어야 함) */
export function profileIsCurrent(rec: HaruTalkRecord): boolean {
  return !!rec.profile && rec.profile.basedOn === (latestAnswerAt(rec) ?? '');
}

/** 3단계 질문 생성에 넘길 "항목: 내용" 목록 — 비어 있는 항목은 뺀다. */
export function aboutMeLines(items: HaruProfileItem[] | undefined): string[] {
  return (items ?? []).filter((it) => it.value.trim()).map((it) => `${it.label}: ${it.value.trim()}`);
}
