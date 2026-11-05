import { describe, expect, it } from 'vitest';
import { buildStage3Marks } from './stage3Marks';

const w = (text: string, start: number, end = start + 0.4) => ({ text, start, end });

describe('3단계 질문별 말버릇·멈춤 표시', () => {
  const times = {
    words: [w('음', 0.2), w('저는', 0.8), w('저어는', 1.4, 2.2), w('요리를', 2.4), w('좋아해요', 6.5), w('그', 10.3), w('네', 11)],
    fillers: [w('음', 0.2), w('그', 10.3), { text: '어', start: 12.1, end: 12.4 }],
    prolongs: [{ text: '저어는', start: 1.5, end: 2.1 }],
    longPauses: [{ start: 2.9, end: 6.3, duration: 3.4 }],
  };

  it('대답 구간별로 잘라 채움말·소리 늘이기·긴 멈춤을 실제 말한 자리에 표시한다', () => {
    const marks = buildStage3Marks(
      ['자기소개 부탁드려요', '관심 있는 일은요?'],
      [
        { question: 0, start: 0, end: 10 },
        { question: 1, start: 10, end: 13 },
      ],
      times,
    );
    expect(marks).toEqual([
      { question: '자기소개 부탁드려요', script: '[f:음] 저는 [l:저어는] 요리를 [p:3초 멈춤] 좋아해요' },
      // 단어와 겹치지 않는 채움말("어")도 그 시각 자리에
      { question: '관심 있는 일은요?', script: '[f:그] 네 [f:어]' },
    ]);
  });

  it('대답하지 않고 넘어간 질문은 빼고, 같은 질문에 다시 대답했으면 이어 붙인다', () => {
    const marks = buildStage3Marks(
      ['첫 질문', '넘어간 질문', '세 번째'],
      [
        { question: 0, start: 0, end: 1.2 },
        { question: 0, start: 1.2, end: 2.9 },
        { question: 1, start: 2.9, end: 2.9 },
        { question: 2, start: 10, end: 11.5 },
      ],
      times,
    );
    expect(marks.map((m) => m.question)).toEqual(['첫 질문', '세 번째']);
    expect(marks[0].script).toBe('[f:음] 저는 [l:저어는] 요리를');
  });
});
