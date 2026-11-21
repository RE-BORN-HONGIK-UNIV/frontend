import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldIcon } from '@/components/ShieldIcon';
import { getAnxietyScore, type DifficultyTier, type StageKey } from '../difficulty';
import type { useMediaPreview } from '../useMediaPreview';
import { NeedStagesView } from './NeedStagesView';
import { auth } from '@/lib/auth';
import { speak, stopSpeak } from '@/features/haru/speech';
import { useLiveFaceSession, type ExpressionThresholds } from '@/features/face/live/useLiveFaceSession';
import { calibBeatAt } from '@/features/face/live/calibration';

/**
 * 개발할 때만(npm run dev) 주소에 ?test=1을 붙이면 1·2단계 기록이 없어도 3단계 화면을 볼 수 있다 —
 * 마이크를 못 쓰는 곳(도서관 등)에서 화면을 확인하려고. 난이도는 기본(standard)으로 둔다.
 * import.meta.env.DEV는 배포 빌드(npm run build)에서 false로 바뀌어 이 코드가 통째로 빠지므로,
 * 실제 사용자는 "두 단계 결과가 모두 있어야 난이도를 정한다"는 규칙(difficulty.ts)을 그대로 따른다.
 */
const devSkipStages = () => import.meta.env.DEV && new URLSearchParams(window.location.search).has('test');

/**
 * 3단계 면접 대기실 — 2026-11 "실전 면접" 재설계. 하루가 대기실까지 같이 와서 표정을 풀어 주고,
 * 오른쪽은 면접 보러 간 날 받는 접수증처럼 점검·질문·첫인사·마음 편히를 한 장에 모은다.
 *
 * 표정 맞추기: 2단계와 같은 7초(하루의 눈 보며 무표정 3초 → 찡그리기 2초 → 웃기 2초)로 찡그림·미소 기준을 이 사람에게 맞춘다.
 * 내 얼굴을 보며 표정을 짓기는 어색해서 하루를 보며 따라 하고, 내 카메라는 얼굴이 잡히는지 볼 만큼만 작게 띄운다.
 * 같은 날이어도 자리·조명이 바뀌면 기준이 달라져서 매번 맞추고, 2단계에서 바로 이어 왔을 때(carried)만 그 값을 그대로 쓴다.
 * 시선 기준은 면접관 자리에서 잡아야 해서 여기서 쓰지 않고, 면접실 첫인사 동안 따로 잰다(QuestionView).
 *
 * 난이도는 화면에 보이지 않게 1·2단계 결과로 자동으로 정한다(백엔드 GET /interview/anxiety의 tier).
 * 1·2단계 기록이 없으면 NeedStagesView로 먼저 하고 오게 안내한다.
 * 마이크가 연결돼야 시작할 수 있고, 카메라가 없으면 표정 맞추기 없이 계속할 수 있다.
 */
export function Stage3PrepView({
  media,
  carried = null,
  onStart,
}: {
  media: ReturnType<typeof useMediaPreview>;
  /** 2단계에서 바로 이어 왔을 때 넘겨받은 표정 기준 */
  carried?: ExpressionThresholds | null;
  onStart: (tier: DifficultyTier, expr: ExpressionThresholds | null) => void;
}) {
  const [tier, setTier] = useState<DifficultyTier | null>(null);
  const [needStages, setNeedStages] = useState<{ missing: StageKey[]; failed: boolean } | null>(null);

  const loadScore = useCallback(() => {
    setNeedStages(null);
    setTier(null);
    getAnxietyScore().then((result) => {
      if (result.status === 'missing') {
        if (devSkipStages()) return setTier('standard');
        return setNeedStages({ missing: result.missing, failed: result.failed });
      }
      setTier(result.tier);
    });
  }, []);

  useEffect(() => {
    loadScore();
  }, [loadScore]);

  if (needStages) {
    return <NeedStagesView missing={needStages.missing} failed={needStages.failed} onRetry={loadScore} />;
  }
  return <WaitingRoom media={media} tier={tier} carried={carried} onStart={onStart} />;
}

/** 대기실 화면 — 1·2단계 확인이 끝난 뒤에만 그려서, 안내 화면(NeedStagesView)에서는 카메라·하루 목소리가 켜지지 않게 */
function WaitingRoom({
  media,
  tier,
  carried,
  onStart,
}: {
  media: ReturnType<typeof useMediaPreview>;
  tier: DifficultyTier | null;
  carried: ExpressionThresholds | null;
  onStart: (tier: DifficultyTier, expr: ExpressionThresholds | null) => void;
}) {
  const navigate = useNavigate();
  // 표정 맞추기 — 화면에 보이는 작은 내 카메라를 그대로 분석에 쓴다(기록은 남기지 않음)
  const selfRef = useRef<HTMLVideoElement>(null);
  const face = useLiveFaceSession({
    videoRef: selfRef,
    onComplete: () => {},
    calibrateOnDemand: true,
    expressionCalibration: true,
    persist: false,
    calibPacing: PACING,
  });
  const [expr, setExpr] = useState<ExpressionThresholds | null>(carried);
  // 시작 전 안내(3단계를 미리 보여 주고 "시작"을 기다림) / 얼굴이 잘 안 잡혀서 다시 할 차례
  const [guide, setGuide] = useState(false);
  const [retry, setRetry] = useState(false);
  useEffect(() => {
    if (face.phase !== 'ready' || expr) return;
    // 2단계와 같은 기준 — 얼굴이 절반도 안 잡혔으면 기준값이 엉터리라 쓰지 않고 한 번 더
    if ((face.calibrationSummary?.detectedRatio ?? 0) >= 0.5) setExpr(face.getExpressionThresholds());
    else setRetry(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 맞추기가 끝난 순간 한 번
  }, [face.phase]);
  const calibrating = face.phase === 'calibrating';
  const noCamera = face.phase === 'error';
  const canCalibrate = (face.phase === 'camera' || face.phase === 'ready') && face.faceDetected;
  const beginCalibration = () => {
    setGuide(false);
    setRetry(false);
    face.startCalibration();
  };

  // 하루 목소리: 들어오자마자 한 번, 표정을 다 풀면 한 번
  const line = expr ? HARU_READY : retry ? HARU_RETRY : HARU_WAIT;
  useEffect(() => {
    // 다시 하자는 말은 미리 녹음한 목소리가 없어서 글로만
    if (tier && !retry) void speak(line);
  }, [line, tier, retry]);
  useEffect(() => stopSpeak, []);

  // 마이크: 권한을 받아 스트림이 연결됐는지만 본다
  const asking = media.status === 'idle' || media.status === 'requesting';
  const mic = asking ? null : !!media.stream?.getAudioTracks().length;
  const name = auth.name;
  // 표정 맞추기 단계마다: 보여 주기(하루 목소리) → 준비(회색 막대) → 재기(초록 테두리·막대) → 확인(✓). 초는 보여 주지 않는다
  const beat = calibrating ? calibBeatAt(face.calibrationElapsedSec, PACING) : null;
  const stepIdx = beat?.index ?? -1;
  const fill = !beat ? 0 : beat.part === 'lead' ? Math.max(0, (beat.at - SHOW_SEC) / (PACING.lead - SHOW_SEC)) : beat.part === 'measure' ? beat.at / beat.len : 1;
  useEffect(() => {
    if (stepIdx >= 0) void speak(CALIB_STEPS[stepIdx].say);
  }, [stepIdx]);
  const ready = !!mic && !!tier && (!!expr || noCamera);
  // 꺼진 "준비됐어요" 옆에 왜 꺼졌는지
  const hint = !mic ? '마이크를 허용하면 들어갈 수 있어요' : !expr && !noCamera ? '하루랑 표정을 먼저 풀어 주세요' : !tier ? '면접을 준비하고 있어요' : '';

  return (
    <div className="rb-wait">
      {/* 하루 말은 머리 위 빈 곳의 말풍선에 — 얼굴을 가리지 않게. 표정 맞추기 안내도 하루가 말해 주듯 여기서 보여 준다 */}
      <div className="rb-wait__left" data-measure={beat?.part === 'measure' || undefined}>
        <div className="rb-wait__say" aria-live="polite">
          <small>하루</small>
          {guide || beat ? (
            <>
              <p>{!beat ? '같이 표정을 풀어 봐요. 이렇게 할 거예요' : beat.part === 'tail' ? '좋아요!' : CALIB_STEPS[stepIdx].say}</p>
              <div className="rb-wait__steps">
                <ol>
                  {CALIB_STEPS.map((x, i) => (
                    <li key={x.key} data-on={(i === stepIdx && beat?.part !== 'tail') || undefined} data-done={i < stepIdx || (i === stepIdx && beat?.part === 'tail') || undefined}>
                      {x.label}
                    </li>
                  ))}
                </ol>
              </div>
              {beat && (
                <span className="rb-wait__bar" data-part={beat.part} role="progressbar" aria-label="이번 표정" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(fill * 100)}>
                  <i style={{ width: `${Math.min(100, fill * 100)}%` }} />
                </span>
              )}
            </>
          ) : (
            <p>{line}</p>
          )}
        </div>
        <div className="rb-wait__haru" role="img" aria-label="하루">
          {/* 하루 그림은 칸 높이에 맞춘 상자에 — 초록 점을 그림 안 눈 자리(위에서 34.5%)에 붙여서 칸 크기가 달라도 어긋나지 않게 */}
          <div className="rb-wait__haru-img">
            {beat?.stage === 'face' && <span className="rb-calib-dot" data-step="face" style={{ top: '34.5%' }} aria-hidden />}
          </div>
          {!expr && !calibrating && !noCamera && (
            <button type="button" className="rb-wait__go" disabled={!canCalibrate} onClick={guide || retry ? beginCalibration : () => setGuide(true)}>
              {!canCalibrate
                ? face.phase === 'idle' || face.phase === 'loading'
                  ? '카메라를 켜고 있어요…'
                  : '얼굴이 보이면 시작할 수 있어요'
                : guide
                  ? '시작'
                  : retry
                    ? '한 번 더 해 볼게요'
                    : '좋아요, 같이 풀어요'}
            </button>
          )}
        </div>
      </div>

      <section className="rb-prep3__notice rb-wait__ticket" aria-labelledby="rb-wait-title">
        <header>
          <h1 id="rb-wait-title">{name ? `${name} 님, ` : ''}곧 면접이에요</h1>
          <span className="rb-wait__stamp">
            <small>면접 대기실</small>
            접수 완료
          </span>
        </header>
        <dl>
          <div>
            <dt>준비</dt>
            <dd className="rb-wait__check">
              <video ref={selfRef} className="rb-wait__self" data-face={face.faceDetected || undefined} muted playsInline aria-hidden />
              <span className="rb-prep3__ready">
                <Status label="카메라" ok={noCamera ? false : face.faceDetected || null} okText="얼굴이 잘 보여요" failText="카메라 없이도 계속할 수 있어요" waitText="얼굴을 찾고 있어요" />
                <Status label="마이크" ok={mic} okText="잘 들려요" failText="브라우저에서 마이크를 허용해 주세요" />
                <Status
                  label="표정"
                  ok={expr ? true : noCamera ? false : null}
                  okText={carried ? '방금 2단계에서 맞춘 기준 그대로 써요' : '다 풀었어요'}
                  failText="카메라가 없어서 건너뛰어요"
                  waitText={calibrating ? '푸는 중이에요' : retry ? '얼굴이 잘 안 보였어요' : '하루랑 같이 풀어요'}
                />
              </span>
            </dd>
          </div>
          <div>
            <dt>질문</dt>
            {/* 질문 수는 난이도마다 달라서(interviewers.ts) 난이도가 드러나지 않게 같은 문장으로 */}
            <dd>질문은 5~6번, 대답을 듣고 이어서 묻기도 해요</dd>
          </div>
          <div>
            <dt>첫인사</dt>
            <dd>들어가면 면접관이 먼저 인사해요. 그동안 면접관을 바라봐 주세요</dd>
          </div>
        </dl>

        {/* 들어가기 직전 마지막으로 읽는 줄 — 표 안에 묻히지 않게 따로 */}
        <p className="rb-wait__calm">
          {/* 문장마다 한 줄씩(어중간한 곳에서 끊기지 않게). 버튼 이름은 면접실 아래 버튼과 같은 모양으로 — 들어가서 바로 알아보게 */}
          <span>
            질문을 못 들었으면 <span className="rb-wait__pill">다시 들려주세요</span> 버튼을 누르면 돼요.
          </span>
          <span>어려운 질문은 넘어가도 되고, 언제든 그만할 수 있어요.</span>
        </p>

        {/* 안내(동의 절차 아님): 면접 중 질문·답변 텍스트가 저장되고 AI로 전송된다는 점을 알린다(CLAUDE.md 컨벤션). 1단계처럼 한 줄 + 자세히 */}
        <details className="rb-wait__privacy">
          <summary>
            <ShieldIcon />
            영상·음성은 저장하지 않고, 답변 글만 기록해요
            <span>자세히</span>
          </summary>
          <p>
            면접 중 질문과 내 답변 텍스트는 내 계정에 저장되고, 꼬리질문과 코치 노트를 만들기 위해 AI(Anthropic)에 전송돼요.
            저장한 기록은 결과 화면에서 언제든 삭제할 수 있어요.
          </p>
        </details>

        <div className="rb-prep3__foot">
          <button type="button" className="rb-prep3__link" onClick={() => navigate('/dashboard')}>
            오늘은 여기까지 할게요
          </button>
          <span className="rb-wait__go-wrap">
            {!ready && hint && <span className="rb-wait__hint">{hint}</span>}
            <button type="button" className="rb-prep3__start" disabled={!ready} onClick={() => tier && onStart(tier, expr)}>
              준비됐어요
            </button>
          </span>
        </div>
      </section>
    </div>
  );
}

/** 표정 맞추기 3단계(calibration.ts의 face → frown → smile 순서) — 말풍선에 미리 보여 주고, 지금 단계를 칠한다. say는 미리 녹음한 하루 목소리와 같아야 함 */
const CALIB_STEPS = [
  { key: 'face', label: '제 눈 보기', say: '제 눈을 편하게 봐 주세요.' },
  { key: 'frown', label: '살짝 찡그리기', say: '미간을 살짝 찡그려 봐요.' },
  { key: 'smile', label: '같이 웃기', say: '이번엔 입꼬리를 올려 웃어 봐요.' },
] as const;
// 단계마다 앞 3초(하루 목소리 약 2초 + 준비 1초)와 뒤 0.6초(확인)는 값을 모으지 않는다 — 재는 시간(3·2·2초)은 2단계와 같다
const PACING = { lead: 3, tail: 0.6 };
const SHOW_SEC = 2;

const HARU_WAIT = '여기까지 같이 왔네요! 들어가기 전에 저랑 표정 한번 풀어 볼까요?';
const HARU_READY = '좋아요, 표정이 풀렸어요. 부르면 들어가면 돼요.';
const HARU_RETRY = '얼굴이 잘 안 보였어요. 화면 가운데에 얼굴이 오게 하고 한 번 더 해 볼까요?';

/** 점검 줄 하나: 점 + 이름 + 상태 */
function Status({ label, ok, okText, failText, waitText = '확인하고 있어요' }: { label: string; ok: boolean | null; okText: string; failText: string; waitText?: string }) {
  return (
    <span className="rb-prep3__status" data-state={ok ? 'ok' : ok === false ? 'fail' : 'wait'}>
      <i aria-hidden />
      <b>{label}</b> {ok ? okText : ok === false ? failText : waitText}
    </span>
  );
}
