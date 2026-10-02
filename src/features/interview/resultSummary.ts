/** 면접 중 메모리에 모아둔 질문·답변 한 쌍. 결과 화면은 서버 저장 성공 여부와 무관하게 이걸로 그린다. */
export interface InterviewTranscriptTurn {
  kind: 'main' | 'follow_up';
  question: string;
  /** 음성 인식 결과를 유저가 확인·수정한 텍스트. 답변을 못 남겼으면 빈 문자열. */
  answer: string;
}

export interface InterviewResult {
  turns: InterviewTranscriptTurn[];
  /** 서버에 저장된 면접 id. 저장에 실패했거나 로그인이 안 된 경우 null. */
  sessionId: number | null;
  /** epoch ms — 면접 시작 / 마지막 답변 제출 시각 */
  startedAt: number;
  endedAt: number;
}

export interface ResultSummary {
  questionCount: number;
  answeredCount: number;
  /** 소요 시간(분). 1분 미만도 "약 1분"으로 보여주려고 최소 1. */
  minutes: number;
}

export function summarizeResult(result: InterviewResult): ResultSummary {
  const answeredCount = result.turns.filter((t) => t.answer.trim() !== '').length;
  const minutes = Math.max(1, Math.round((result.endedAt - result.startedAt) / 60_000));
  return { questionCount: result.turns.length, answeredCount, minutes };
}
