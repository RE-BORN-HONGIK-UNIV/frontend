import { useEffect, useRef, useState } from 'react';
import { Alert, Box, Button, LoadingBar, Stack, Text } from '@/components/ui';
import type { DeviceOption, useMediaPreview } from '@/features/interview/useMediaPreview';
import { getSimilarity, useLiveTranscript } from '@/features/interview/useLiveTranscript';

// 마이크 체크 때 따라 읽을 문장
const READ_SENTENCE = '안녕하세요, 오늘 면접 잘 부탁드립니다.';

// audioLevel(0~100) 기준 임계값. 실제 환경에서 측정해보고 조정 필요
const NOISE_LOUD = 30; // 평균이 이 값 이상이면 시끄러운 환경으로 안내
const VOICE_LEVEL = 25; // 이 값 이상이면 말하는 중으로 판단

// 점검 블록·영상·장치 선택·버튼 공통 최대 폭
const CONTENT_WIDTH = 560;

const SAMPLE_MS = 100;
const NOISE_SAMPLES = 20; // 소음 측정 2초
const VOICE_SAMPLES = 20; // (음성 인식 미지원 시) 누적 2초 이상 말하면 통과

// 확정된 인식 결과가 목표 문장과 이 비율 이상 비슷하면 통과.
// 긴장해서 조금 틀려도 통과되도록 너그럽게 설정
const MATCH_RATIO = 0.7;

/**
 * idle: 시작 전 (마이크 버튼 대기)
 * noise: 2초간 주변 소음 측정
 * speak: 문장 읽기
 * done: 마이크 확인 완료
 */
type CheckPhase = 'idle' | 'noise' | 'speak' | 'done';

/**
 * 카메라/마이크 점검 화면.
 * 마이크 점검은 영상 위 한 블록 안에서 진행됨 (소음 측정 → 문장 읽기 → 완료).
 * 문장 읽기는 음성 인식 결과가 확정(말이 끝남)된 뒤 목표 문장과 비교해서 통과 여부 판단.
 * 음성 인식 미지원 브라우저는 음량이 일정 시간 이상 감지되면 통과.
 * 마이크를 바꾸면 점검을 처음부터 다시 해야 함.
 */
export function MediaTestView({
  media,
  onNext,
}: {
  media: ReturnType<typeof useMediaPreview>;
  onNext: () => void;
}) {
  const {
    videoRef,
    status,
    errorMessage,
    audioLevel,
    stream,
    devices,
    audioInputId,
    videoInputId,
    speakerId,
    speakerSupported,
    setAudioInputId,
    setVideoInputId,
    setSpeakerId,
  } = media;

  const [phase, setPhase] = useState<CheckPhase>('idle');
  const [noisy, setNoisy] = useState(false);
  const [voiceProgress, setVoiceProgress] = useState(0); // 0~VOICE_SAMPLES
  // 끝까지 읽었는데 문장과 달랐을 때, 어떻게 들렸는지 보여주기 위해 보관
  const [missedText, setMissedText] = useState<string | null>(null);

  const live = useLiveTranscript({ active: status === 'ready' && phase === 'speak' });

  // interval 안에서 최신 audioLevel을 읽기 위해 ref에 따로 보관
  const levelRef = useRef(audioLevel);
  levelRef.current = audioLevel;

  // video 태그가 뒤늦게 화면에 나타날 때 스트림을 다시 연결해줌
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream, videoRef]);

  // 1단계: 주변 소음 측정. 일정 시간 audioLevel 평균으로 판단
  useEffect(() => {
    if (status !== 'ready' || phase !== 'noise') return;

    const samples: number[] = [];
    const timer = setInterval(() => {
      samples.push(levelRef.current);
      if (samples.length < NOISE_SAMPLES) return;

      clearInterval(timer);
      const avg = samples.reduce((a, b) => a + b, 0) / samples.length;
      setNoisy(avg >= NOISE_LOUD);
      setPhase('speak');
    }, SAMPLE_MS);

    return () => clearInterval(timer);
  }, [status, phase]);

  // 2단계(음성 인식): 말이 끝나서 결과가 확정됐을 때만 판단.
  // 중간 결과로 판단하면 문장 끝까지 읽기 전에 통과되는 문제가 있었음
  useEffect(() => {
    if (phase !== 'speak' || !live.supported || !live.isFinal || !live.transcript) return;

    if (getSimilarity(live.transcript, READ_SENTENCE) >= MATCH_RATIO) {
      setMissedText(null);
      setPhase('done');
      return;
    }

    // 쉼표 등에서 잠깐 멈추면 문장 중간에도 결과가 확정됨.
    // 아직 문장 길이만큼 말하지 않았으면 이어서 읽는 중으로 보고 계속 들음
    const spokenLen = live.transcript.replace(/\s/g, '').length;
    const targetLen = READ_SENTENCE.replace(/[\s.,]/g, '').length;
    if (spokenLen < targetLen * 0.8) return;

    // 문장 길이만큼 말했는데 다르면 다시 읽도록 안내하고, 다음 시도와 섞이지 않게 인식을 새로 시작
    setMissedText(live.transcript);
    live.reset();
  }, [phase, live.supported, live.isFinal, live.transcript, live.reset]);

  // 2단계(음성 인식 미지원 시 대체): 목소리 크기가 기준을 넘은 시간이 누적되면 통과
  useEffect(() => {
    if (status !== 'ready' || phase !== 'speak' || live.supported) return;

    let voiced = 0;
    const timer = setInterval(() => {
      if (levelRef.current >= VOICE_LEVEL) {
        voiced += 1;
        setVoiceProgress(voiced);
      }
      if (voiced >= VOICE_SAMPLES) {
        clearInterval(timer);
        setPhase('done');
      }
    }, SAMPLE_MS);

    return () => clearInterval(timer);
  }, [status, phase, live.supported]);

  const startCheck = () => {
    setNoisy(false);
    setVoiceProgress(0);
    setMissedText(null);
    live.reset();
    setPhase('noise');
  };

  // 마이크가 바뀌면 이전 점검 결과는 의미 없으므로 처음 상태로 되돌림
  const handleMicChange = (id: string) => {
    setAudioInputId(id);
    setPhase('idle');
  };

  const cameraOk = status === 'ready';
  const micOk = phase === 'done';

  return (
    <Stack align="center" gap={16} style={{ paddingTop: 32, paddingInline: 16 }}>
      <Stack gap={6} ta="center">
        <Text fz={22} fw={700}>
          면접 전에 환경을 같이 점검해볼게요
        </Text>
        <Text fz={13} c="var(--rb-ink-soft)" style={{ lineHeight: 1.6 }}>
          목소리와 표정이 잘 담겨야 더 정확한 피드백을 드릴 수 있어요.
          <br />
          답변할 때는 내 화면 대신 면접관 화면만 보여요.
        </Text>
      </Stack>

      {/* 마이크 점검 블록. 소음 측정·문장 읽기·결과가 모두 이 안에서 진행됨 */}
      {cameraOk && (
        <MicCheckBar
          phase={phase}
          transcript={live.transcript}
          speechSupported={live.supported}
          voicePercent={Math.round((voiceProgress / VOICE_SAMPLES) * 100)}
          missedText={missedText}
          noisy={noisy}
          audioLevel={audioLevel}
          onStart={startCheck}
        />
      )}

      <Box
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: CONTENT_WIDTH,
          aspectRatio: '16 / 9', // 720p 카메라 비율. 4:3이면 양옆이 잘림
          borderRadius: 16,
          overflow: 'hidden',
          background: '#000',
          border: '1px solid var(--rb-line)',
        }}
      >
        {status === 'requesting' && (
          <Stack align="center" justify="center" style={{ height: '100%' }}>
            <LoadingBar label="카메라를 켜는 중" />
          </Stack>
        )}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            display: cameraOk ? 'block' : 'none',
            transform: 'scaleX(-1)',
          }}
        />

        {/* 얼굴 위치 가이드. 2단계 시선·표정 분석 정확도를 위해 정면 중앙 위치 유도 */}
        {/* TODO: 2단계 얼굴 인식 연동 후 가이드 안에 얼굴이 있는지 실제로 판별 */}
        {cameraOk && (
          <>
            <Box
              aria-hidden
              style={{
                position: 'absolute',
                left: '50%',
                top: '47%',
                height: '72%',
                aspectRatio: '3 / 4',
                transform: 'translate(-50%, -50%)',
                border: '2px dashed rgba(255, 255, 255, 0.7)',
                borderRadius: '50%',
                pointerEvents: 'none',
              }}
            />
            <Text
              fz={12}
              style={{
                position: 'absolute',
                bottom: 12,
                left: 0,
                right: 0,
                textAlign: 'center',
                color: '#fff',
                textShadow: '0 1px 3px rgba(0,0,0,0.6)',
              }}
            >
              얼굴이 점선 안에 들어오게 맞춰주세요
            </Text>
          </>
        )}
      </Box>

      {/* 장치 선택. 화면이 길어지지 않도록 한 줄로 배치 */}
      {cameraOk && (
        <Box style={{ display: 'flex', gap: 6, width: '100%', maxWidth: CONTENT_WIDTH }}>
          <DeviceSelect
            icon="🎙️"
            label="마이크"
            options={devices.audioInputs}
            value={audioInputId}
            onChange={handleMicChange}
          />
          <DeviceSelect
            icon="🔈"
            label="스피커"
            options={devices.audioOutputs}
            value={speakerId}
            onChange={setSpeakerId}
            disabled={!speakerSupported} // Chrome/Edge 외 브라우저는 선택 불가
          />
          <DeviceSelect
            icon="📷"
            label="카메라"
            options={devices.videoInputs}
            value={videoInputId}
            onChange={setVideoInputId}
          />
        </Box>
      )}

      {status === 'error' && (
        <Alert color="red" variant="light" fz={13} style={{ maxWidth: CONTENT_WIDTH, width: '100%' }}>
          {errorMessage ?? '카메라/마이크 권한을 확인해주세요.'}
        </Alert>
      )}

      <Button
        color="brand"
        radius="md"
        size="md"
        onClick={onNext}
        disabled={!cameraOk || !micOk}
        style={{ width: '100%', maxWidth: CONTENT_WIDTH }}
      >
        준비됐어요, 시작할게요
      </Button>

      <Text fz={11} c="var(--rb-ink-faint)" ta="center">
        촬영된 영상은 분석에만 쓰이고 저장되거나 공개되지 않아요.
      </Text>
    </Stack>
  );
}

/**
 * 마이크 점검 한 줄 블록.
 * 왼쪽: 읽을 문장 / 오른쪽: 실시간 인식 결과, 오른쪽 끝: 시작·다시하기 버튼
 */
function MicCheckBar({
  phase,
  transcript,
  speechSupported,
  voicePercent,
  missedText,
  noisy,
  audioLevel,
  onStart,
}: {
  phase: CheckPhase;
  transcript: string;
  speechSupported: boolean;
  voicePercent: number;
  missedText: string | null;
  noisy: boolean;
  audioLevel: number;
  onStart: () => void;
}) {
  const done = phase === 'done';

  // 오른쪽 칸에 보여줄 내용 (인식 결과 + 상태 한 줄)
  let resultText = '';
  let statusText = '';
  if (phase === 'speak') {
    if (!speechSupported) {
      resultText = `듣는 중 ${voicePercent}%`;
    } else if (transcript) {
      resultText = transcript;
    } else if (missedText) {
      resultText = missedText;
      statusText = '조금 다르게 들렸어요. 한 번 더 읽어주세요';
    } else {
      resultText = '듣고 있어요…';
    }
  } else if (done) {
    resultText = transcript || '목소리 확인됨';
    statusText = noisy ? '마이크 정상 · 조용한 곳이면 더 정확해요' : '마이크·음성 인식 정상';
  }

  return (
    <Box
      style={{
        position: 'relative',
        width: '100%',
        maxWidth: CONTENT_WIDTH,
        padding: '12px 14px',
        borderRadius: 14,
        background: 'var(--rb-surface)',
        border: `1px solid ${done ? 'var(--rb-primary-strong)' : 'var(--rb-line)'}`,
        overflow: 'hidden',
      }}
    >
      <Box style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {phase === 'idle' && (
          <Text fz={13} fw={600} style={{ flex: 1 }}>
            마이크 버튼을 누르고 안내 문장을 읽어주세요
          </Text>
        )}

        {phase === 'noise' && (
          <Box style={{ flex: 1 }}>
            <Text fz={13} fw={600}>
              주변 소리를 확인하고 있어요
            </Text>
            <Text fz={11} c="var(--rb-ink-soft)">
              2초만 조용히 기다려주세요
            </Text>
          </Box>
        )}

        {(phase === 'speak' || done) && (
          <>
            {/* 읽을 문장 */}
            {/* 읽을 문장은 줄어들지 않고 한 줄로 고정, 남는 폭은 인식 결과 칸이 사용 */}
            <Box style={{ flexShrink: 0 }}>
              <Text fz={13} fw={600} style={{ whiteSpace: 'nowrap' }}>
                {READ_SENTENCE}
              </Text>
              <Text fz={11} c="var(--rb-ink-soft)">
                위 문장을 편하게 읽어주세요
              </Text>
            </Box>

            <Text fz={12} c="var(--rb-ink-faint)" aria-hidden>
              →
            </Text>

            {/* 실시간 인식 결과 */}
            <Box style={{ flex: 1, minWidth: 0 }} aria-live="polite">
              <Text
                fz={13}
                fw={600}
                c={done ? 'var(--rb-primary-strong)' : transcript ? undefined : 'var(--rb-ink-faint)'}
                style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
              >
                {resultText}
              </Text>
              {statusText && (
                <Text fz={11} c={done ? 'var(--rb-primary-strong)' : 'var(--rb-ink-soft)'}>
                  {statusText}
                </Text>
              )}
            </Box>
          </>
        )}

        {/* 시작 전엔 마이크 버튼, 시작 후엔 다시하기 버튼 */}
        {phase !== 'noise' && (
          <Button
            variant={phase === 'idle' ? 'filled' : 'subtle'}
            color="brand"
            radius="xl"
            size="compact-md"
            onClick={onStart}
            aria-label={phase === 'idle' ? '마이크 점검 시작' : '마이크 점검 다시 하기'}
            style={{ flexShrink: 0 }}
          >
            {phase === 'idle' ? '🎙️' : '↻'}
          </Button>
        )}
      </Box>

      {/* 마이크 반응 표시. 점검 중일 때만 블록 아래쪽에 얇게 표시 */}
      {(phase === 'noise' || phase === 'speak') && (
        <Box
          aria-hidden
          style={{
            position: 'absolute',
            left: 0,
            bottom: 0,
            height: 3,
            width: `${audioLevel}%`,
            background: 'var(--rb-primary-strong)',
            transition: 'width 80ms ease-out',
          }}
        />
      )}
    </Box>
  );
}

/** 장치 선택 드롭다운. 한 줄에 3개가 들어가도록 폭을 균등 분배 */
function DeviceSelect({
  icon,
  label,
  options,
  value,
  onChange,
  disabled,
}: {
  icon: string;
  label: string;
  options: DeviceOption[];
  value?: string;
  onChange: (id: string) => void;
  disabled?: boolean;
}) {
  return (
    <label
      style={{
        flex: '1 1 0',
        minWidth: 0,
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        padding: '4px 8px',
        borderRadius: 999,
        border: '1px solid var(--rb-line)',
        fontSize: 12,
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <span aria-hidden>{icon}</span>
      <select
        aria-label={`${label} 선택`}
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        style={{
          flex: 1,
          minWidth: 0,
          border: 'none',
          background: 'transparent',
          fontSize: 12,
          textOverflow: 'ellipsis',
          cursor: disabled ? 'default' : 'pointer',
        }}
      >
        {options.length === 0 && <option value="">{label} 없음</option>}
        {options.map((d) => (
          <option key={d.deviceId} value={d.deviceId}>
            {d.label}
          </option>
        ))}
      </select>
    </label>
  );
}