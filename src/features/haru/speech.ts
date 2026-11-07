import { getSpeechAudioUrl } from '@/features/interview/api';

/**
 * 하루 목소리 내기와 대답 받아쓰기 — 경량 웹 voice.ts에서 옮김.
 * - 목소리: 서버 Typecast(POST /interview/tts, tier='haru') → 안 되면 브라우저 기본 목소리.
 * - 받아쓰기: 브라우저 내장 음성 인식(Web Speech API). 하루가 반응할 거리를 만드는 용도라 가볍게 쓴다.
 *   크롬/엣지만 지원하고 크롬은 음성을 Google 서버로 보내 인식한다(면접 기기 점검의 useLiveTranscript와 같은 방식).
 *   지원하지 않는 브라우저면 글 없이 진행되고, 서버가 "말이 글로 잡히지 않았다"로 받아서 다음으로 넘어간다.
 *   1단계 음성 분석은 이 글이 아니라 따로 녹음한 소리로 한다.
 */

let audio: HTMLAudioElement | null = null;
let audioUrl: string | null = null;

export function stopSpeak() {
  audio?.pause();
  audio = null;
  if (audioUrl) URL.revokeObjectURL(audioUrl);
  audioUrl = null;
  if (typeof speechSynthesis !== 'undefined') speechSynthesis.cancel();
}

/** 글을 하루 목소리로 읽고, 다 읽으면(또는 멈추면) 끝나는 Promise */
export async function speak(text: string): Promise<void> {
  stopSpeak();
  const url = await getSpeechAudioUrl(text, 'haru');
  if (url) {
    audioUrl = url;
    const a = (audio = new Audio(url));
    await new Promise<void>((resolve) => {
      a.onended = a.onerror = a.onpause = () => resolve();
      a.play().catch(() => resolve());
    });
    return;
  }
  await browserSpeak(text);
}

/** 브라우저 기본 목소리로 읽기. 끝까지 읽으면 true, 못 읽으면 false (3단계 면접관도 Typecast가 안 될 때 쓴다) */
export function browserSpeak(text: string) {
  return new Promise<boolean>((resolve) => {
    if (typeof speechSynthesis === 'undefined') return resolve(false);
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'ko-KR';
    u.voice = speechSynthesis.getVoices().find((v) => v.lang.startsWith('ko')) ?? null;
    u.pitch = 1.1;
    u.onend = () => resolve(true);
    u.onerror = () => resolve(false);
    speechSynthesis.speak(u);
  });
}

// lib.dom에 SpeechRecognition 타입이 없어서 필요한 부분만 정의
type RecognitionEvent = {
  resultIndex: number;
  results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }>;
};
type Recognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: RecognitionEvent) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  start: () => void;
  stop: () => void;
};
type RecognitionCtor = new () => Recognition;

function recognitionCtor(): RecognitionCtor | undefined {
  if (typeof window === 'undefined') return undefined;
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
}

export const canTranscribe = () => recognitionCtor() !== undefined;

/** 대답 듣기 시작. onText로 지금까지 들은 글을 넘기고, stop()을 부르면 끝난다. */
export function listen(onText: (t: string) => void): { stop(): void } {
  const Ctor = recognitionCtor();
  if (!Ctor) return { stop() {} };
  const r = new Ctor();
  r.lang = 'ko-KR';
  r.continuous = true;
  r.interimResults = true;
  let done = '';
  let on = true;
  r.onresult = (e) => {
    let live = '';
    for (let i = e.resultIndex; i < e.results.length; i++) {
      if (e.results[i].isFinal) done += e.results[i][0].transcript + ' ';
      else live += e.results[i][0].transcript;
    }
    onText((done + live).trim());
  };
  r.onerror = (e) => {
    // 권한 거부 등은 다시 켜도 소용없음 — 글 없이 진행
    if (e.error === 'not-allowed' || e.error === 'service-not-allowed') on = false;
  };
  // 크롬은 조용하면 저절로 끝나서, 듣는 중이면 다시 켠다
  r.onend = () => {
    if (!on) return;
    try {
      r.start();
    } catch {
      /* 이미 켜져 있으면 무시 */
    }
  };
  try {
    r.start();
  } catch {
    return { stop() {} };
  }
  return {
    stop() {
      on = false;
      try {
        r.stop();
      } catch {
        /* ignore */
      }
    },
  };
}
