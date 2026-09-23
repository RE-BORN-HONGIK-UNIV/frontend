import { useCallback, useEffect, useRef, useState } from 'react';

export type DeviceOption = { deviceId: string; label: string };

type DeviceLists = {
  audioInputs: DeviceOption[];
  videoInputs: DeviceOption[];
  audioOutputs: DeviceOption[];
};

// 스피커 선택(setSinkId)은 Chrome/Edge만 지원. 미지원 브라우저에서는 선택 UI 숨김
type SinkAudio = HTMLAudioElement & { setSinkId?: (id: string) => Promise<void> };
const speakerSupported =
  typeof HTMLMediaElement !== 'undefined' && 'setSinkId' in HTMLMediaElement.prototype;

/** 기기 목록 조회. 권한 허용 전에는 label이 비어 있어서 스트림 연결 후 호출해야 함 */
async function listDevices(): Promise<DeviceLists> {
  const all = await navigator.mediaDevices.enumerateDevices();
  const pick = (kind: MediaDeviceKind, fallback: string) =>
    all
      .filter((d) => d.kind === kind)
      .map((d, i) => ({ deviceId: d.deviceId, label: d.label || `${fallback} ${i + 1}` }));

  return {
    audioInputs: pick('audioinput', '마이크'),
    videoInputs: pick('videoinput', '카메라'),
    audioOutputs: pick('audiooutput', '스피커'),
  };
}

export function useMediaPreview() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [status, setStatus] = useState<'idle' | 'requesting' | 'ready' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [audioLevel, setAudioLevel] = useState(0); // 0~100 사이 음량 레벨
  // ref만 반환하면 스트림이 바뀌어도 화면이 갱신되지 않아서 state로도 보관
  const [stream, setStream] = useState<MediaStream | null>(null);

  const [devices, setDevices] = useState<DeviceLists>({
    audioInputs: [],
    videoInputs: [],
    audioOutputs: [],
  });

  // 유저가 직접 고른 장치. 바뀌면 스트림을 다시 연결함
  const [audioInputId, setAudioInputId] = useState<string>();
  const [videoInputId, setVideoInputId] = useState<string>();
  const [speakerId, setSpeakerId] = useState<string>();

  // 처음엔 브라우저 기본 장치로 연결되므로, 실제 연결된 장치 id를 따로 기록 (선택창 표시용)
  const [activeAudioId, setActiveAudioId] = useState<string>();
  const [activeVideoId, setActiveVideoId] = useState<string>();

  useEffect(() => {
    let cancelled = false;
    let audioContext: AudioContext | null = null;
    let animationFrameId: number;

    async function startStream() {
      setStatus('requesting');
      try {
        const newStream = await navigator.mediaDevices.getUserMedia({
          audio: audioInputId ? { deviceId: { exact: audioInputId } } : true,
          video: videoInputId ? { deviceId: { exact: videoInputId } } : true,
        });

        if (cancelled) {
          newStream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = newStream;
        setStream(newStream);
        if (videoRef.current) {
          videoRef.current.srcObject = newStream;
        }

        setActiveAudioId(newStream.getAudioTracks()[0]?.getSettings().deviceId);
        setActiveVideoId(newStream.getVideoTracks()[0]?.getSettings().deviceId);
        setDevices(await listDevices());
        setStatus('ready');

        // ── 여기부터 마이크 음량 측정 ──
        audioContext = new AudioContext();
        const source = audioContext.createMediaStreamSource(newStream);
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
  }, [audioInputId, videoInputId]);

  // 이어폰 연결/해제처럼 기기가 바뀌면 목록 갱신
  useEffect(() => {
    const handleChange = () => listDevices().then(setDevices);
    navigator.mediaDevices.addEventListener('devicechange', handleChange);
    return () => navigator.mediaDevices.removeEventListener('devicechange', handleChange);
  }, []);

  /** 선택한 스피커로 짧은 확인음 재생 */
  const playTestSound = useCallback(async () => {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const dest = ctx.createMediaStreamDestination();

    osc.frequency.value = 660;
    gain.gain.value = 0.2;
    osc.connect(gain).connect(dest);

    // AudioContext는 출력 장치를 못 고르므로 audio 태그를 거쳐서 재생
    const audio: SinkAudio = new Audio();
    audio.srcObject = dest.stream;
    if (speakerId && audio.setSinkId) await audio.setSinkId(speakerId);

    await audio.play();
    osc.start();
    osc.stop(ctx.currentTime + 0.6);
    setTimeout(() => {
      audio.pause();
      ctx.close();
    }, 700);
  }, [speakerId]);

  return {
    videoRef,
    status,
    errorMessage,
    audioLevel,
    stream,
    devices,
    audioInputId: audioInputId ?? activeAudioId,
    videoInputId: videoInputId ?? activeVideoId,
    speakerId,
    speakerSupported,
    setAudioInputId,
    setVideoInputId,
    setSpeakerId,
    playTestSound,
  };
}