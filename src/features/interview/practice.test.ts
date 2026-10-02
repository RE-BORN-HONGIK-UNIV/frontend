import { describe, expect, it } from 'vitest';
import { compareAnswers, FALLBACK_HINT, pickPracticeTurn } from './practice';

const turn = (answer: string) => ({ kind: 'main' as const, question: 'q', answer });

describe('pickPracticeTurn (서버 coach/practice.py와 같은 규칙)', () => {
  it('답을 못 남긴 질문이 있으면 그중 첫 번째', () => {
    expect(pickPracticeTurn([turn('길게 잘 답했어요 정말로'), turn(''), turn('짧음'), turn('  ')])).toBe(1);
  });

  it('모두 답했으면 가장 짧게 답한 질문, 동점이면 앞선 것', () => {
    expect(pickPracticeTurn([turn('열 글자가 넘는 답변이에요'), turn('짧아요'), turn('짧아요')])).toBe(1);
  });

  it('공백뿐인 답변은 못 남긴 것으로 센다', () => {
    expect(pickPracticeTurn([turn('답했어요 충분히'), turn(' \n ')])).toBe(1);
  });

  it('질문이 없으면 null', () => {
    expect(pickPracticeTurn([])).toBeNull();
  });
});

describe('compareAnswers (좋아진 점만 알리기 위한 분류)', () => {
  it('이전엔 답을 못 남겼는데 이번엔 남겼으면 answered', () => {
    expect(compareAnswers('', '이번엔 이렇게 말해봤어요')).toBe('answered');
  });

  it('1.2배 이상이고 10자 넘게 길어졌을 때만 longer', () => {
    expect(compareAnswers('짧은 답변이에요', '짧은 답변이었는데 이번엔 이유와 경험까지 덧붙여서 말해봤어요')).toBe('longer');
    expect(compareAnswers('가'.repeat(100), '가'.repeat(115))).toBe('same');  // 1.2배 미만
    expect(compareAnswers('가나다', '가나다라마바사아자차카타')).toBe('same');     // 9자 증가: 배율은 크지만 10자 미만이라 같다고 봄
    expect(compareAnswers('가나다', '가나다라마바사아자차카타파')).toBe('longer');  // 정확히 10자 증가는 경계 포함
  });

  it('줄었거나 비슷하면 same — 화면은 비교하지 않고 격려만 한다', () => {
    expect(compareAnswers('가'.repeat(100), '가'.repeat(50))).toBe('same');
    expect(compareAnswers('답변이에요', '답변이에요')).toBe('same');
  });

  it('이번 답변이 비어 있으면 same', () => {
    expect(compareAnswers('', '')).toBe('same');
    expect(compareAnswers('이전 답변', '   ')).toBe('same');
  });
});

describe('FALLBACK_HINT', () => {
  it('빈칸이 있는 시작 문장 틀과 2~3개의 순서 안내를 가진다', () => {
    expect(FALLBACK_HINT.opening).toContain('___');
    expect(FALLBACK_HINT.steps.length).toBeGreaterThanOrEqual(2);
    expect(FALLBACK_HINT.steps.length).toBeLessThanOrEqual(3);
  });
});
