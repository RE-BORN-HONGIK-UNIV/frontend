/**
 * 면접 기록 저장기 — 면접 중 질문/답변을 서버(InterviewSession/Turn)에 순서대로 저장한다.
 *
 * 원칙: **저장이 실패해도 면접은 절대 막히지 않는다.** 그래서 모든 호출은 기다리지 않고(fire-and-forget)
 * 내부 큐에서 순서대로 처리하며, 에러는 삼킨다. 순서를 큐로 보장하는 이유는 "세션 생성 → 질문 저장 →
 * 답변 저장"이 서로 이전 결과(id)에 의존하기 때문이다.
 * - 세션 생성이 실패하면(미로그인·네트워크 오류 등) 이후 호출은 전부 조용히 건너뛴다.
 * - 질문 저장이 실패하면 그 질문의 답변은 저장하지 않는다 — 이전 질문의 id에 잘못 붙이지 않도록
 *   질문 저장 직전에 현재 turn id를 비운다. 이 "비우기"도 반드시 큐 안에서 해야 한다: 호출 시점에
 *   바로 비우면, 앞서 큐에 넣어 둔 이전 답변 저장이 아직 실행되기 전에 id가 사라져 답변이 유실된다.
 */
export interface InterviewRecorderClient {
  start(tier: string): Promise<{ id: number }>;
  addTurn(sessionId: number, kind: 'main' | 'follow_up', question: string): Promise<{ id: number }>;
  saveAnswer(sessionId: number, turnId: number, answer: string): Promise<unknown>;
  complete(sessionId: number): Promise<unknown>;
}

export function createInterviewRecorder(tier: string, client: InterviewRecorderClient) {
  let chain: Promise<void> = Promise.resolve();
  let started = false;
  let sessionId: number | null = null;
  let turnId: number | null = null;

  const enqueue = (task: () => Promise<void>) => {
    chain = chain.then(task).catch(() => {
      /* 저장 실패는 면접 진행에 영향 없음 */
    });
  };

  return {
    /** 면접 시작. 여러 번 불러도 세션은 한 번만 만든다(개발 모드의 effect 이중 실행 대비). */
    start() {
      if (started) return;
      started = true;
      enqueue(async () => {
        sessionId = (await client.start(tier)).id;
      });
    },

    /** 질문이 화면에 나올 때. */
    ask(kind: 'main' | 'follow_up', question: string) {
      enqueue(async () => {
        turnId = null; // 이 질문의 저장이 실패하면 답변을 이전 질문에 붙이지 않게 비움 (큐 안에서!)
        if (sessionId === null) return;
        turnId = (await client.addTurn(sessionId, kind, question)).id;
      });
    },

    /** 방금 질문에 대한 답변 텍스트가 확정됐을 때. */
    answer(text: string) {
      enqueue(async () => {
        if (sessionId === null || turnId === null) return;
        await client.saveAnswer(sessionId, turnId, text);
      });
    },

    /** 면접을 끝까지 마쳤을 때. */
    complete() {
      enqueue(async () => {
        if (sessionId === null) return;
        await client.complete(sessionId);
      });
    },

    /** 지금까지 쌓인 저장 작업이 모두 끝날 때까지 기다림 (테스트용). */
    idle(): Promise<void> {
      return chain;
    },
  };
}
