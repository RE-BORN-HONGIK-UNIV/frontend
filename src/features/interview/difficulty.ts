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
  | { status: 'ready'; score: number }
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
    return { status: 'ready', score: combineAnxietyScore(stage1, stage2) };
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
  return resolveAnxietyScore(stage1, stage2, failed);
}

/**
 * TODO: 실제로는 ai-agent가 이전 답변을 바탕으로 다음 질문을 생성해야 함.
 * 백엔드 연동 전까지 화면 흐름 확인용으로 쓰는 고정 질문 리스트.
 */
export const QUESTION_BANK: Record<DifficultyTier, string[]> = {
  warmup: [
    '간단하게 자기소개 먼저 해주시겠어요?',
    '요즘 관심 있게 보고 있는 게 있다면 편하게 말씀해주세요.',
    '오늘 이 자리에 오면서 어떤 마음이었는지 궁금해요.',
  ],
  standard: [
    '이 직무에 지원하게 된 계기를 말씀해주시겠어요?',
    '최근에 어려운 상황을 해결했던 경험이 있다면 소개해주세요.',
    '본인의 강점을 하나 꼽는다면 무엇인가요?',
  ],
  practice: [
    '이 직무에 본인이 적합하다고 생각하는 구체적인 근거는 무엇인가요?',
    '실패했던 경험과 그로부터 배운 점을 말씀해주세요.',
    '지금 말씀하신 강점을 실제로 발휘했던 순간을 좀 더 구체적으로 설명해주시겠어요?',
  ],
};