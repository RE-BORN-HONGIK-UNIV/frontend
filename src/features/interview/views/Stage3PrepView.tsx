import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Text } from '@/components/ui';
import { getAnxietyScore, type DifficultyTier, type StageKey } from '../difficulty';
import { getInterviewer, MAIN_QUESTION_COUNT } from '../interviewers';
import type { useMediaPreview } from '../useMediaPreview';
import { NeedStagesView } from './NeedStagesView';

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
  const followGuide =
    interviewer && interviewer.followUps > 0 ? '대답에 따라 한두 번 더 물어볼 수 있어요.' : '하나씩 천천히 물어볼게요.';

  // 마이크·카메라: 권한을 받아 스트림이 연결됐는지만 본다
  const asking = media.status === 'idle' || media.status === 'requesting';
  const mic = asking ? null : !!media.stream?.getAudioTracks().length;
  const cam = asking ? null : !!media.stream?.getVideoTracks().length;

  return (
    <div className="rb-prep3">
      {/* 위: 제목·설명(왼쪽) + 오늘 함께할 면접관 사진 미리 보기(오른쪽) — 면접실에서 갑자기 낯선 얼굴을 마주하지 않게 */}
      <div className="rb-prep3__head">
        <div>
          <h1 className="rb-prep3__title">
            이제 <em>실전 면접</em>이에요
          </h1>
          <p className="rb-prep3__lead">하루와 나눈 이야기로 만든 질문이라 낯설지 않을 거예요.</p>
        </div>
        <figure className="rb-prep3__who">
          <div className="rb-prep3__photo" role="img" aria-label="오늘 함께할 면접관" />
          <figcaption>오늘 함께할 면접관을 소개합니다</figcaption>
        </figure>
      </div>

      {/* 안내 세 가지 */}
      <ul className="rb-prep3__guide">
        {[
          { icon: <EarIcon />, title: '듣고 말로 대답해요', desc: '질문은 글로 나오지 않아요. 못 들었으면 "다시 들려주세요"를 눌러요.' },
          { icon: <QuestionIcon />, title: `기본 질문 ${MAIN_QUESTION_COUNT}개예요`, desc: followGuide},
          { icon: <SkipIcon />, title: '넘어가도 괜찮아요', desc: '어려운 질문은 넘어가도 되고, 언제든 그만할 수 있어요.' },
        ].map((g) => (
          <li key={g.title} className="rb-prep3__card">
            <span className="rb-prep3__ic">{g.icon}</span>
            <b>{g.title}</b>
            <p>{g.desc}</p>
          </li>
        ))}
      </ul>

      <div className="rb-prep3__checks">
        <Check icon={<MicIcon />} title="마이크" ok={mic} okText="잘 들려요">
          {mic === false ? '브라우저에서 마이크를 허용해 주세요' : '오늘 연습 잘 부탁드려요'}
        </Check>
        <Check icon={<CamIcon />} title="카메라" ok={cam} okText="잘 보여요">
          {cam === false ? '카메라 없이도 계속할 수 있어요' : '얼굴이 화면 가운데 와요'}
        </Check>
      </div>
      {/* 안내(동의 절차 아님): 면접 중 질문·답변 텍스트가 저장되고 AI로 전송된다는 점을 알린다(CLAUDE.md 컨벤션) */}
      <Text fz={12} c="var(--rb-ink-faint)" style={{ lineHeight: 1.7 }}>
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

function Check({ icon, title, ok, okText, children }: { icon: ReactNode; title: string; ok: boolean | null; okText: string; children: ReactNode }) {
  return (
    <div className="rb-prep3__check">
      <span className="rb-prep3__ic">{icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <b>{title}</b>
        <p>{children}</p>
      </div>
      <span className="rb-prep3__ok" data-wait={!ok || undefined}>
        <i />
        {ok ? okText : ok === false ? '허용이 필요해요' : '확인하고 있어요'}
      </span>
    </div>
  );
}

function EarIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M4 14v-2a8 8 0 0 1 16 0v2" />
      <rect x="3" y="14" width="4" height="6" rx="1.5" />
      <rect x="17" y="14" width="4" height="6" rx="1.5" />
    </svg>
  );
}

function QuestionIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.4A8 8 0 1 1 21 12z" />
      <path d="M9 11h6M9 14h4" />
    </svg>
  );
}

function SkipIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M5 5l8 7-8 7z" />
      <path d="M17 5v14" />
    </svg>
  );
}

function MicIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
    </svg>
  );
}

function CamIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3" y="6" width="13" height="12" rx="2" />
      <path d="m16 10 5-3v10l-5-3" />
    </svg>
  );
}
