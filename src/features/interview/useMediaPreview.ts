import { useEffect, useRef, useState } from 'react';

export function useMediaPreview() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [status, setStatus] = useState<'idle' | 'requesting' | 'ready' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [audioLevel, setAudioLevel] = useState(0); // 0~100 사이 음량 레벨

  useEffect(() => {
    let cancelled = false;
    let audioContext: AudioContext | null = null;
    let animationFrameId: number;

    async function startStream() {
      setStatus('requesting');
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: true,
        });

        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setStatus('ready');

        // ── 여기부터 마이크 음량 측정 ──
        audioContext = new AudioContext();
        const source = audioContext.createMediaStreamSource(stream);
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);

        const dataArray = new Uint8Array(analyser.frequencyBinCount);

        function tick() {
          analyser.getByteFrequencyData(dataArray);
          const avg = dataArray.reduce((sum, v) => sum + v, 0) / dataArray.length;
          setAudioLevel(Math.min(100, Math.round((avg / 128) * 100)));
          animationFrameId = requestAnimationFrame(tick);
        }
        tick();
      } catch (err) {
        if (cancelled) return;
        setStatus('error');
        setErrorMessage(
          err instanceof Error ? err.message : '카메라/마이크 접근에 실패했어요.'
        );
      }
    }

    startStream();

    return () => {
      cancelled = true;
      cancelAnimationFrame(animationFrameId);
      audioContext?.close();
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, []);

    return { videoRef, status, errorMessage, audioLevel, stream: streamRef.current };
}