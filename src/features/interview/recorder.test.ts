import { describe, expect, it, vi } from 'vitest';
import { createDisabledRecorder, createInterviewRecorder, type InterviewRecorderClient } from './recorder';

function makeClient(overrides: Partial<InterviewRecorderClient> = {}) {
  let turnSeq = 0;
  const client: InterviewRecorderClient = {
    start: vi.fn(async () => ({ id: 7 })),
    addTurn: vi.fn(async () => ({ id: ++turnSeq })),
    saveAnswer: vi.fn(async () => ({})),
    complete: vi.fn(async () => ({})),
    ...overrides,
  };
  return client;
}

describe('createInterviewRecorder', () => {
  it('세션 시작 → 질문 저장 → 답변 저장 → 완료를 순서대로, 올바른 id로 호출한다', async () => {
    const client = makeClient();
    const rec = createInterviewRecorder('practice', client);
    rec.start();
    rec.ask('main', '자기소개 부탁드려요');
    rec.answer('안녕하세요');
    rec.ask('follow_up', '더 설명해주세요');
    rec.answer('네, 그게...');
    rec.complete();
    await rec.idle();

    expect(client.start).toHaveBeenCalledWith('practice');
    expect(client.addTurn).toHaveBeenNthCalledWith(1, 7, 'main', '자기소개 부탁드려요');
    expect(client.addTurn).toHaveBeenNthCalledWith(2, 7, 'follow_up', '더 설명해주세요');
    expect(client.saveAnswer).toHaveBeenNthCalledWith(1, 7, 1, '안녕하세요');
    expect(client.saveAnswer).toHaveBeenNthCalledWith(2, 7, 2, '네, 그게...');
    expect(client.complete).toHaveBeenCalledWith(7);
  });

  it('start를 여러 번 불러도 세션은 한 번만 만든다 (개발 모드 StrictMode 이중 실행 대비)', async () => {
    const client = makeClient();
    const rec = createInterviewRecorder('standard', client);
    rec.start();
    rec.start();
    await rec.idle();
    expect(client.start).toHaveBeenCalledTimes(1);
  });

  it('세션 생성이 실패하면 이후 저장은 전부 조용히 건너뛰고 에러를 던지지 않는다', async () => {
    const client = makeClient({ start: vi.fn(async () => { throw new Error('401'); }) });
    const rec = createInterviewRecorder('standard', client);
    rec.start();
    rec.ask('main', 'q');
    rec.answer('a');
    rec.complete();
    await expect(rec.idle()).resolves.toBeUndefined();
    expect(client.addTurn).not.toHaveBeenCalled();
    expect(client.saveAnswer).not.toHaveBeenCalled();
    expect(client.complete).not.toHaveBeenCalled();
  });

  it('질문 저장이 실패하면 그 질문의 답변은 저장하지 않는다 (이전 질문에 잘못 붙지 않음)', async () => {
    let call = 0;
    const client = makeClient({
      addTurn: vi.fn(async () => {
        call += 1;
        if (call === 2) throw new Error('500');
        return { id: call };
      }),
    });
    const rec = createInterviewRecorder('standard', client);
    rec.start();
    rec.ask('main', 'q1');
    rec.answer('a1');
    rec.ask('follow_up', 'q2');   // 저장 실패
    rec.answer('a2');             // 건너뛰어야 함 — q1(id=1)에 덮어쓰면 안 됨
    await rec.idle();
    expect(client.saveAnswer).toHaveBeenCalledTimes(1);
    expect(client.saveAnswer).toHaveBeenCalledWith(7, 1, 'a1');
  });

  it('이전 답변 저장이 아직 끝나기 전에 다음 질문이 나와도 이전 답변이 유실되지 않는다', async () => {
    // 답변 저장이 느린 서버: 그 사이에 다음 질문(ask)이 호출됨 — 순서가 큐로 보장돼야 한다
    let release!: () => void;
    const slow = new Promise<void>((r) => { release = r; });
    const client = makeClient({ saveAnswer: vi.fn(async () => { await slow; return {}; }) });
    const rec = createInterviewRecorder('standard', client);
    rec.start();
    rec.ask('main', 'q1');
    rec.answer('a1');       // 느린 저장
    rec.ask('main', 'q2');  // 바로 이어서 다음 질문
    release();
    await rec.idle();
    expect(client.saveAnswer).toHaveBeenCalledWith(7, 1, 'a1');
    expect(client.addTurn).toHaveBeenNthCalledWith(2, 7, 'main', 'q2');
  });

  it('답변 저장·완료가 실패해도 이후 저장은 계속 진행된다', async () => {
    const client = makeClient({ saveAnswer: vi.fn(async () => { throw new Error('500'); }) });
    const rec = createInterviewRecorder('standard', client);
    rec.start();
    rec.ask('main', 'q1');
    rec.answer('a1');   // 실패
    rec.ask('main', 'q2');
    rec.complete();
    await rec.idle();
    expect(client.addTurn).toHaveBeenCalledTimes(2);
    expect(client.complete).toHaveBeenCalledWith(7);
  });

  it('sessionId()는 세션 생성이 끝나면 id를, 실패하면 null을 돌려준다', async () => {
    const ok = createInterviewRecorder('standard', makeClient());
    expect(ok.sessionId()).toBeNull(); // 생성 전
    ok.start();
    await ok.idle();
    expect(ok.sessionId()).toBe(7);

    const failed = createInterviewRecorder(
      'standard',
      makeClient({ start: vi.fn(async () => { throw new Error('401'); }) }),
    );
    failed.start();
    await failed.idle();
    expect(failed.sessionId()).toBeNull();
  });
});

describe('createDisabledRecorder (동의하지 않은 면접)', () => {
  it('어떤 호출을 해도 에러 없이 아무 것도 하지 않고 sessionId는 null이다', async () => {
    const rec = createDisabledRecorder();
    rec.start();
    rec.ask('main', '질문');
    rec.answer('답변');
    rec.complete();
    await expect(rec.idle()).resolves.toBeUndefined();
    expect(rec.sessionId()).toBeNull();
  });
});
