import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Alert, Box, Button, Group, Paper, Stack, Text } from '@/components/ui';
import type { GazeBlinkResult } from '@/lib/api/types';
import { HaruAvatar, TileTag } from '@/features/haru/HaruAvatar';
import { STAGE2_QUESTIONS } from '@/features/haru/script';
import { saveStageAnswers } from '@/features/haru/store';
import { linkStyle } from '@/features/haru/styles';
import { useHaruTalk } from '@/features/haru/useHaruTalk';
import { useLiveFaceSession } from './useLiveFaceSession';
import { FaceDebugPanel } from './FaceDebugPanel';

/** 통화 중 얼굴이 이 시간 넘게 안 잡히면 알려 준다 — 잠깐 고개를 숙이는 정도로는 안 뜨게(내 얼굴은 안 보여 주므로
 * 스스로 알 방법이 이것뿐이다. 얼굴이 안 잡힌 순간은 시선 회피로 계산된다 — gaze.ts stepGaze) */
const FACE_LOST_NOTICE_MS = 2000;

/** 통화 연결 직후 내 화면을 작게 보여 주는 시간 — 실제 영상 통화처럼 "연결됐다"는 느낌만 주고 사라진다(경량 웹과 같은 2초) */
const PIP_MS = 2000;

const mmss = (sec: number) => `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(Math.floor(sec % 60)).padStart(2, '0')}`;

/**
 * 2단계 — 하루와 영상 통화하면서 실시간 표정·시선 분석(useLiveFaceSession)을 뒤에서 돌린다.
 * 화면은 경량 웹 Prep2/Talk2(영상 통화 대기실 → 통화)에서 가져왔고, 분석은 기존 실시간 촬영과 같다.
 *
 *   대기실(카메라 로딩 → 캘리브레이션 5초, 내 얼굴이 크게 보임) → "통화 시작하기"(= 촬영 시작)
 *   → 하루와 질문 4개(내 얼굴은 2초 뒤 사라지고 하루만 보임) → 마무리 인사가 끝나면 촬영 종료 → 결과.
 *
 * 시선 기준값(캘리브레이션)은 통화 중 하루가 보일 자리와 같은 자리에 내 얼굴을 띄워 두고 잰다 — 통화 중에는
 * 카메라가 아니라 화면 속 하루를 보게 되므로, 기준을 같은 자리에서 잡아야 "하루를 보는 것"이 정면으로 잡힌다.
 * 표정·시선은 통화 시작 후 최대 3분(MAX_CAPTURE_SEC)까지만 살펴보고, 그 뒤에도 대화는 이어서 할 수 있다.
 * <video>는 대기실과 통화에서 같은 요소를 계속 쓴다(다시 만들면 카메라 연결이 끊김) — 모양만 바꾼다.
 */
export function HaruCallView({ onComplete }: { onComplete: (result: GazeBlinkResult) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const navigate = useNavigate();
  const [result, setResult] = useState<GazeBlinkResult | null>(null);
  const [callOn, setCallOn] = useState(false);
  const [talkDone, setTalkDone] = useState(false);
  const [pip, setPip] = useState(false);
  // 하루가 새 질문을 시작한 시각들(촬영 시작부터 초) — 결과를 질문별로 나누는 데 쓴다
  const questionStartsRef = useRef<number[]>([]);
  // 하루와의 대화 단계 — 사용자가 대답하는 동안(listen)만 표정·시선을 잰다. 안내("말하는 동안에는 하루를 봐 주세요 ·
  // 그 밖에는 편하게 봐도 돼요")와 맞추려는 것: 하루가 질문하는 동안 자막·버튼을 보는 건 시선 회피가 아니다
  const talkPhaseRef = useRef<string>('ready');
  const [params] = useSearchParams();
  const debug = params.get('debug') === '1';
  const s = useLiveFaceSession({
    videoRef,
    onComplete: setResult,
    getQuestionStarts: () => questionStartsRef.current,
    isMeasuring: () => talkPhaseRef.current === 'listen',
    debug,
  });
  // 하루와의 주고받기 — 통화가 연결되면(callOn) 첫 질문을 읽기 시작한다
  const t = useHaruTalk(
    STAGE2_QUESTIONS,
    (answers) => {
      saveStageAnswers(2, answers);
      setTalkDone(true);
    },
    callOn,
  );
  talkPhaseRef.current = t.phase;
  const analysisEnded = s.saving || result !== null;

  // 통화 중 얼굴이 FACE_LOST_NOTICE_MS 넘게 안 잡히면 알림 — 다시 잡히면 바로 사라진다
  const [faceLost, setFaceLost] = useState(false);
  const watchingFace = callOn && !analysisEnded && !talkDone;
  useEffect(() => {
    if (!watchingFace || s.faceDetected) {
      setFaceLost(false);
      return;
    }
    const id = setTimeout(() => setFaceLost(true), FACE_LOST_NOTICE_MS);
    return () => clearTimeout(id);
  }, [watchingFace, s.faceDetected]);

  // 대화가 끝났으면 촬영도 끝낸다(이미 3분이 지나 끝났으면 아무 일도 안 함). 결과까지 나오면 결과 화면으로
  useEffect(() => {
    if (talkDone) void s.finish();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- s.finish는 매번 새 함수지만 한 번만 동작함
  }, [talkDone]);
  useEffect(() => {
    if (talkDone && result) onComplete(result);
  }, [talkDone, result, onComplete]);

  // 질문 번호가 바뀔 때마다(같은 질문을 다시 묻는 건 제외) 그 시각을 적는다.
  // 3분이 지나 촬영이 끝난 뒤의 질문은 표정·시선 기록이 없으니 적지 않는다(질문별 막대도 그 전 질문까지만)
  useEffect(() => {
    if (!callOn) return;
    const now = s.recordingNowSec();
    if (now !== null && questionStartsRef.current.length === t.index) questionStartsRef.current.push(now);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 질문 번호가 바뀔 때만 적는다
  }, [callOn, t.index]);

  const startCall = () => {
    s.beginRecording();
    setCallOn(true);
    setPip(true);
    setTimeout(() => setPip(false), PIP_MS);
  };

  const hangUp = () => {
    if (window.confirm('통화를 끝낼까요? 2단계는 다음에 처음부터 다시 해요.')) navigate('/dashboard');
  };

  const calibrationLooksGood = (s.calibrationSummary?.detectedRatio ?? 0) >= 0.5;

  return (
    <Paper p={20} radius="lg" withBorder style={{ background: 'var(--rb-surface)', borderColor: 'var(--rb-line)' }}>
      <Stack gap={14}>
        {!callOn && (
          <div style={{ textAlign: 'center' }}>
            <Text fz={18} fw={700}>
              하루와 영상 통화를 준비해요
            </Text>
            <Text fz={13} c="var(--rb-ink-soft)" mt={4}>
              통화가 시작되면 내 화면은 사라지고 이 자리에 하루가 보여요. 영상은 저장하지 않아요.
            </Text>
          </div>
        )}

        {/* 대기실: 내 얼굴이 크게 / 통화: 하루가 크게, 내 얼굴은 잠깐 작게 보였다가 사라짐 (같은 video 요소 유지) */}
        <Box style={{ position: 'relative', width: '100%', maxWidth: 560, margin: '0 auto', aspectRatio: '4 / 3' }}>
          {/* 하루 그림은 상태마다 바꿔 끼우고(말하기·듣기·생각), 말하는 중은 테두리 빛으로 보여 준다 */}
          <HaruAvatar
            phase={callOn ? t.phase : 'done'}
            glow={callOn && (t.phase === 'speak' || t.phase === 'listen')}
            style={{ position: 'absolute', inset: 0, opacity: callOn ? 1 : 0, transition: 'opacity .3s' }}
          >
            {callOn && (
              <>
                <TileTag top>● 연결됨 · {mmss(s.recordingElapsedSec)}</TileTag>
                <TileTag>하루{!t.bye && !talkDone && ` · 질문 ${t.index + 1} / ${t.total}`}</TileTag>
              </>
            )}
            {faceLost && (
              <div
                role="status"
                style={{
                  position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)',
                  background: 'rgba(21,24,28,.72)', color: '#fff', borderRadius: 12, padding: '10px 16px',
                  fontSize: 14, fontWeight: 600, textAlign: 'center', lineHeight: 1.5, maxWidth: '80%',
                }}
              >
                얼굴이 카메라에서 벗어났어요
                <br />
                <span style={{ fontWeight: 400, fontSize: 13 }}>카메라 쪽으로 살짝 와 주세요</span>
              </div>
            )}
          </HaruAvatar>
          <div
            style={
              callOn
                ? {
                    position: 'absolute', right: 12, top: 12, width: '26%', aspectRatio: '4 / 3', borderRadius: 10,
                    overflow: 'hidden', background: '#000', opacity: pip ? 1 : 0, transition: 'opacity .6s', pointerEvents: 'none',
                  }
                : { position: 'absolute', inset: 0, borderRadius: 16, overflow: 'hidden', background: '#000' }
            }
          >
            <video
              ref={videoRef}
              muted
              playsInline
              style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }}
            />
            {!callOn && <TileTag>나</TileTag>}
          </div>
        </Box>

        {!callOn && (
          <>
            <Group justify="center" gap={8}>
              <Text fz={13} fw={600} c="var(--rb-primary-strong)">
                {s.phase === 'loading' || s.phase === 'idle'
                  ? '카메라 켜는 중…'
                  : s.phase === 'calibrating'
                    ? `화면 가운데를 봐 주세요 (${s.elapsedSec.toFixed(1)}/${s.calibrationSec}초)`
                    : s.phase === 'ready'
                      ? '준비됐어요'
                      : ''}
              </Text>
              {(s.phase === 'calibrating' || s.phase === 'ready') && (
                <Text fz={13} c={s.faceDetected ? 'var(--rb-primary-strong)' : 'var(--rb-amber-strong)'}>
                  {s.faceDetected ? '· 얼굴이 잘 보여요' : '· 얼굴이 안 보여요'}
                </Text>
              )}
            </Group>

            {s.phase === 'ready' && !calibrationLooksGood && (
              <Alert color="red" variant="light" p="sm" fz={13}>
                얼굴이 잘 안 잡혔어요. 카메라 위치나 조명을 확인하고 시작하거나, 새로고침해서 다시 맞춰 보세요.
              </Alert>
            )}
            {s.phase === 'error' && (
              <Alert color="red" variant="light" p="xs" fz={13}>
                {s.errorMessage || '카메라를 시작할 수 없어요. 브라우저 권한을 확인해주세요.'}
              </Alert>
            )}

            <Text fz={13} c="var(--rb-ink-soft)" ta="center">
              👀 말하는 동안에는 하루를 봐 주세요 · 그 밖에는 편하게 봐도 돼요
            </Text>
            <Button fullWidth radius="md" disabled={s.phase !== 'ready'} onClick={startCall}>
              통화 시작하기
            </Button>
          </>
        )}

        {callOn && !talkDone && (
          <Stack gap={10}>
            {(t.phase === 'speak' || t.phase === 'ready') && (
              <Text fz={16} fw={600} ta="center" style={{ lineHeight: 1.6 }} aria-live="polite">
                {t.line}
              </Text>
            )}
            {t.phase === 'think' && (
              <Text fz={14} c="var(--rb-ink-faint)" ta="center">
                하루가 듣고 생각하고 있어요…
              </Text>
            )}
            {t.phase === 'listen' && (
              <>
                <Text fz={14} c="var(--rb-ink-soft)" ta="center">
                  듣고 있어요. 다 말했으면 아래 버튼을 눌러요.
                </Text>
                <Button fullWidth radius="md" onClick={() => void t.finish()}>
                  ✓ 답변 마치기
                </Button>
                <Group justify="center">
                  <button type="button" onClick={t.again} style={linkStyle}>
                    처음부터 다시 말할게요
                  </button>
                </Group>
              </>
            )}
            {(t.phase === 'speak' || t.phase === 'ready') && !t.bye && (
              <>
                <Button fullWidth radius="md" disabled={t.phase !== 'ready'} onClick={t.start}>
                  🎙 하루를 보며 대답하기
                </Button>
                <Group justify="center" gap={16}>
                  <button type="button" onClick={t.replay} disabled={t.phase !== 'ready'} style={linkStyle}>
                    다시 들려주세요
                  </button>
                  <button type="button" onClick={() => void t.finish(true)} disabled={t.phase !== 'ready'} style={linkStyle}>
                    이 질문 넘어가기
                  </button>
                </Group>
              </>
            )}
          </Stack>
        )}

        {callOn && talkDone && (
          <Stack gap={6} align="center" ta="center">
            <Text fz={17} fw={700}>
              2단계를 마쳤어요
            </Text>
            <Text fz={13} c="var(--rb-ink-soft)">
              하루 얼굴을 보며 질문 {STAGE2_QUESTIONS.length}개를 끝까지 마쳤어요. 결과를 정리하고 있어요…
            </Text>
          </Stack>
        )}

        {callOn && !talkDone && analysisEnded && (
          <Text fz={12} c="var(--rb-ink-faint)" ta="center">
            표정·시선은 통화 시작 후 {s.maxCaptureSec / 60}분까지 살펴봤어요. 대화는 이어서 해도 돼요.
          </Text>
        )}

        {debug && callOn && <FaceDebugPanel s={s} />}

        {callOn && !talkDone && (
          <Group justify="center">
            <button type="button" onClick={hangUp} style={{ ...linkStyle, color: 'var(--rb-amber-strong)' }}>
              통화 끝내기
            </button>
          </Group>
        )}
      </Stack>
    </Paper>
  );
}
