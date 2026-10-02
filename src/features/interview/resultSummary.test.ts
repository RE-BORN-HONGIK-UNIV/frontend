import { describe, expect, it } from 'vitest';
import { summarizeResult, type InterviewResult } from './resultSummary';

const base = (turns: InterviewResult['turns'], ms = 5 * 60_000): InterviewResult => ({
  turns, sessionId: 1, startedAt: 1_000_000, endedAt: 1_000_000 + ms,
});

describe('summarizeResult', () => {
  it('질문 수와 답변을 남긴 질문 수를 센다', () => {
    const r = summarizeResult(base([
      { kind: 'main', question: 'q1', answer: '답' },
      { kind: 'follow_up', question: 'q2', answer: '답2' },
      { kind: 'main', question: 'q3', answer: '' },
    ]));
    expect(r.questionCount).toBe(3);
    expect(r.answeredCount).toBe(2);
  });

  it('공백뿐인 답변은 답변을 남기지 못한 것으로 센다', () => {
    expect(summarizeResult(base([{ kind: 'main', question: 'q', answer: '   ' }])).answeredCount).toBe(0);
  });

  it('소요 시간은 분 단위로 반올림하고 최소 1분으로 표시한다', () => {
    expect(summarizeResult(base([], 5 * 60_000)).minutes).toBe(5);
    expect(summarizeResult(base([], 4 * 60_000 + 40_000)).minutes).toBe(5); // 4분 40초 → 5분
    expect(summarizeResult(base([], 10_000)).minutes).toBe(1);               // 10초 → "약 1분"
    expect(summarizeResult(base([], 0)).minutes).toBe(1);
  });

  it('질문이 하나도 없는 빈 면접도 에러 없이 0으로 요약한다', () => {
    expect(summarizeResult(base([]))).toMatchObject({ questionCount: 0, answeredCount: 0 });
  });
});
