import type { CSSProperties, ReactNode } from 'react';
import { useMediaQuery } from '@/lib/useMediaQuery';
import { Reveal } from '@/components/Reveal';
import { HaruAvatar, TileTag } from '@/features/haru/HaruAvatar';
import { Pentagon } from '@/features/report/Pentagon';

/**
 * 메인 화면 "세 단계로, 나만의 속도로" 아래의 단계 소개 — 번호·제목·설명과 그 단계의 화면 모습을 좌우 번갈아 놓는다.
 * 경량 웹(판넬 OVERVIEW용) 메인 화면의 .step/.mock 구성을 옮긴 것(넘김본엔 CSS만 있어 화면 캡처를 보고 다시 만듦).
 * 오른쪽(또는 왼쪽) 그림은 실제로 동작하는 화면이 아니라 예시 그림이라 버튼은 눌리지 않고, 화면 낭독기에는 설명 한 줄로 읽힌다.
 * 글을 바꾸려면 아래 STEPS의 title/desc만 고치면 된다.
 */
const STEPS: { title: string; desc: string; mock: () => ReactNode; label: string }[] = [
  {
    title: '목소리로 가볍게 이야기해요',
    desc: '이력서나 자료는 필요 없어요. 이름, 요즘 관심사처럼 편한 이야기부터 말로 나눠요. 하루의 말은 채팅처럼 글로도 보여요.',
    mock: () => <ChatMock />,
    label: '하루와 채팅처럼 목소리로 대화하는 화면 예시',
  },
  {
    title: '화면 속 하루와 영상 통화해요',
    desc: '같은 하루가 이번엔 캐릭터로 나와요. 통화 중에는 내 얼굴을 띄우지 않고, 카메라로 시선과 표정만 살펴요.',
    mock: () => <CallMock />,
    label: '하루와 영상 통화하는 화면 예시',
  },
  {
    title: '실전처럼 면접을 연습해요',
    desc: '하루와 나눈 이야기를 바탕으로 면접관이 질문해요. 듣고 말로 대답하면 되고, 어려운 질문은 넘어가도 괜찮아요.',
    mock: () => <InterviewMock />,
    label: '면접관이 질문하는 화면 예시',
  },
  {
    title: '결과를 보고, 더 연습할 곳을 골라요',
    desc: '세 단계를 마치면 말하기 습관과 시선·표정을 한 번에 정리해 드려요. 그걸 보고 더 연습하고 싶은 단계를 골라 다시 해 볼 수 있어요.',
    mock: () => <ReportMock />,
    label: '말하기 습관과 시선·표정을 정리한 리포트 예시',
  },
];

export function JourneySteps() {
  const stacked = useMediaQuery('(max-width: 62em)');
  return (
    <div style={{ display: 'grid', gap: stacked ? 56 : 96, marginTop: 24 }}>
      {STEPS.map((s, i) => {
        const flip = !stacked && i % 2 === 1; // 2·4번째는 그림이 왼쪽
        return (
          <Reveal key={s.title}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: stacked ? '1fr' : '1fr 1.1fr',
                gap: stacked ? 28 : 72,
                alignItems: 'center',
              }}
            >
              <div style={{ order: flip ? 2 : 0, minWidth: 0 }}>
                <span
                  style={{
                    display: 'inline-grid',
                    placeItems: 'center',
                    width: 36,
                    height: 36,
                    borderRadius: '50%',
                    background: 'var(--rb-ink)',
                    color: 'var(--rb-surface)',
                    fontWeight: 800,
                    fontSize: 16,
                    marginBottom: 18,
                  }}
                >
                  {i + 1}
                </span>
                <h3 style={{ margin: 0, fontSize: stacked ? 26 : 34, lineHeight: 1.3, fontWeight: 800, letterSpacing: '-0.025em', textWrap: 'balance' }}>
                  {s.title}
                </h3>
                <p style={{ margin: '14px 0 0', fontSize: 17, lineHeight: 1.8, color: 'var(--rb-ink-soft)', maxWidth: '34ch' }}>{s.desc}</p>
              </div>
              <div role="img" aria-label={s.label} style={{ order: flip ? 1 : 0, minWidth: 0 }}>
                <div aria-hidden>{s.mock()}</div>
              </div>
            </div>
          </Reveal>
        );
      })}
    </div>
  );
}

/* ── 단계별 화면 그림 ─────────────────────────────────────────── */

const mockCard: CSSProperties = {
  background: 'var(--rb-surface)',
  border: '1px solid var(--rb-line)',
  borderRadius: 18,
  padding: 20,
  boxShadow: '0 12px 32px rgba(21,24,28,.08)',
};

function Bubble({ me, who, children }: { me?: boolean; who: string; children: ReactNode }) {
  return (
    <div
      style={{
        alignSelf: me ? 'flex-end' : 'flex-start',
        maxWidth: '80%',
        padding: '10px 14px',
        borderRadius: 14,
        fontSize: 14,
        lineHeight: 1.5,
        background: me ? 'var(--rb-primary-tint)' : 'var(--rb-bg)',
        color: 'var(--rb-ink)',
      }}
    >
      <small style={{ display: 'block', fontSize: 11, color: 'var(--rb-ink-faint)', marginBottom: 2 }}>{who}</small>
      {children}
    </div>
  );
}

function MicIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
    </svg>
  );
}

function ChatMock() {
  return (
    <div style={{ ...mockCard, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <Bubble who="하루">안녕하세요! 오늘은 편하게 이야기 나눠요. 뭐라고 불러 드리면 될까요?</Bubble>
      <Bubble me who="내 대답 (말로 했어요)">
        음… 지우라고 불러 주세요.
      </Bubble>
      <Bubble who="하루">지우 님, 반가워요. 요즘 관심 있는 건 뭐예요?</Bubble>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginTop: 8, fontSize: 13, color: 'var(--rb-ink-faint)' }}>
        <span style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--rb-primary)', display: 'grid', placeItems: 'center', flex: 'none' }}>
          <MicIcon />
        </span>
        말하는 중… 다 말했으면 "답변 마치기"를 눌러요
      </div>
    </div>
  );
}

function CallMock() {
  return (
    <div style={{ ...mockCard, padding: '20px 20px 18px' }}>
      <HaruAvatar phase="ready" glow={false}>
        <TileTag top>● 연결됨 · 01:12</TileTag>
        <TileTag>하루</TileTag>
      </HaruAvatar>
      <p style={{ textAlign: 'center', fontWeight: 700, fontSize: 16, margin: '14px 0 10px', color: 'var(--rb-ink)' }}>요즘 해 보고 싶은 일이 있어요?</p>
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8 }}>
        <span style={{ background: 'var(--rb-primary)', color: '#fff', fontWeight: 700, fontSize: 14, borderRadius: 999, padding: '10px 18px' }}>
          하루를 보며 대답하기
        </span>
        <i style={{ width: 40, height: 40, borderRadius: '50%', background: '#e5484d' }} />
      </div>
    </div>
  );
}

function InterviewMock() {
  return (
    <div style={mockCard}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--rb-ink-faint)', marginBottom: 10 }}>
        <span>
          <b style={{ color: 'var(--rb-ink)' }}>실전 면접</b> · 질문 2 / 5
        </span>
        <span>● 카메라 켜짐</span>
      </div>
      <div style={{ height: 4, background: 'var(--rb-bg)', borderRadius: 2, marginBottom: 12 }}>
        <i style={{ display: 'block', height: '100%', width: '40%', background: 'var(--rb-primary)', borderRadius: 2 }} />
      </div>
      <div
        style={{
          position: 'relative',
          aspectRatio: '16 / 10',
          borderRadius: 12,
          background: '#d9dfe5 url(/interviewer/idle.jpg) center / cover no-repeat',
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: 12,
            right: 12,
            bottom: 12,
            background: 'rgba(255,255,255,.92)',
            borderRadius: 8,
            padding: '8px 12px',
            fontSize: 13,
            color: '#15181c',
          }}
        >
          말씀하신 요리 이야기에서, 가장 기억에 남는 순간은 언제였나요?
        </div>
      </div>
    </div>
  );
}

function ReportMock() {
  const tabs = ['깜빡임', '시선', '표정'];
  return (
    <div style={mockCard}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
        <div style={{ border: '1px solid var(--rb-line)', borderRadius: 12, padding: 12 }}>
          <h4 style={{ fontSize: 13, margin: '0 0 6px' }}>말하기 습관</h4>
          <Pentagon v={[0.8, 0.62, 0.78, 0.74, 0.7]} size={190} labels={['안정성', '유창성', '침묵 조절', '지속성', '에너지']} />
        </div>
        <div style={{ border: '1px solid var(--rb-line)', borderRadius: 12, padding: 12 }}>
          <h4 style={{ fontSize: 13, margin: '0 0 8px' }}>시선과 표정</h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', background: 'var(--rb-bg)', borderRadius: 8, padding: 3, fontSize: 11, textAlign: 'center', color: 'var(--rb-ink-faint)' }}>
            {tabs.map((t) => (
              <span key={t} style={t === '시선' ? { background: 'var(--rb-surface)', borderRadius: 6, color: 'var(--rb-ink)', fontWeight: 700, padding: '3px 0' } : { padding: '3px 0' }}>
                {t}
              </span>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'flex-start', marginTop: 10, fontSize: 12, lineHeight: 1.5 }}>
            <b style={{ flex: 'none', background: 'var(--rb-primary-tint)', color: 'var(--rb-primary-strong)', fontSize: 11, padding: '1px 7px', borderRadius: 999 }}>길어졌어요</b>
            2단계보다 면접관을 더 오래 바라봤어요
          </div>
          {(
            [
              ['2단계', [15, 45, 75]],
              ['3단계', [25, 62]],
            ] as const
          ).map(([label, dots]) => (
            <div key={label} style={{ display: 'grid', gridTemplateColumns: '34px 1fr', gap: 6, alignItems: 'center', marginTop: 8, fontSize: 11, color: 'var(--rb-ink-faint)' }}>
              {label}
              <div style={{ position: 'relative', height: 9, borderRadius: 5, background: 'var(--rb-primary-tint)' }}>
                {dots.map((x) => (
                  <i key={x} style={{ position: 'absolute', top: 0, bottom: 0, left: `${x}%`, width: 6, borderRadius: 3, background: 'var(--rb-line-strong)' }} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
      <p style={{ fontSize: 13, lineHeight: 1.6, margin: '14px 0 12px', color: 'var(--rb-ink-soft)' }}>
        <b style={{ color: 'var(--rb-ink)' }}>코치 노트</b> · 실전 면접에서 긴 멈춤이 줄고 면접관을 더 오래 바라봤어요. (예시)
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {['1단계 다시 연습', '2단계 다시 연습', '3단계 다시 연습'].map((t, i) => (
          <span
            key={t}
            style={{
              border: `1.5px solid ${i === 0 ? 'var(--rb-primary)' : 'var(--rb-line)'}`,
              color: i === 0 ? 'var(--rb-primary-strong)' : 'var(--rb-ink-soft)',
              fontWeight: i === 0 ? 700 : 500,
              borderRadius: 999,
              padding: '7px 14px',
              fontSize: 13,
            }}
          >
            {t}
          </span>
        ))}
      </div>
    </div>
  );
}
