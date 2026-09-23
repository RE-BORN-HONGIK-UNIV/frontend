import { useCallback, useEffect, useState } from 'react';

/**
 * 브라우저 내장 Web Speech API로 말하는 내용을 실시간 텍스트로 받아옴.
 * 마이크 점검용이라 가볍게 쓰는 목적. 면접 답변 분석은 기존 Whisper 파이프라인 사용.
 * Chrome/Edge만 지원. Chrome은 음성을 Google 서버로 보내서 인식함.
 * 미지원 브라우저에서는 supported=false → 화면에서 음량 기반 점검으로 대체.
 */

// lib.dom에 SpeechRecognition 타입이 없어서 필요한 부분만 최소로 정의
type RecognitionResultEvent = {
  results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }>;
};
type RecognitionErrorEvent = { error: string };
type Recognition = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((e: RecognitionResultEvent) => void) | null;
  onerror: ((e: RecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  abort: () => void;
};
type RecognitionCtor = new () => Recognition;

function getRecognitionCtor(): RecognitionCtor | undefined {
  if (typeof window === 'undefined') return undefined;
  const w = window as unknown as {
    SpeechRecognition?: RecognitionCtor;
    webkitSpeechRecognition?: RecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
}

export function useLiveTranscript({ active, lang = 'ko-KR' }: { active: boolean; lang?: string }) {
  const supported = getRecognitionCtor() !== undefined;
  const [transcript, setTranscript] = useState('');
  // 말이 끝나서 인식 결과가 확정됐는지. 중간 결과(interim)로 통과되는 것 방지용
  const [isFinal, setIsFinal] = useState(false);
  const [failed, setFailed] = useState(false); // 권한 거부·네트워크 오류 등으로 인식 불가
  // 값이 바뀌면 인식을 새로 시작함 (이전에 읽은 내용 버리고 다시 듣기)
  const [session, setSession] = useState(0);

  useEffect(() => {
    const Ctor = getRecognitionCtor();
    if (!Ctor || !active || failed) return;

    const rec = new Ctor();
    rec.lang = lang;
    rec.interimResults = true; // 말하는 도중에도 결과를 받아서 실시간으로 표시
    rec.continuous = true;

    let stopped = false;

    rec.onresult = (e) => {
      let text = '';
      for (let i = 0; i < e.results.length; i++) {
        text += e.results[i][0].transcript;
      }
      setTranscript(text);
      setIsFinal(e.results[e.results.length - 1].isFinal);
    };

    rec.onerror = (e) => {
      // no-speech(한동안 말 안 함)는 무시하고 onend에서 재시작
      if (e.error !== 'no-speech' && e.error !== 'aborted') {
        stopped = true;
        setFailed(true);
      }
    };

    // 크롬은 일정 시간 조용하면 인식을 스스로 끝내서, 점검 중이면 다시 시작
    rec.onend = () => {
      if (stopped) return;
      try {
        rec.start();
      } catch {
        // 이미 시작된 상태면 무시
      }
    };

    rec.start();

    return () => {
      stopped = true;
      rec.abort();
    };
  }, [active, lang, failed, session]);

  const reset = useCallback(() => {
    setTranscript('');
    setIsFinal(false);
    setSession((n) => n + 1);
  }, []);

  return { supported: supported && !failed, transcript, isFinal, reset };
}

/**
 * 인식된 문장이 목표 문장과 얼마나 비슷한지 0~1로 반환.
 * 공백·문장부호를 빼고 글자 단위 편집거리(Levenshtein)로 비교함.
 */
export function getSimilarity(spoken: string, target: string): number {
  const clean = (s: string) => s.replace(/[\s.,!?~"'“”]/g, '');
  const a = clean(spoken);
  const b = clean(target);
  if (!a || !b) return 0;

  // dp[j] = a의 앞부분과 b[0..j]의 편집거리
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const curr = [i];
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
    }
    prev = curr;
  }

  return 1 - prev[b.length] / Math.max(a.length, b.length);
}