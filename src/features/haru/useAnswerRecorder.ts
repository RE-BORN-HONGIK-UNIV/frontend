import { useEffect, useRef, useState } from 'react';

/**
 * 1단계 음성 분석용 녹음 — 하루와 대화하는 동안 **사용자가 말하는 구간만** 한 파일로 이어 녹음한다.
 * 하루 목소리가 스피커로 나오는 동안엔 녹음을 멈춰 둬서(pause) 하루 목소리가 분석에 섞이지 않게 하고,
 * 대답 사이의 기다림도 빠진다(멈춤 분석이 대답 안의 멈춤만 보게).
 * 녹음 파일은 분석 요청(/analyze)에만 쓰고 기기·서버 어디에도 따로 저장하지 않는다.
 */
export function useAnswerRecorder(recording: boolean) {
  const [error, setError] = useState(false);
  const recRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const spokenMsRef = useRef(0);
  const sinceRef = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    navigator.mediaDevices
      ?.getUserMedia({ audio: true })
      .then((stream) => {
        if (cancelled) return stream.getTracks().forEach((t) => t.stop());
        streamRef.current = stream;
        const rec = new MediaRecorder(stream);
        rec.ondataavailable = (e) => {
          if (e.data.size > 0) chunksRef.current.push(e.data);
        };
        rec.start();
        rec.pause(); // 하루가 먼저 말하므로 멈춘 채로 시작
        recRef.current = rec;
      })
      .catch(() => setError(true));
    return () => {
      cancelled = true;
      if (recRef.current && recRef.current.state !== 'inactive') recRef.current.stop();
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  useEffect(() => {
    const rec = recRef.current;
    if (!rec || rec.state === 'inactive') return;
    if (recording && rec.state === 'paused') {
      rec.resume();
      sinceRef.current = Date.now();
    } else if (!recording && rec.state === 'recording') {
      rec.pause();
      if (sinceRef.current) spokenMsRef.current += Date.now() - sinceRef.current;
      sinceRef.current = null;
    }
  }, [recording]);

  /** 녹음을 끝내고 파일을 돌려준다. 마이크를 못 썼거나 녹음된 게 없으면 null. */
  const finish = () =>
    new Promise<{ file: File; spokenSec: number } | null>((resolve) => {
      const rec = recRef.current;
      if (!rec || rec.state === 'inactive') return resolve(null);
      if (sinceRef.current) spokenMsRef.current += Date.now() - sinceRef.current;
      sinceRef.current = null;
      rec.onstop = () => {
        streamRef.current?.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: rec.mimeType || 'audio/webm' });
        // 사파리는 webm 대신 mp4(aac)로 녹음함 — 백엔드는 확장자로 형식을 거르므로 맞춰 준다
        const name = blob.type.includes('mp4') ? 'haru-talk.m4a' : 'haru-talk.webm';
        resolve(blob.size ? { file: new File([blob], name, { type: blob.type }), spokenSec: spokenMsRef.current / 1000 } : null);
      };
      rec.stop();
    });

  return { error, finish };
}
