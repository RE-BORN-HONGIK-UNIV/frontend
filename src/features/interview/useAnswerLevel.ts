import { useEffect, useRef, useState } from 'react';

/**
 * 마이크 음량(0~100). active일 때만 잰다 — 3단계 면접실 소리 막대가 실제 목소리에 맞춰 움직이게.
 * 오디오 장치(AudioContext)는 스트림당 한 번만 만들어 다시 쓴다(대답마다 새로 만들면 막대 반응이 점점 느려짐).
 */
export function useAnswerLevel(stream: MediaStream | null, active: boolean) {
  const [level, setLevel] = useState(0);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);

  // 스트림이 생기면 오디오 장치를 한 번만 준비, 화면을 떠날 때 정리
  useEffect(() => {
    if (!stream || !stream.getAudioTracks().length) return;
    const ctx = new AudioContext();
    const source = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);
    ctxRef.current = ctx;
    analyserRef.current = analyser;
    return () => {
      source.disconnect();
      ctx.close();
      ctxRef.current = null;
      analyserRef.current = null;
    };
  }, [stream]);

  // 대답 중일 때만 잰다. 약 15번/초 갱신(매 프레임 갱신하면 화면이 계속 다시 그려져 느려짐)
  useEffect(() => {
    const analyser = analyserRef.current;
    if (!active || !analyser) {
      setLevel(0);
      return;
    }
    ctxRef.current?.resume(); // 브라우저가 일시정지해 둔 경우 다시 켬
    const data = new Uint8Array(analyser.frequencyBinCount);
    let rafId = 0;
    let last = 0;
    const tick = (now: number) => {
      rafId = requestAnimationFrame(tick);
      if (now - last < 66) return;
      last = now;
      analyser.getByteFrequencyData(data);
      const avg = data.reduce((a, b) => a + b, 0) / data.length;
      setLevel(Math.min(100, Math.round((avg / 128) * 100)));
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [active]);

  return level;
}