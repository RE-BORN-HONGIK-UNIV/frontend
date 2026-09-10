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

/**
 * TODO: Stage1/2 파이프라인 API 연동 전까지 쓰는 임시 mock.
 * 실제로는 백엔드에서 계산된 통합 불안도 점수(0~100)를 받아와야 함.
 * 연동 시 이 함수 내부만 실제 fetch 호출로 교체하면 나머지 로직은 그대로 동작함.
 */
export async function getAnxietyScore(): Promise<number> {
  // 임시 고정값. 워밍업/표준/실전 화면을 각각 확인해보려면
  // 30 / 55 / 80 처럼 값을 바꿔서 테스트해보면 됨.
  return 55;
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