import type { AnalyzeScores } from '@/lib/api/types';

export type AxisKey = keyof AnalyzeScores;

export interface Axis {
  key: AxisKey;
  label: string;
  desc: string;
}

export const AXES: Axis[] = [
  { key: 'stability', label: '음성 안정성', desc: '음성 떨림·에너지 변동 안정도' },
  { key: 'fluency', label: '발화 유창성', desc: '채움말 없이 자연스러운 발화' },
  { key: 'pause_ctrl', label: '침묵 조절력', desc: '무음 구간 적절성' },
  { key: 'continuity', label: '발화 지속성', desc: '연장음 없이 적절한 속도 유지' },
  { key: 'calm', label: '발화 에너지', desc: '종합 불안 역산 지수' },
];

export const TRAINING_TIPS: Record<AxisKey, string> = {
  stability:
    '말하기 전 깊게 숨을 들이마시고 천천히 내뱉으며, 짧은 문장을 떨림 없이 끝까지 말하는 연습부터 해보세요.',
  fluency:
    '말하기 전 머릿속으로 문장을 먼저 정리해보세요. "음", "어" 대신 짧은 침묵으로 바꾸는 연습이 효과적이에요.',
  pause_ctrl:
    '문장과 문장 사이에 의도적으로 1~2초 침묵을 두는 연습을 해보세요. 침묵이 어색하지 않다는 걸 몸으로 익히는 게 핵심이에요.',
  continuity:
    '문장을 짧게 끊어 말하는 연습부터 시작해보세요. 한 호흡에 너무 길게 말하지 않도록 의식적으로 끊어주세요.',
  calm: '말하기 전 가벼운 스트레칭이나 심호흡으로 긴장을 풀고, 좋아하는 문장을 소리 내어 읽는 것부터 시작해보세요.',
};

/**
 * 1단계 시작 전 체크리스트 — 가장 중요한 3개만 (경량 웹 시작 화면에 맞춰 6개에서 줄임).
 * 분석 정확도에 직접 영향을 주는 두 가지(소음·거리)와, 부담을 덜어 주는 한 가지(넘어가도 됨).
 * 빠진 안내 중 "5분쯤·질문 4개"는 시작 카드 아래 문구로, "크롬·엣지 권장"은 카드 설명으로 옮겼다.
 */
export const GUIDE_ITEMS = [
  { title: '조용한 곳에서', desc: '주변 소리가 적을수록 목소리를 정확하게 살펴봐요.' },
  { title: '마이크와 10~20cm', desc: '너무 가까우면 소리가 깨지고, 멀면 작게 들려요.' },
  { title: '넘어가도 괜찮아요', desc: '어려운 질문은 대답하지 않고 넘어갈 수 있어요.' },
];

export { scoreColor } from '@/lib/scoreColor';
