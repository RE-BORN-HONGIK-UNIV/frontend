import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Button, Group, Stack, Text } from '@/components/ui';
import type { GazeBlinkResult } from '@/lib/api/types';
import { HaruAvatar, TileTag } from '@/features/haru/HaruAvatar';
import { STAGE2_QUESTIONS } from '@/features/haru/script';
import { saveStageAnswers } from '@/features/haru/store';
import { linkStyle } from '@/features/haru/styles';
import { useHaruTalk } from '@/features/haru/useHaruTalk';
import { useAnswerRecorder } from '@/features/haru/useAnswerRecorder';
import { api } from '@/lib/api/client';
import { saveStage2Voice } from '@/features/report/stageDetails';
import { useLiveFaceSession } from './useLiveFaceSession';
import { useDebugRecorder } from './useDebugRecorder';
import { useRingtone } from './useRingtone';

// 예전엔 통화 연결 직후 2초 동안 오른쪽에 내 화면을 작게 띄웠는데(경량 웹), 2026-11 사용자 요청으로 뺐다 —
// 통화 중에는 내 얼굴을 보이지 않는다(시선이 내 얼굴로 가지 않게).

const mmss = (sec: number) => `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(Math.floor(sec % 60)).padStart(2, '0')}`;

/**
 * 2026-11 경량 웹 대기실로 바꿈: 대기실(prep)은 하루·내 카메라 두 칸(연결 확인만), "통화 시작하기"를 누르면
 * 한 칸으로 합쳐 정중앙에 내 얼굴을 5초 띄워 캘리브레이션(calib)하고, 끝나면 같은 자리에 하루가 나온다(call).
 * 통화 중 하루가 정중앙에 크게 나오므로, 시선 기준을 그 자리에서 잡으려는 것 — 대기실 오른쪽 칸을 보며 재면
 * 통화 중 하루를 보는 게 옆을 보는 것으로 잡힌다. 통화 중에는 내 얼굴을 보이지 않는다(대기실에서만 보임).
 *
 * 2단계 — 하루와 영상 통화하면서 실시간 표정·시선 분석(useLiveFaceSession)을 뒤에서 돌린다.
 * 화면은 경량 웹 Prep2/Talk2(영상 통화 대기실 → 통화)에서 가져왔고, 분석은 기존 실시간 촬영과 같다.
 *
 *   대기실(카메라 로딩 → 캘리브레이션 5초, 내 얼굴이 크게 보임) → "통화 시작하기"(= 촬영 시작)
 *   → 하루와 질문 4개(하루만 보임) → 마무리 인사가 끝나면 촬영 종료 → 결과.
 *
 * 시선 기준값(캘리브레이션)은 통화 중 하루가 보일 자리와 같은 자리에 내 얼굴을 띄워 두고 잰다 — 통화 중에는
 * 카메라가 아니라 화면 속 하루를 보게 되므로, 기준을 같은 자리에서 잡아야 "하루를 보는 것"이 정면으로 잡힌다.
 * 표정·시선은 대답하는 동안(앞뒤 1초 제외)만 재고, 잰 시간이 3분(MAX_CAPTURE_SEC)이 되면 멈춘다 — 그 뒤에도 대화는 이어서 할 수 있다.
 * <video>는 대기실과 통화에서 같은 요소를 계속 쓴다(다시 만들면 카메라 연결이 끊김) — 모양만 바꾼다.
 */
export function HaruCallView({
  onComplete,
  onHungUp,
}: {
  onComplete: (result: GazeBlinkResult) => void;
  /** 대화를 다 마치고 빨간 버튼으로 통화를 끝냈을 때(결과 저장까지 끝난 뒤) — FaceStage가 "하루가 이렇게 이해했어요"로 넘긴다 */
  onHungUp: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const navigate = useNavigate();
  const [result, setResult] = useState<GazeBlinkResult | null>(null);
  // 대답한 구간이 없어서(전부 넘김 등) 표정·시선 결과를 만들지 않았는지
  const [empty, setEmpty] = useState(false);
  const [callOn, setCallOn] = useState(false);
  const [talkDone, setTalkDone] = useState(false);
  // 하루가 새 질문을 시작한 시각들(촬영 시작부터 초) — 결과를 질문별로 나누는 데 쓴다
  const questionStartsRef = useRef<number[]>([]);
  // 정확도 검증 기록 — 주소 뒤 ?debug=1일 때만(영상·장면 값을 통화를 끝낼 때 이 컴퓨터에 내려받음, useDebugRecorder 참고)
  const [debug] = useState(() => new URLSearchParams(window.location.search).has('debug'));
  const rec = useDebugRecorder(debug, videoRef);
  const s = useLiveFaceSession({
    videoRef,
    onDebugFrame: debug ? rec.onFrame : undefined,
    onComplete: setResult,
    getQuestionStarts: () => questionStartsRef.current,
    calibrateOnDemand: true,
    // 표정 맞추기: 하루의 눈 보기(무표정) 3초 → 찡그리기 2초 → 웃기 2초 — 표정 값 크기가 사람마다 달라서
    // 찡그림·미소 기준을 사람마다 맞춘다(calibration.ts personalThreshold)
    expressionCalibration: true,
    // 대답하는 동안(앞뒤 1초 제외)만 잰다 — 하루가 말할 때·버튼 누를 때 아래를 본 건 시선 회피로 세지 않는다
    measureOnlyWhenAnswering: true,
    onEmpty: () => setEmpty(true),
  });
  // "통화 시작하기"를 눌렀는지(→ 캘리브레이션 → 통화)
  const [started, setStarted] = useState(false);
  // 하루와의 주고받기 — 통화가 연결되면(callOn) 첫 질문을 읽기 시작한다
  const finishVoiceRef = useRef<ReturnType<typeof useAnswerRecorder>['finish'] | null>(null);
  const t = useHaruTalk(
    STAGE2_QUESTIONS,
    (answers) => {
      saveStageAnswers(2, answers);
      setTalkDone(true);
      // 2단계 통화 목소리도 1단계처럼 분석한다(stage=2) — 서버는 3단계 불안도에만 쓰고, 기기에는 리포트 흐름 막대용으로 남긴다.
      // 기다리지 않고 뒤에서 보내며, 실패해도 2단계는 그대로 끝난다(불안도는 1단계 목소리로 계산됨)
      void finishVoiceRef.current?.().then((r) => r && api.analyze(r.file, null, 2).then((res) => saveStage2Voice(res)).catch(() => {}));
    },
    callOn,
  );
  // 하루가 말하는 동안은 멈추고 사용자가 대답하는 구간만 녹음한다(1단계와 같은 녹음 설정)
  const voiceRec = useAnswerRecorder(callOn && t.phase === 'listen');
  finishVoiceRef.current = voiceRec.finish;
  const analysisEnded = s.saving || result !== null || empty;

  // 대답 중(듣는 중)일 때만 표정·시선을 잰다
  useEffect(() => {
    s.setAnswering(callOn && t.phase === 'listen');
    // eslint-disable-next-line react-hooks/exhaustive-deps -- s.setAnswering은 매번 새 함수지만 ref만 바꿈
  }, [callOn, t.phase]);

  // 대화가 끝났으면 촬영도 끝낸다(이미 3분이 지나 끝났으면 아무 일도 안 함). 결과까지 나오면 결과 화면으로
  useEffect(() => {
    if (talkDone) void s.finish();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- s.finish는 매번 새 함수지만 한 번만 동작함
  }, [talkDone]);
  // 결과가 나오면 바로 저장만 한다(FaceStage) — 화면은 그대로 두고, 사용자가 빨간 버튼으로 통화를 끝내야 "3단계 시작하기"가 나온다.
  // 예전엔 결과가 나오자마자 "2단계를 마쳤어요" 카드로 넘어가서, 끊지도 않았는데 통화가 혼자 끝난 것처럼 보였다.
  useEffect(() => {
    if (talkDone && result) onComplete(result);
  }, [talkDone, result, onComplete]);
  // debug: 결과가 나오면 요약 값(서버에 저장되는 세 값 등)도 내려받는다 — 3단계 불안도 기준값 맞추기용
  useEffect(() => {
    if (debug && result)
      rec.saveSummary({
        avgFixationSec: result.gaze.avg_fixation_sec,
        blinkRatePerMin: result.blink.rate_per_min,
        tensionRatio: result.expression.tension_ratio,
        smileRatio: result.expression.smile_ratio,
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 결과가 나온 순간 한 번
  }, [debug, result]);
  // 대화를 다 마친 뒤 빨간 버튼으로 통화를 끝냈는지
  const [hungUp, setHungUp] = useState(false);
  // 끊었고 결과 저장까지 끝났으면 다음 화면으로 — 결과가 나오기 전에 이 화면이 사라지면 2단계 기록이 저장되지 않아서 기다린다
  useEffect(() => {
    if (hungUp && (result || empty)) onHungUp();
  }, [hungUp, result, empty, onHungUp]);

  // 질문 번호가 바뀔 때마다(같은 질문을 다시 묻는 건 제외) 그 시각을 적는다.
  // 3분이 지나 촬영이 끝난 뒤의 질문은 표정·시선 기록이 없으니 적지 않는다(질문별 막대도 그 전 질문까지만)
  useEffect(() => {
    if (!callOn) return;
    const now = s.recordingNowSec();
    if (now !== null && questionStartsRef.current.length === t.index) questionStartsRef.current.push(now);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 질문 번호가 바뀔 때만 적는다
  }, [callOn, t.index]);

  const beginCall = () => {
    s.beginRecording();
    setCallOn(true);
  };

  // "통화 시작하기" → 하루에게서 영상 통화가 오는 화면(ring) → 초록 "응답" → 캘리브레이션 5초 → 통화
  const [ringing, setRinging] = useState(false);
  const startCall = () => {
    setStarted(true);
    setRinging(true);
  };
  // 응답: 흐릿했던 하루가 선명해지고, 5초 동안 "하루를 봐 주세요"로 시선 기준을 잰다 — 통화 중 하루가 나올 바로 그
  // 자리를 보게 되므로 기준이 가장 정확하다. 얼굴 위치는 대기실 오른쪽 칸에서 이미 확인해서 내 얼굴은 다시 안 띄운다
  const accept = () => {
    setRinging(false);
    setGuiding(true);
  };
  // 응답한 뒤 바로 재지 않고, 무엇을 볼지 먼저 안내한다 — 안내 글을 읽느라 '하루의 눈 보기' 3초를 놓치지 않게.
  // "준비됐어요"를 누르면 5초를 재는데, 그동안은 글 대신 초록 점(눈 → 어깨)만 따라 보면 된다
  const [guiding, setGuiding] = useState(false);
  const ready = () => {
    setGuiding(false);
    s.startCalibration();
  };
  // 거절: 대기실로
  const decline = () => {
    setRinging(false);
    setStarted(false);
  };

  // 캘리브레이션이 끝나면: 얼굴이 잘 잡혔으면 바로 통화 시작, 아니면 다시 맞출지 묻는다
  const calibrationLooksGood = (s.calibrationSummary?.detectedRatio ?? 0) >= 0.5;
  useEffect(() => {
    if (started && !callOn && s.phase === 'ready' && calibrationLooksGood) beginCall();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 캘리브레이션이 끝난 순간 한 번
  }, [started, callOn, s.phase, calibrationLooksGood]);

  // debug: 카메라가 켜지면 녹화 시작
  useEffect(() => {
    if (debug && s.phase === 'camera') rec.start();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 카메라가 켜진 순간 한 번
  }, [debug, s.phase]);

  const hangUp = async () => {
    // 하루가 마무리 인사까지 했으면 묻지 않고 끊는다 → "하루가 이렇게 이해했어요"
    if (talkDone) {
      if (debug) await rec.download();
      return setHungUp(true);
    }
    if (window.confirm('통화를 끝낼까요? 2단계는 다음에 처음부터 다시 해요.')) {
      if (debug) await rec.download();
      navigate('/dashboard');
    }
  };

  const mode = !started ? 'prep' : callOn ? 'call' : ringing ? 'ring' : 'calib';
  // 전화 오는 화면에서 부드러운 벨소리(응답·거절하면 멈춤)
  useRingtone(mode === 'ring');
  const cameraOn = s.phase !== 'idle' && s.phase !== 'loading' && s.phase !== 'error';
  const calibLeft = Math.max(0, s.calibrationSec - s.calibrationElapsedSec);

  // 통화 중 얼굴이 2초 넘게 안 잡히면 알림(내 얼굴은 안 보여 주므로 스스로 알 방법이 이것뿐 — 얼굴이 안 잡힌 순간은 시선 회피로 계산됨)
  const [faceLost, setFaceLost] = useState(false);
  const watchingFace = callOn && !analysisEnded && !talkDone;
  useEffect(() => {
    if (!watchingFace || s.faceDetected) {
      setFaceLost(false);
      return;
    }
    const id = setTimeout(() => setFaceLost(true), 2000);
    return () => clearTimeout(id);
  }, [watchingFace, s.faceDetected]);

  return (
    <Stack gap={35}>
      {debug && (
        <div className="rb-debugrec" role="status">
          <b>정확도 기록 중</b> · {rec.count}장면{rec.recording ? ' · 영상 녹화 중' : ''}
          <br />
          통화를 끝내면 영상·값 표·요약(-summary.csv)이 이 컴퓨터에 저장돼요(서버로 안 보냄).
          <button type="button" onClick={() => void rec.download()}>
            지금 내려받기
          </button>
        </div>
      )}
      {mode === 'prep' && (
        <div style={{ textAlign: 'center' }}>
          <h2 className="rb-call__title">
            하루와 <span style={{ color: 'var(--rb-primary)' }}>영상 통화</span>를 준비해요
          </h2>
          <Text fz={16} c="var(--rb-ink-soft)" mt={15}>
            통화가 시작되면 내 화면은 사라지고 하루만 보여요.
          </Text>
        </div>
      )}

      {/* 같은 <video>를 대기실·캘리브레이션·통화 내내 쓴다(다시 만들면 카메라 연결이 끊김) — data-mode로 배치만 바꾼다 */}
      <div className="rb-call" data-mode={mode}>
        <div className="rb-call__haru">
          <HaruAvatar
            phase={callOn ? t.phase : 'done'}
            glow={callOn && (t.phase === 'speak' || t.phase === 'listen')}
            style={{ position: 'absolute', inset: 0, aspectRatio: 'auto', borderRadius: 'inherit' }}
          >
            {mode === 'prep' && (
              <>
                <TileTag top>
                  <span className="rb-call__dot" /> 기다리는 중
                </TileTag>
                <TileTag>하루</TileTag>
              </>
            )}
            {mode === 'call' && <HaruTalkVideo playing={t.phase === 'speak' && !hungUp} />}
            {mode === 'call' && (
              <>
                <TileTag top>
                  {hungUp ? (
                    '통화 종료'
                  ) : (
                    <>
                      <span className="rb-call__dot" /> 통화중 · {mmss(s.recordingElapsedSec)}
                    </>
                  )}
                </TileTag>
                {!t.bye && !talkDone && <span className="rb-call__qtag">질문 {t.index + 1} / {t.total}</span>}
                <TileTag>하루</TileTag>
              </>
            )}
            {mode === 'calib' && guiding && (
              <div className="rb-call__guide" role="dialog" aria-label="연결 전 안내">
                <b>연결 전에 7초만 표정을 풀어 볼게요</b>
                <ol>
                  <li>
                    <i aria-hidden /> <em>하루의 눈</em>(초록 점)을 보며 편하게 무표정
                  </li>
                  <li>
                    <i aria-hidden /> <em>찡그려 보세요</em>가 나오면 미간을 살짝 모아요
                  </li>
                  <li>
                    <i aria-hidden /> <em>웃어 보세요</em>가 나오면 하루에게 웃어 줘요
                  </li>
                </ol>
                <span>표정이 얼마나 잘 보이는지는 사람마다 달라서, 나에게 맞추는 거예요</span>
                <button type="button" onClick={ready}>
                  준비됐어요
                </button>
              </div>
            )}
            {mode === 'calib' && s.phase === 'calibrating' && (
              // 하루 그림(높이 94%·아래 가운데)에서 눈은 그림 위에서 34% → 칸 기준 6 + 94 × 0.34 ≈ 38%. 7초 내내 여기를 본다
              <span className="rb-calib-dot" data-step={s.calibrationStep ?? 'face'} style={{ top: '38%' }} aria-hidden />
            )}
            {mode === 'calib' && !guiding && (
              <div className="rb-call__calib" aria-live="polite">
                {s.phase === 'calibrating' && (
                  <>
                    <b>
                      {s.calibrationStep === 'frown'
                        ? '찡그려 보세요 — 미간을 살짝 모아요'
                        : s.calibrationStep === 'smile'
                          ? '웃어 보세요 — 하루에게 미소를'
                          : '하루의 눈(초록 점)을 보며 무표정'}
                    </b>
                    <span>{Math.ceil(calibLeft)}초 뒤에 하루가 말을 걸어요</span>
                    <i style={{ width: `${Math.min(100, (s.calibrationElapsedSec / s.calibrationSec) * 100)}%` }} />
                  </>
                )}
                {s.phase === 'ready' && !calibrationLooksGood && (
                  <>
                    <b>얼굴이 잘 안 잡혔어요</b>
                    <span>카메라 위치나 조명을 확인해 주세요</span>
                  </>
                )}
              </div>
            )}
            {faceLost && (
              <div role="status" className="rb-call__notice">
                얼굴이 카메라에서 벗어났어요
                <br />
                <span style={{ fontWeight: 400, fontSize: 13 }}>카메라 쪽으로 살짝 와 주세요</span>
              </div>
            )}
          </HaruAvatar>
          {mode === 'ring' && (
            <div className="rb-ring" role="dialog" aria-label="하루에게서 영상 통화가 왔어요">
              <div className="rb-ring__who">
                <span className="rb-ring__sub">영상 통화</span>
                <strong className="rb-ring__name">하루</strong>
                <span className="rb-ring__shapes" aria-hidden>
                  <i />
                  <i />
                  <i />
                </span>
              </div>
              <div className="rb-ring__actions">
                <button type="button" className="rb-ring__btn" data-kind="decline" onClick={decline} aria-label="거절">
                  <PhoneIcon down />
                </button>
                <button type="button" className="rb-ring__btn" data-kind="accept" onClick={accept} aria-label="응답" autoFocus>
                  <PhoneIcon />
                </button>
              </div>
              <div className="rb-ring__labels" aria-hidden>
                <span>거절</span>
                <span>응답</span>
              </div>
            </div>
          )}
        </div>

        <div className="rb-call__me">
          <video ref={videoRef} muted playsInline style={{ opacity: cameraOn ? 1 : 0 }} />
          {mode === 'prep' && (
            <>
              <TileTag top>
                <span className="rb-call__dot" data-off={!cameraOn || !s.faceDetected || undefined} />{' '}
                {s.phase === 'error'
                  ? '카메라를 켤 수 없어요'
                  : !cameraOn
                    ? '카메라 켜는 중…'
                    : s.faceDetected
                      ? '얼굴이 잘 보여요'
                      : '얼굴이 안 보여요'}
              </TileTag>
              {!cameraOn && (
                <span className="rb-call__center">
                  {s.phase === 'error' ? s.errorMessage || '브라우저에서 카메라 권한을 확인해 주세요' : '카메라를 켜고 있어요'}
                </span>
              )}
              <TileTag>나</TileTag>
            </>
          )}
        </div>
      </div>

      {mode === 'prep' && (
        <Stack gap={14} align="center">
          <div style={{ textAlign: 'center' }}>
            <Text fz={16} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
              <EyeIcon />
              <b>말하는 동안에는 하루를 응시해주세요</b>
            </Text>
            <Text fz={14} c="var(--rb-ink-soft)" mt={4}>
              그 밖에는 편하게 봐도 돼요
            </Text>
          </div>
          {/* 휴대폰 영상 통화처럼 동그란 초록 전화 버튼 — 통화 화면의 빨간 끊기 버튼과 짝 */}
          <button type="button" className="rb-call__dial" disabled={s.phase !== 'camera'} onClick={startCall}>
            <span className="rb-call__dial-btn" aria-hidden>
              <PhoneIcon />
            </span>
            <span className="rb-call__dial-label">{s.phase === 'camera' ? '하루와 통화하기' : '카메라를 켜고 있어요…'}</span>
          </button>
          <button type="button" onClick={() => navigate('/dashboard')} style={linkStyle}>
            오늘은 여기까지 할게요
          </button>
        </Stack>
      )}

      {mode === 'calib' && s.phase === 'ready' && !calibrationLooksGood && (
        <Group justify="center" gap={12}>
          <Button radius="md" onClick={() => s.startCalibration()}>
            다시 맞추기
          </Button>
          <Button radius="md" variant="default" onClick={beginCall}>
            그대로 시작하기
          </Button>
        </Group>
      )}

      {mode === 'call' && !talkDone && (
        <Stack gap={12} align="center">
          {(t.phase === 'speak' || t.phase === 'ready') && (
            <Text fz={18} fw={600} ta="center" style={{ lineHeight: 1.6 }} aria-live="polite">
              {t.line}
            </Text>
          )}
          {t.phase === 'think' && (
            <Text fz={14} c="var(--rb-ink-faint)" ta="center">
              하루가 듣고 생각하고 있어요…
            </Text>
          )}
          {t.phase === 'listen' && (
            <Text fz={14} c="var(--rb-ink-soft)" ta="center">
              듣고 있어요. 다 말했으면 아래 버튼을 눌러요.
            </Text>
          )}
          {/* 통화 조작 — 대답 버튼과 빨간 전화 끊기 버튼을 한 줄로(경량 웹·휴대폰 영상 통화처럼) */}
          <div className="rb-call__controls">
            {t.phase === 'listen' ? (
              <button type="button" className="rb-call__action" data-kind="finish" onClick={() => void t.finish()}>
                ✓ 답변 마치기
              </button>
            ) : (
              !t.bye && (
                <button type="button" className="rb-call__action" disabled={t.phase !== 'ready'} onClick={t.start}>
                  🎙 하루를 보며 대답하기
                </button>
              )
            )}
            <button type="button" className="rb-call__hangup" onClick={hangUp} aria-label="통화 끝내기" title="통화 끝내기">
              <PhoneIcon down />
            </button>
          </div>
          {t.phase === 'listen' && (
            <button type="button" onClick={t.again} style={linkStyle}>
              처음부터 다시 말할게요
            </button>
          )}
          {(t.phase === 'speak' || t.phase === 'ready') && !t.bye && (
            <Group justify="center" gap={16}>
              <button type="button" onClick={t.replay} disabled={t.phase !== 'ready'} style={linkStyle}>
                다시 들려주세요
              </button>
              <button type="button" onClick={() => void t.finish(true)} disabled={t.phase !== 'ready'} style={linkStyle}>
                이 질문 넘어가기
              </button>
            </Group>
          )}
        </Stack>
      )}

      {mode === 'call' && talkDone && (
        <Stack gap={12} align="center" ta="center">
          <Text fz={18} fw={600} style={{ lineHeight: 1.6 }} aria-live="polite">
            {hungUp ? '통화를 마쳤어요' : '하루와 이야기를 마쳤어요'}
          </Text>
          <Text fz={14} c="var(--rb-ink-soft)">
            {hungUp ? '나눈 이야기를 정리하고 있어요…' : '빨간 버튼을 눌러 통화를 끝내 주세요.'}
          </Text>
          <div className="rb-call__controls">
            <button
              type="button"
              className="rb-call__hangup"
              onClick={hangUp}
              disabled={hungUp}
              aria-label={hungUp ? '통화가 끝났어요' : '통화 끝내기'}
              title={hungUp ? '통화가 끝났어요' : '통화 끝내기'}
            >
              <PhoneIcon down />
            </button>
          </div>
        </Stack>
      )}

      {mode === 'call' && !talkDone && analysisEnded && (
        <Text fz={12} c="var(--rb-ink-faint)" ta="center">
          표정·시선은 대답한 시간으로 {s.maxCaptureSec / 60}분까지 살펴봤어요. 대화는 이어서 해도 돼요.
        </Text>
      )}

      {mode === 'prep' && s.phase === 'error' && (
        <Alert color="red" variant="light" p="xs" fz={13}>
          {s.errorMessage || '카메라를 시작할 수 없어요. 브라우저 권한을 확인해주세요.'}
        </Alert>
      )}
    </Stack>
  );
}

/**
 * 2단계 통화에서 하루가 말할(질문할) 때만 나오는 말하는 영상 — 그 밖에는 정지 그림(HaruAvatar).
 * haru-talk-call.mp4는 정지 그림(haru.jpg)을 시작 장면으로 AI가 만든 3:4 말하는 영상을, 정지 그림과 머리 위치·크기가
 * 같도록 맞춰 720×960으로 다시 만든 것(소리 제거, 3.5초 반복 — 끝 1/3초는 처음 장면으로 서서히 이어 반복 이음매를 없앰).
 * AI 영상은 장면마다 배경색이 조금씩 출렁여서 프레임마다 배경을 통화 칸 배경색(#e3defc 근처)으로 맞췄다.
 * 그림 칸과 똑같이 높이 94%·아래 가운데에 놓으면(.rb-call__haru의 background-size/position과 같음) 그림과 영상이 바뀔 때
 * 하루 자리가 안 튄다. 브라우저마다 영상 색을 조금씩 다르게 그리므로 가장자리는 배경으로 서서히 녹여 네모 경계가 안 보이게 했다.
 * 늘 붙여 두고 보일 때만 재생한다 — 질문마다 새로 불러오면 처음 몇 프레임이 비어 깜빡인다.
 * 움직임 줄이기 설정이면 영상 없이 정지 그림만 쓴다.
 */
function HaruTalkVideo({ playing }: { playing: boolean }) {
  const ref = useRef<HTMLVideoElement>(null);
  const reduceMotion = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    if (playing) void v.play().catch(() => {});
    else v.pause();
  }, [playing]);
  if (reduceMotion) return null;
  return (
    <video
      ref={ref}
      className="rb-call__talk"
      src="/haru/haru-talk-call.mp4"
      muted
      loop
      playsInline
      preload="auto"
      aria-hidden
      style={{ opacity: playing ? 1 : 0 }}
    />
  );
}

function PhoneIcon({ down = false }: { down?: boolean }) {
  return (
    <svg width="30" height="30" viewBox="0 0 24 24" fill="currentColor" aria-hidden style={down ? { transform: 'rotate(135deg)' } : undefined}>
      <path d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.25 11.4 11.4 0 0 0 3.6.57 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.46.57 3.6a1 1 0 0 1-.25 1z" />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="var(--rb-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}
