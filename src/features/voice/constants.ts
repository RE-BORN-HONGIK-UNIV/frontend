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

export const GUIDE_ITEMS = [
  { title: '조용한 환경', desc: '주변 소음이 없는 곳에서 녹음하세요.' },
  { title: '마이크 근접', desc: '마이크와 10~20cm 거리를 유지하세요.' },
  { title: '30초 이상', desc: '정확한 분석을 위해 30초 이상 발화하세요.' },
  { title: '자연스럽게', desc: '평소 말하듯 자연스럽게 발화하세요.' },
  { title: 'WAV 형식', desc: '음성 파일은 WAV 형식으로 준비하세요.' },
  { title: '반복 연습', desc: '여러 번 녹음해서 변화를 확인해보세요.' },
];

export { scoreColor } from '@/lib/scoreColor';
