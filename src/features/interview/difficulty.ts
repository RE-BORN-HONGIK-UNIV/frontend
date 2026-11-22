import { api } from '@/lib/api/client';

export type DifficultyTier = 'warmup' | 'standard' | 'practice';

export interface TierInfo {
  tier: DifficultyTier;
  label: string;
}

// Stage1(음성) : Stage2(비언어) 가중치 — 여기서만 바꾸면 전체에 반영됨
const STAGE1_WEIGHT = 0.6;
const STAGE2_WEIGHT = 0.4;

export function combineAnxietyScore(stage1Avg: number, stage2Avg: number): number {
  const combined = stage1Avg * STAGE1_WEIGHT + stage2Avg * STAGE2_WEIGHT;
  return Math.round(combined * 10) / 10;
}

export function getTier(score: number): TierInfo {
  if (score < 40) return { tier: 'warmup', label: '워밍업 난이도' };
  if (score < 70) return { tier: 'standard', label: '표준 난이도' };
  return { tier: 'practice', label: '실전 난이도' };
}

export type StageKey = 'stage1' | 'stage2';

export type AnxietyScoreResult =
  /** source: 'server' = 백엔드 GET /interview/anxiety가 정한 난이도, 'local' = 서버가 아직 그 API가 없을 때 예전 0.6:0.4 계산 */
  | { status: 'ready'; score: number; tier: DifficultyTier; source: 'server' | 'local' }
  /** 난이도를 정할 수 없음 — missing 단계의 결과가 필요. failed는 기록 없음이 아니라 조회 자체가 실패한 경우. */
  | { status: 'missing'; missing: StageKey[]; failed: boolean };

/**
 * 1·2단계 최신 점수로 통합 점수를 정한다 (순수 함수 — 조회와 분리해 테스트 가능).
 * 난이도는 두 단계 결과가 **모두** 있어야 정한다 — 한쪽만으로 추정하면 안 맞는 면접관이
 * 배정되므로, 빠진 단계를 먼저 하고 오게 안내한다 (기본 점수로 대충 진행시키지 않음).
 * 점수가 null이면 "기록 없음 또는 조회 실패"이고, failed로 둘을 구분한다.
 */
export function resolveAnxietyScore(
  stage1: number | null,
  stage2: number | null,
  failed = false,
): AnxietyScoreResult {
  if (stage1 !== null && stage2 !== null) {
    const score = combineAnxietyScore(stage1, stage2);
    return { status: 'ready', score, tier: getTier(score).tier, source: 'local' };
  }
  const missing: StageKey[] = [];
  if (stage1 === null) missing.push('stage1');
  if (stage2 === null) missing.push('stage2');
  return { status: 'missing', missing, failed };
}

/**
 * 통합 점수(0~100)를 서버에 저장된 1·2단계 최신 결과에서 계산한다.
 * 이름은 "불안도"지만 값은 **높을수록 안정적**(1·2단계 점수가 그렇다) — 그래서
 * getTier()에서 높을수록 실전 난이도가 됨.
 *
 * 기록이 없거나 조회가 실패하면 던지지 않고 'missing'을 돌려준다 — 호출측이 "먼저 해당
 * 단계를 하고 오세요" 안내 화면을 띄우기 위함 (면접 화면이 에러로 깨지지 않게).
 */
export async function getAnxietyScore(): Promise<AnxietyScoreResult> {
  const [s1, s2] = await Promise.allSettled([api.latestStage1(), api.latestGazeBlink()]);
  const stage1 = s1.status === 'fulfilled' ? (s1.value.result?.overallScore ?? null) : null;
  const stage2 = s2.status === 'fulfilled' ? (s2.value.result?.overallScore ?? null) : null;
  const failed = s1.status === 'rejected' || s2.status === 'rejected';
  const local = resolveAnxietyScore(stage1, stage2, failed);
  if (local.status !== 'ready') return local;
  // 난이도는 서버가 정한다(backend GET /interview/anxiety — 판넬 불안도 계산식, 경계 20·10, docs/anxiety_근거.md).
  // 1·2단계가 다 있어야 한다는 규칙은 위에서 그대로 지킨다. 서버가 아직 이 API가 없거나(배포 전) 실패하면
  // 화면이 막히지 않게 예전 0.6:0.4 계산으로 대신한다.
  try {
    const r = await api.interviewAnxiety();
    return pickServerTier(local, r);
  } catch {
    return local;
  }
}

/** 서버 응답에 쓸 수 있는 난이도가 있으면 그걸, 없으면 예전 계산(local) — 순수 함수(테스트용) */
export function pickServerTier(
  local: Extract<AnxietyScoreResult, { status: 'ready' }>,
  server: { score: number | null; tier: string } | null | undefined,
): Extract<AnxietyScoreResult, { status: 'ready' }> {
  const tier = server?.tier;
  if (tier === 'warmup' || tier === 'standard' || tier === 'practice') {
    // 서버 score는 "불안도"(높을수록 긴장)라 예전 score(높을수록 안정)와 뜻이 반대 — 화면에는 쓰지 않고 기록용으로만
    return { status: 'ready', score: server?.score ?? local.score, tier, source: 'server' };
  }
  return local;
}

/**
 * 서버가 질문을 못 만들 때 쓰는 예비 질문. 첫 질문(자기소개)은 interviewers.ts에 따로 있다.
 * 문장은 미리 녹음한 mp3(public/audio/lines)와 똑같아야 그 목소리로 나온다.
 */
export const QUESTION_BANK: Record<DifficultyTier, string[]> = {
  warmup: [
    '요즘 관심 있게 보고 있는 게 있다면 편하게 말씀해 주세요.',
    '오늘 이 자리에 오면서 어떤 마음이었는지 궁금해요.',
    '쉬는 날에는 주로 어떻게 시간을 보내세요?',
    '최근에 작게라도 해낸 일이 있다면 들려주시겠어요?',
    '스스로 생각하기에 본인은 어떤 사람인가요?',
    '일을 한다면 어떤 분위기의 곳에서 일하고 싶으세요?',
  ],
  standard: [
    '하고 싶은 일에 관심을 갖게 된 계기를 말씀해 주시겠어요?',
    '최근에 어려운 상황을 해결했던 경험이 있다면 소개해 주세요.',
    '본인의 강점을 하나 꼽는다면 무엇인가요?',
    '다른 사람과 함께 무언가를 해 본 경험이 있다면 말씀해 주세요.',
    '일할 때 가장 중요하다고 생각하는 것은 무엇인가요?',
    '앞으로 어떤 모습으로 일하고 싶으신가요?',
  ],
  practice: [
    '하고 싶은 일에 본인이 잘 맞는다고 생각하는 구체적인 근거는 무엇인가요?',
    '실패했던 경험과 그로부터 배운 점을 말씀해 주세요.',
    '의견이 다른 사람과 일을 맞춰 가야 했던 경험이 있나요?',
    '본인의 약점은 무엇이고, 어떻게 보완하고 있나요?',
    '해야 할 일이 한꺼번에 몰리면 어떻게 순서를 정하시나요?',
    '일을 시작한다면 처음 석 달 동안 무엇을 해 보고 싶으신가요?',
  ],
};

/** 서버가 꼬리질문을 못 만들 때 쓰는 예비 꼬리질문 — 어떤 대답 뒤에도 어울리는 문장 */
export const FOLLOW_UP_BANK: Record<DifficultyTier, string[]> = {
  warmup: [
    '방금 이야기 좋았어요. 그 부분을 조금만 더 들려주실 수 있을까요?',
    '그때 어떤 기분이 들었는지 궁금해요.',
    '그 이야기에서 가장 기억에 남는 게 있다면 말씀해 주세요.',
    '천천히 하셔도 돼요. 예를 하나만 들어 주시겠어요?',
  ],
  standard: [
    '방금 말씀하신 내용을 실제 예시와 함께 조금 더 설명해 주실 수 있을까요?',
    '그때 본인은 구체적으로 어떤 역할을 하셨나요?',
    '그렇게 생각하게 된 이유를 조금 더 말씀해 주시겠어요?',
    '그 경험이 지금의 본인에게 어떤 도움이 됐나요?',
  ],
  practice: [
    '방금 말씀하신 내용에서, 그렇게 판단한 구체적인 근거를 말씀해 주시겠어요?',
    '다시 그 상황이 온다면 무엇을 다르게 하시겠어요?',
    '그 결과를 스스로는 어떻게 평가하시나요?',
    '그 경험을 앞으로 일할 때 어떻게 살릴 수 있을까요?',
  ],
};

/** 예비 목록에서 이번 면접에 아직 안 나온 첫 문장(다 나왔으면 처음부터 다시) */
export const pickUnused = (bank: string[], asked: string[]) => bank.find((q) => !asked.includes(q)) ?? bank[asked.length % bank.length];