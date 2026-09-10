// 백엔드 주소 — .env에 VITE_API_BASE_URL 없으면 로컬 기본값 사용
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5000';

export type DifficultyTier = 'warmup' | 'standard' | 'practice';

export interface NextQuestionResponse {
  question: string;
  source: 'llm' | 'fallback';
}

/**
 * Step3 · 다음 면접 질문을 백엔드(Claude API 연동)로부터 받아온다.
 * previousQuestions를 같이 보내면 같은 질문이 반복되지 않게 서버에서 걸러줌.
 */
export async function getNextQuestion(
  tier: DifficultyTier,
  previousQuestions: string[],
): Promise<NextQuestionResponse> {
  const res = await fetch(`${API_BASE_URL}/interview/next-question`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tier, previous_questions: previousQuestions }),
  });

  if (!res.ok) {
    throw new Error(`질문 생성 요청 실패: ${res.status}`);
  }

  return res.json();
}

// 지금은 백엔드 엔드포인트가 없어서 가짜로 동작함.
// 나중에 실제 API 완성되면 이 함수 내부만 fetch로 교체하면 됨.
export async function uploadAnswer(blob: Blob): Promise<{ ok: true }> {
  console.log('[mock] 답변 업로드 시뮬레이션, 파일 크기:', blob.size, 'bytes');
  await new Promise((r) => setTimeout(r, 600)); // 네트워크 지연 흉내
  return { ok: true };
}