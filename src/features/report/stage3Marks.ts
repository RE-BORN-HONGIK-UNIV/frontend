/**
 * 3단계 리포트 "질문별 말버릇·멈춤 표시" 글을 만든다 (순수 함수).
 *
 * 3단계 면접 대답은 대답하는 구간만 이어 녹음해 1단계와 같은 목소리 분석(/analyze, stage=3)으로 보낸다.
 * 분석이 돌려준 Whisper 단어(words)와 채움말·소리 늘이기·긴 멈춤 시각은 모두 그 녹음 안의 시각이라,
 * 대답마다 녹음 안에서 시작·끝난 시각(turns)으로 잘라 질문별 글을 만든다. 새로 판정하지 않고 이미 판정된
 * 시각을 단어 위치에 놓기만 한다 — 그래서 위치는 실제로 그 말을 한 자리다(지어낸 위치가 아님).
 *
 * 표기는 리포트 Script 컴포넌트와 같다: [f:음](말버릇) [l:저어](소리 늘이기) [p:3초 멈춤]
 * ([k:…] 면접관을 바라보며 말한 부분은 얼굴 분석 시각과 녹음 시각이 달라 아직 넣지 않는다)
 */

export interface TimedText {
  text: string;
  start: number;
  end: number;
}

export interface AnswerTurn {
  /** 몇 번째 질문의 대답인지(transcript 순서) */
  question: number;
  /** 녹음 파일 안에서 이 대답이 시작·끝난 시각(초) */
  start: number;
  end: number;
}

export interface Stage3VoiceTimes {
  words: TimedText[];
  fillers: TimedText[];
  prolongs: TimedText[];
  longPauses: { start: number; end: number; duration: number }[];
}

const overlaps = (a: { start: number; end: number }, b: { start: number; end: number }) =>
  Math.min(a.end, b.end) - Math.max(a.start, b.start) > 0.01;

/** 대답 하나(녹음 구간)의 표시 글 */
function markWindow(times: Stage3VoiceTimes, win: { start: number; end: number }): string {
  const inWin = (t: { start: number; end: number }) => t.start >= win.start - 0.05 && t.start < win.end;
  const words = times.words.filter(inWin);
  const fillers = times.fillers.filter(inWin);
  const prolongs = times.prolongs.filter(inWin);
  // 대답 안의 멈춤만 — 대답과 대답 사이(녹음을 멈춘 시간)는 파일에 없으니 걸릴 일이 없지만, 경계에 걸친 건 뺀다
  const pauses = times.longPauses.filter((p) => p.start >= win.start && p.end <= win.end);

  type Token = { at: number; text: string };
  const tokens: Token[] = [];
  const usedFillers = new Set<number>();
  for (const w of words) {
    const fi = fillers.findIndex((f, i) => !usedFillers.has(i) && overlaps(f, w));
    if (fi >= 0) {
      usedFillers.add(fi);
      tokens.push({ at: w.start, text: `[f:${w.text}]` });
    } else if (prolongs.some((p) => overlaps(p, w))) {
      tokens.push({ at: w.start, text: `[l:${w.text}]` });
    } else {
      tokens.push({ at: w.start, text: w.text });
    }
  }
  // 단어와 겹치지 않는 채움말(소리로만 잡힌 "음" 등)은 그 시각 자리에 넣는다
  fillers.forEach((f, i) => {
    if (!usedFillers.has(i)) tokens.push({ at: f.start, text: `[f:${f.text}]` });
  });
  for (const p of pauses) tokens.push({ at: p.start + 0.001, text: `[p:${Math.round(p.duration)}초 멈춤]` });

  return tokens
    .sort((a, b) => a.at - b.at)
    .map((t) => t.text)
    .join(' ')
    .trim();
}

/**
 * 질문별 표시 글. questions: 면접에서 한 질문(순서대로). 대답을 한 마디도 안 한 질문(넘어감)은 뺀다.
 * 같은 질문에 대답이 여러 번이면(다시 들려주세요 뒤 다시 대답) 이어 붙인다.
 */
export function buildStage3Marks(questions: string[], turns: AnswerTurn[], times: Stage3VoiceTimes): { question: string; script: string }[] {
  return questions
    .map((question, qi) => ({
      question,
      script: turns
        .filter((t) => t.question === qi && t.end > t.start)
        .map((t) => markWindow(times, t))
        .filter(Boolean)
        .join(' '),
    }))
    .filter((m) => m.script);
}
