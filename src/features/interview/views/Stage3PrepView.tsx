import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Text } from '@/components/ui';
import { getAnxietyScore, type DifficultyTier, type StageKey } from '../difficulty';
import { getInterviewer, MAIN_QUESTION_COUNT } from '../interviewers';
import type { useMediaPreview } from '../useMediaPreview';
import { NeedStagesView } from './NeedStagesView';
import { getSpeechAudioUrl } from '../api';
import { auth } from '@/lib/auth';

/**
 * 개발할 때만(npm run dev) 주소에 ?test=1을 붙이면 1·2단계 기록이 없어도 3단계 화면을 볼 수 있다 —
 * 마이크를 못 쓰는 곳(도서관 등)에서 화면을 확인하려고. 난이도는 기본(standard)으로 둔다.
 * import.meta.env.DEV는 배포 빌드(npm run build)에서 false로 바뀌어 이 코드가 통째로 빠지므로,
 * 실제 사용자는 "두 단계 결과가 모두 있어야 난이도를 정한다"는 규칙(difficulty.ts)을 그대로 따른다.
 */
const devSkipStages = () => import.meta.env.DEV && new URLSearchParams(window.location.search).has('test');

/**
 * 3단계 시작 화면 — 경량 웹 Prep3("이제 실전 면접이에요" + 마이크·카메라 확인)을 가져옴.
 *
 * 2026-11 팀 결정(가): 예전 면접관 고르기 화면(IntroView)은 없애고, 난이도는 화면에 보이지 않게
 * 1·2단계 결과로 자동으로 정한다(백엔드 GET /interview/anxiety의 tier, 없으면 예전 getTier — 질문 난이도·꼬리질문 수가 여기서 정해짐).
 * 경량 웹은 판넬용 고정 질문이라 난이도가 없었을 뿐, 질문 수준 조절은 남기기로 함.
 * 1·2단계 기록이 없으면 예전처럼 NeedStagesView로 먼저 하고 오게 안내한다.
 *
 * 예전 기기 점검(MediaTestView)의 장치 고르기·문장 읽기 확인도 경량 웹처럼 권한 확인만 남겼다 —
 * 마이크가 연결돼야 시작할 수 있고, 카메라는 없어도 계속할 수 있다.
 *
 * 2026-11 화면 정리(E+B): 제목·사진·카드 3개·확인 줄 2개·안내 문단이 한 화면에 흩어져 읽기 어려웠고, 사진 크게 + 안내 줄이는
 * 방식은 2단계 영상 통화 대기실과 비슷해졌다. 2단계는 '친구와 영상 통화', 3단계는 '면접 보러 가기'로 느낌을 나눈다 —
 *   B. 면접관이 먼저 인사: 사진 옆 말풍선 + 면접관 목소리(TTS, 한 번 자동, '다시 듣기')
 *   E. 실제 면접 전에 받는 안내문처럼 '오늘의 면접 안내' 한 장에 질문·대답 방식·마음 편히·준비(마이크·카메라)를 줄로 모음
 * 면접관 이름은 난이도를 드러내서 쓰지 않는다(난이도는 화면에 보이지 않게).
 */
export function Stage3PrepView({
  media,
  onStart,
}: {
  media: ReturnType<typeof useMediaPreview>;
  onStart: (tier: DifficultyTier) => void;
}) {
  const navigate = useNavigate();
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

  const interviewer = tier ? getInterviewer(tier) : null;
  const followGuide = interviewer && interviewer.followUps > 0 ? '대답에 따라 한두 번 더 물어볼 수 있어요' : '하나씩 천천히 물어볼게요';

  // 마이크·카메라: 권한을 받아 스트림이 연결됐는지만 본다
  const asking = media.status === 'idle' || media.status === 'requesting';
  const mic = asking ? null : !!media.stream?.getAudioTracks().length;
  const cam = asking ? null : !!media.stream?.getVideoTracks().length;

  return (
    <div className="rb-prep3">
      {/* B. 면접관이 먼저 인사 — 면접실에서 갑자기 낯선 얼굴·목소리를 마주하지 않게 */}
      <Greeting tier={tier} />

      {/* E. 오늘의 면접 안내 — 안내문 한 장 */}
      <section className="rb-prep3__notice" aria-labelledby="rb-prep3-notice-title">
        <header>
          <h1 id="rb-prep3-notice-title">
            오늘의 <em>면접 안내</em>
          </h1>
          <span className="rb-prep3__tag">실전 면접</span>
        </header>
        <dl>
          <div>
            <dt>질문</dt>
            <dd>
              기본 질문 {MAIN_QUESTION_COUNT}개 · {followGuide}
            </dd>
          </div>
          <div>
            <dt>대답</dt>
            <dd>듣고 말로 대답해요. 못 들었으면 &ldquo;다시 들려주세요&rdquo;</dd>
          </div>
          <div>
            <dt>마음 편히</dt>
            <dd>어려운 질문은 넘어가도 되고, 언제든 그만할 수 있어요</dd>
          </div>
          <div>
            <dt>준비</dt>
            <dd className="rb-prep3__ready">
              <Status label="마이크" ok={mic} okText="잘 들려요" failText="브라우저에서 마이크를 허용해 주세요" />
              <Status label="카메라" ok={cam} okText="잘 보여요" failText="카메라 없이도 계속할 수 있어요" />
            </dd>
          </div>
        </dl>
      </section>

      {/* 안내(동의 절차 아님): 면접 중 질문·답변 텍스트가 저장되고 AI로 전송된다는 점을 알린다(CLAUDE.md 컨벤션) */}
      <Text fz={12} c="var(--rb-ink-faint)" style={{ lineHeight: 1.7 }} mt={18}>
        면접 중 질문과 내 답변 텍스트는 내 계정에 저장되고, 꼬리질문과 코치 노트를 만들기 위해 AI(Anthropic)에 전송돼요.
        영상과 음성은 저장하지 않아요. 저장한 기록은 결과 화면에서 언제든 삭제할 수 있어요.
      </Text>

      <div className="rb-prep3__foot">
        <button type="button" className="rb-prep3__link" onClick={() => navigate('/dashboard')}>
          오늘은 여기까지 할게요
        </button>
        <button type="button" className="rb-prep3__start" disabled={!mic || !tier} onClick={() => tier && onStart(tier)}>
          {tier ? '입장하기' : '면접을 준비하고 있어요…'}
        </button>
      </div>
    </div>
  );
}

/** 면접관 사진 + 말풍선 인사. 난이도가 정해지면 그 면접관 목소리로 한 번 읽어 주고, '다시 듣기'로 또 들을 수 있다.
 * 브라우저가 자동 재생을 막으면(사용자가 아직 아무것도 누르지 않은 경우) 조용히 넘어가고 버튼으로 듣는다. */
function Greeting({ tier }: { tier: DifficultyTier | null }) {
  const name = auth.name;
  const line = `안녕하세요${name ? `, ${name} 님` : ''}. 오늘 함께 이야기 나눌 면접관이에요. 편하게 대답해 주세요.`;
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const urlRef = useRef<string | null>(null);
  const [speaking, setSpeaking] = useState(false);

  const play = useCallback(async () => {
    if (!tier) return;
    try {
      if (!urlRef.current) urlRef.current = await getSpeechAudioUrl(line, tier);
      if (!urlRef.current) return;
      audioRef.current?.pause();
      const audio = new Audio(urlRef.current);
      audioRef.current = audio;
      audio.onended = () => setSpeaking(false);
      setSpeaking(true);
      await audio.play();
    } catch {
      setSpeaking(false);
    }
  }, [line, tier]);

  // 난이도가 정해지면 한 번 자동으로 인사
  useEffect(() => {
    void play();
  }, [play]);

  useEffect(
    () => () => {
      audioRef.current?.pause();
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    },
    [],
  );

  return (
    <div className="rb-prep3__greet">
      <div className="rb-prep3__photo" role="img" aria-label="오늘 함께할 면접관" data-speaking={speaking || undefined} />
      <div className="rb-prep3__bubble">
        <small>오늘의 면접관</small>
        <p>{line}</p>
        <button type="button" className="rb-prep3__replay" onClick={() => void play()} disabled={!tier}>
          🔊 {speaking ? '말하는 중…' : '다시 듣기'}
        </button>
      </div>
    </div>
  );
}

/** 준비 줄 — 마이크·카메라 하나씩: 점 + 이름 + 상태 */
function Status({ label, ok, okText, failText }: { label: string; ok: boolean | null; okText: string; failText: string }) {
  return (
    <span className="rb-prep3__status" data-state={ok ? 'ok' : ok === false ? 'fail' : 'wait'}>
      <i aria-hidden />
      <b>{label}</b> {ok ? okText : ok === false ? failText : '확인하고 있어요'}
    </span>
  );
}
