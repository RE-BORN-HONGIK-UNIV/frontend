import { useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api/client';
import { fallbackLine, type HaruQuestion } from './script';
import { listen, speak, stopSpeak } from './speech';
import type { HaruAnswer } from './store';

export type TalkPhase = 'speak' | 'ready' | 'listen' | 'think' | 'done';
export interface TalkLine {
  ai: boolean;
  text: string;
}

/** 질문별 대답을 모은다 — 하루가 한 번 더 물어서 두 번 답했으면 이어 붙인다. */
export function mergeAnswer(prev: string, next: string): string {
  return [prev.trim(), next.trim()].filter(Boolean).join(' ');
}

/**
 * 하루와의 주고받기 한 단계 — 경량 웹 Flow.tsx의 useTalk에서 옮김.
 * 말하기(speak) → 기다림(ready: 사용자가 "말하기"를 누름) → 듣기(listen) → 반응 만드는 중(think) → 다음 말.
 * 반응은 서버(POST /haru/reply)가 만들고, 실패하면 정해 둔 공감 한마디 + 다음 질문으로 넘어간다.
 * 서버가 retry를 주면 같은 질문을 쉬운 말로 한 번만 다시 묻는다.
 * 마지막 질문 뒤 마무리 인사까지 읽으면 phase='done'이 되고 onDone(질문별 대답)을 부른다.
 * enabled=false면 시작하지 않고 기다린다(2단계: 대기실에서는 조용히 있다가 통화가 연결되면 첫 질문).
 */
export function useHaruTalk(questions: HaruQuestion[], onDone: (answers: HaruAnswer[]) => void, enabled = true) {
  const [cur, setCur] = useState({ i: 0, line: questions[0].q, retried: false });
  const [phase, setPhase] = useState<TalkPhase>('speak');
  const [live, setLive] = useState('');
  const [log, setLog] = useState<TalkLine[]>([{ ai: true, text: questions[0].q }]);
  const [bye, setBye] = useState('');
  const answersRef = useRef<string[]>(questions.map(() => ''));
  const ear = useRef<{ stop(): void } | null>(null);
  const turn = useRef(0); // 읽기를 끊고 다시 읽을 때, 끊긴 읽기의 끝 신호를 무시하려고 센다
  const alive = useRef(true);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  const stopEar = () => {
    ear.current?.stop();
    ear.current = null;
  };
  const start = () => {
    setLive('');
    setPhase('listen');
    ear.current = listen(setLive);
  };
  const ask = (line: string) => {
    const my = ++turn.current;
    setPhase('speak');
    void speak(line).then(() => {
      if (my === turn.current && alive.current) setPhase('ready');
    });
  };

  // 읽던 말을 끊는다 — 끊긴 읽기의 끝 신호가 다음 단계를 건드리지 않게 turn을 올린다
  const cancelSpeak = () => {
    turn.current++;
    stopSpeak();
  };

  // 새 질문(cur)이 정해질 때마다 읽는다
  useEffect(() => {
    if (!enabled) return;
    ask(cur.line);
    return cancelSpeak;
  }, [cur, enabled]);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      stopEar();
      stopSpeak();
    };
  }, []);

  const complete = () => {
    setPhase('done');
    onDoneRef.current(questions.map((q, i) => ({ label: q.label, question: q.q, answer: answersRef.current[i] })));
  };

  /** 대답 끝(skip이면 대답하지 않고 넘어가기) */
  const finish = async (skip = false) => {
    stopEar();
    const answer = skip ? '' : live.trim();
    answersRef.current[cur.i] = mergeAnswer(answersRef.current[cur.i], answer);
    const lines = [...log, { ai: false, text: skip ? '(넘어갔어요)' : answer || '(말로 대답했어요)' }];
    setLog(lines);
    setPhase('think');
    const last = cur.i + 1 >= questions.length;
    const next = last ? null : questions[cur.i + 1].q;
    const r = skip
      ? null
      : await api
          .haruReply({ question: questions[cur.i].q, answer, next, retried: cur.retried, index: cur.i + 1, history: lines })
          .catch(() => null);
    if (!alive.current) return;

    if (r?.retry) {
      setLog([...lines, { ai: true, text: r.say }]);
      setCur({ i: cur.i, line: r.say, retried: true });
      return;
    }
    if (last) {
      const closing = r?.say ?? '오늘 이야기 나눠 줘서 고마워요.';
      setLog([...lines, { ai: true, text: closing }]);
      setBye(closing);
      setPhase('speak');
      const my = ++turn.current;
      await speak(closing);
      if (alive.current && my === turn.current) complete();
      return;
    }
    const line = r?.say ?? fallbackLine(questions, cur.i + 1);
    setLog([...lines, { ai: true, text: line }]);
    setCur({ i: cur.i + 1, line, retried: false });
  };

  /** 하던 대답을 버리고 처음부터 다시 말하기 */
  const again = () => {
    stopEar();
    start();
  };
  /** 하루 말 다시 듣기 */
  const replay = () => {
    stopEar();
    ask(cur.line);
  };

  return { index: cur.i, total: questions.length, line: bye || cur.line, bye, phase, live, log, start, finish, again, replay };
}
