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

// 음량 갱신 간격(ms). 매 프레임(60fps) 갱신하면 화면 전체가 계속 다시 그려져서 느려짐
const LEVEL_UPDATE_MS = 66; // 약 15fps

/**
 * measureLevel: 음량 막대가 필요한 화면(기기 점검)에서만 true.
 * false면 음량 값을 갱신하지 않아서, 면접 중 불필요하게 화면이 다시 그려지지 않음
 */
export function useMediaPreview({ measureLevel = true }: { measureLevel?: boolean } = {}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  // 스트림 연결 effect 안에서 최신 값을 읽기 위해 ref로 보관
  const measureLevelRef = useRef(measureLevel);
  measureLevelRef.current = measureLevel;
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
        let lastUpdate = 0;
        let lastLevel = -1;

        function tick(now: number) {
          animationFrameId = requestAnimationFrame(tick);
          // 음량이 필요 없는 화면이거나, 갱신 간격이 안 됐으면 건너뜀
          if (!measureLevelRef.current || now - lastUpdate < LEVEL_UPDATE_MS) return;
          lastUpdate = now;

          analyser.getByteFrequencyData(dataArray);
          const avg = dataArray.reduce((sum, v) => sum + v, 0) / dataArray.length;
          const level = Math.min(100, Math.round((avg / 128) * 100));
          // 값이 그대로면 state를 안 바꿔서 불필요한 다시 그리기 방지
          if (level !== lastLevel) {
            lastLevel = level;
            setAudioLevel(level);
          }
        }
        animationFrameId = requestAnimationFrame(tick);
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