import type { DifficultyTier } from './difficulty';
import type { InterviewTranscriptTurn } from './resultSummary';

/** 결과 화면 → 맞춤 연습 화면으로 넘기는 값 (react-router state). 새로고침하면 사라지므로 연습 화면은 없으면 대시보드로 돌려보낸다. */
export interface PracticeState {
  question: string;
  /** 방금 면접에서 한 답변 (못 남겼으면 빈 문자열) */
  previousAnswer: string;
  tier: DifficultyTier;
}

export interface PracticeHint {
  /** 빈칸(___)이 있는 시작 문장 틀 */
  opening: string;
  /** 말하는 순서 안내 (2~3개) */
  steps: string[];
}

/** 서버에 연결이 안 될 때 쓰는 일반 힌트 — 서버의 fallback_hint와 같은 '결론 → 이유 → 사례' 순서 */
export const FALLBACK_HINT: PracticeHint = {
  opening: '저는 ___라고 생각해요. 왜냐하면 ___ 때문이에요.',
  steps: [
    '먼저 한 문장으로 결론부터 말해보세요.',
    '그렇게 생각한 이유나, 떠오르는 경험 하나를 이어서 말해보세요.',
    '마지막으로 그 경험에서 얻은 점이나 앞으로 해보고 싶은 것을 한마디로 정리해보세요.',
  ],
};

/**
 * 한 번 더 답해볼 질문의 순번 — 서버(coach/practice.py pick_practice_turn)와 같은 규칙.
 * 답을 못 남긴 질문이 있으면 그중 첫 번째, 없으면 가장 짧게 답한 질문(동점이면 앞선 것). 질문이 없으면 null.
 * 서버의 코치 노트를 못 받았을 때(대기 중·실패)에도 연습 카드를 보여주려고 프론트에도 둔다.
 * "못했다"는 평가가 아니라 "한 번 더 해볼 만한" 질문을 고르는 것이다.
 */
export function pickPracticeTurn(turns: InterviewTranscriptTurn[]): number | null {
  if (turns.length === 0) return null;
  const lengths = turns.map((t) => t.answer.trim().length);
  const empty = lengths.findIndex((n) => n === 0);
  if (empty !== -1) return empty;
  return lengths.indexOf(Math.min(...lengths));
}

export type AnswerChange = 'answered' | 'longer' | 'same';

/**
 * 이전 답변과 이번 답변의 변화 — **좋아진 점만** 알려주기 위한 분류다(줄었거나 비슷하면 'same'으로 두고 화면은
 * 비교 대신 격려만 한다).
 * - answered: 이전엔 답을 못 남겼는데 이번엔 남김
 * - longer: 이전보다 눈에 띄게 길어짐(1.2배 이상이고 10자 이상 늘어남)
 */
export function compareAnswers(previous: string, current: string): AnswerChange {
  const prev = previous.trim().length;
  const cur = current.trim().length;
  if (cur === 0) return 'same';
  if (prev === 0) return 'answered';
  return cur >= prev * 1.2 && cur - prev >= 10 ? 'longer' : 'same';
}
