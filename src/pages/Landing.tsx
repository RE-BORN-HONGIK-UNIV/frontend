import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Box, Group, SimpleGrid, Stack } from '@/components/ui';
import { useMediaQuery } from '@/lib/useMediaQuery';
import { RebornWordmark } from '@/components/RebornWordmark';
import { Reveal } from '@/components/Reveal';
import { SectionBadge } from '@/components/SectionBadge';
import { SiteNavLinks } from '@/components/SiteNavLinks';
import { HaruAvatar, TileTag } from '@/features/haru/HaruAvatar';
import { Pentagon } from '@/features/report/Pentagon';
import { JourneySteps} from '@/features/landing/JourneySteps';

const MAXW = 1120;

const card: React.CSSProperties = {
  background: 'var(--rb-surface)',
  borderRadius: 16,
  padding: 26,
  boxShadow: '0 1px 2px rgba(35,40,38,0.04), 0 14px 30px -18px rgba(35,40,38,0.2)',
};

const panel: React.CSSProperties = {
  maxWidth: MAXW,
  margin: '0 auto',
  background: 'rgba(255,255,255,0.62)',
  backdropFilter: 'blur(6px)',
  WebkitBackdropFilter: 'blur(6px)',
  border: '1px solid var(--rb-line)',
  borderRadius: 24,
  padding: 44,
};

/* ── sections ─────────────────────────────────────────────── */

function Nav() {
  return (
    <Box
      component="header"
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr auto',
        alignItems: 'center',
        padding: '20px 30px',
        borderBottom: '1px solid var(--rb-line)',
        background: 'var(--rb-surface)',
        position: 'relative',
        zIndex: 5,
      }}
    >
      {/* 좌우를 1fr 1fr로 맞춰서, 우측에 로그인 상태 표시 등 다른 요소가
       * 생기거나 없어져도 가운데 링크 그룹이 항상 정중앙에 오게 함 —
       * justify-content: space-between이었을 땐 우측 요소가 없어지자마자
       * 링크 그룹이 오른쪽 끝으로 쏠려버렸음. */}
      <RebornWordmark size={36} animate={false} />
      <SiteNavLinks />
    </Box>
  );
}

/**
 * 히어로 오른쪽의 앱 화면 미리보기 — 경량 웹(판넬 OVERVIEW용) 메인 화면의 .shot/.float 모양을 다시 만든 것.
 * 넘김본엔 이 부분의 CSS(styles.css .home .shot, .float.me, .float.rs)만 있고 JSX가 없어서, CSS와 화면 캡처를 보고
 * 같은 구성으로 옮겼다: 브라우저 창 안의 하루 영상 통화 + 왼쪽 아래 "내 대답" + 오른쪽 위 "결과 미리보기"(오각형).
 * 실제로 동작하는 화면이 아니라 그림이라 버튼은 누를 수 없다. 좁은 화면에서는 떠 있는 두 카드를 숨긴다(경량 웹과 같음).
 */
function HeroPreview({ compact }: { compact: boolean }) {
  const float: React.CSSProperties = {
    position: 'absolute',
    background: 'var(--rb-surface)',
    borderRadius: 14,
    boxShadow: '0 14px 30px rgba(21,24,28,.14)',
    padding: '12px 14px',
    fontSize: 13,
    zIndex: 1,
  };
  return (
    <div
      role="img"
      aria-label="앱 화면 예시: 하루와 영상 통화하며 대답하고, 결과를 오각형으로 미리 보는 모습"
      style={{ position: 'relative', width: '100%', maxWidth: 560, margin: '0 auto' }}
    >
      <div
        aria-hidden
        style={{
          position: 'relative',
          borderRadius: 18,
          background: 'var(--rb-surface-tint)',
          border: '1px solid var(--rb-line)',
          boxShadow: '0 30px 60px rgba(21,24,28,.12)',
          padding: compact ? '32px 18px 18px' : '40px 34px 24px',
        }}
      >
        <div style={{ position: 'absolute', top: 14, left: 16, display: 'flex', gap: 6 }}>
          {[0, 1, 2].map((i) => (
            <i key={i} style={{ width: 9, height: 9, borderRadius: '50%', background: 'var(--rb-line-strong)' }} />
          ))}
        </div>
        <HaruAvatar phase="ready" glow={false} style={{ boxShadow: '0 0 0 4px #cfc4f3' }}>
          <TileTag top>● 연결됨 · 01:12</TileTag>
          <TileTag>하루</TileTag>
        </HaruAvatar>
        <p style={{ textAlign: 'center', fontWeight: 700, fontSize: 17, margin: '16px 0 12px', color: 'var(--rb-ink)' }}>
          요즘 해 보고 싶은 일이 있어요?
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8 }}>
          <span
            style={{
              background: 'var(--rb-primary)',
              color: '#fff',
              fontWeight: 700,
              fontSize: 14,
              borderRadius: 999,
              padding: '10px 18px',
            }}
          >
            하루를 보며 대답하기
          </span>
          <i style={{ width: 40, height: 40, borderRadius: '50%', background: '#e5484d' }} />
        </div>
      </div>

      {!compact && (
        <>
          <div aria-hidden style={{ ...float, left: -40, bottom: 64, display: 'flex', gap: 10, alignItems: 'center' }}>
            <span
              style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                background: 'var(--rb-primary)',
                display: 'grid',
                placeItems: 'center',
              }}
            >
              <svg width="18" height="16" viewBox="0 0 18 16" fill="#fff">
                {[2, 6, 10, 14].map((x, i) => (
                  <rect key={x} x={x - 1} y={[5, 2, 4, 6][i]} width="2.4" height={[6, 12, 8, 4][i]} rx="1.2" />
                ))}
              </svg>
            </span>
            <div style={{ lineHeight: 1.5 }}>
              <b style={{ display: 'block', color: 'var(--rb-ink)' }}>내 대답</b>
              <span style={{ color: '#767b74' }}>말로 대답해요</span>
            </div>
          </div>
          <div aria-hidden style={{ ...float, right: -40, top: 28, width: 220 }}>
            <h5 style={{ fontSize: 12, color: 'var(--rb-ink-faint)', margin: '0 0 2px', fontWeight: 600 }}>결과 미리보기</h5>
            <Pentagon v={[0.8, 0.62, 0.7, 0.78, 0.74]} size={190} labels={['안정성', '유창성', '침묵 조절', '지속성', '에너지']} />
          </div>
        </>
      )}
    </div>
  );
}

function Hero() {
  const isMobile = useMediaQuery('(max-width: 48em)');
  // 좁은 화면(태블릿 이하)에선 왼쪽 글·오른쪽 미리보기를 위아래로 쌓는다
  const stacked = useMediaQuery('(max-width: 62em)');
  return (
    <Box
      component="section"
      style={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '120px 30px 92px',
        minHeight: 720,
      }}
    >
      <Box style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
        <Box
          style={{
            position: 'absolute',
            left: '50%',
            top: '-12%',
            transform: 'translateX(-50%)',
            width: 960,
            height: 540,
            background:
              'radial-gradient(ellipse at center, rgba(76,138,100,0.12), rgba(76,138,100,0) 70%)',
          }}
        />
        <Box
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage:
              'linear-gradient(var(--rb-line) 1px, transparent 1px), linear-gradient(90deg, var(--rb-line) 1px, transparent 1px)',
            backgroundSize: '64px 64px',
            opacity: 0.5,
            WebkitMaskImage:
              'radial-gradient(ellipse at 50% 28%, #000 26%, transparent 72%)',
            maskImage: 'radial-gradient(ellipse at 50% 28%, #000 26%, transparent 72%)',
          }}
        />
      </Box>

      {/* 왼쪽: 로고·소개·시작 버튼(왼쪽 정렬) / 오른쪽: 앱 화면 미리보기 — 경량 웹 메인 화면 배치를 따름 */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: 'none',
          paddingLeft: 64,
          paddingRight: 64,
          boxSizing: 'border-box',
          display: 'grid',
          gridTemplateColumns: stacked ? '1fr' : '1fr 1.1fr',
          gap: stacked ? 56 : 40,
          alignItems: 'center',
        }}
      >
        <Stack align="flex-start" gap={26} style={{ position: 'relative', minWidth: 0 }}>
        <RebornWordmark size={isMobile ? 60 : 96} />
        <Box fz={isMobile ? 17 : 20} c="var(--rb-ink-soft)" fw={500}>
          천천히 한 걸음씩, 함께 걸어요.
        </Box>
        <Box style={{ width: 100, height: 3, borderRadius: 2, background: 'var(--rb-primary)' }} />
        <Box
          style={{
            background: 'rgba(255,255,255,0.72)',
            backdropFilter: 'blur(6px)',
            WebkitBackdropFilter: 'blur(100px)',
            border: '1px solid var(--rb-line)',
            borderRadius: 19,
            padding: '25px 30px',
            maxWidth: 620,
          }}
        >
          <p style={{ margin: 0, fontSize: 16, lineHeight: 1.5, color: 'var(--rb-ink)' }}>
            하고 싶은 말이 마음에 머무는 순간을, 판단 없는 공간에서 천천히 연습합니다. 하루와의 대화부터 실전 면접까지, 사람 앞에 선 나로{' '}
            <strong style={{ color: 'var(--rb-primary-strong)', fontWeight: 700 }}>다시 태어나도록</strong> 함께 나아갑니다.
          </p>
        </Box>
        <Group gap={10} mt={2}>
          <Link to="/dashboard" className="rb-start-cta">
  <span className="rb-start-cta__box">무료로 시작하기</span>
</Link>
        </Group>
        </Stack>

        <HeroPreview compact={stacked} />
      </div>
    </Box>
  );
}

function Steps() {
  return (
    <Box
      component="section"
      id="steps"
      style={{
        padding: '96px 24px',
        background: '#f5f5f4',
        borderTop: '1px solid var(--rb-line)',
        borderBottom: '1px solid var(--rb-line)',
      }}
    >
      <Stack style={panel} gap={20}>
        <Reveal>
          <Stack align="center" gap={16} ta="center">
            <SectionBadge>STEP</SectionBadge>
            <h2 style={{ margin: 0, fontSize: 39, fontWeight: 700, letterSpacing: '-0.02em' }}>
              세 단계, 나만의 속도로
            </h2>
            <p style={{ margin: 0, fontSize: 17, lineHeight: 1.8, color: 'var(--rb-ink-soft)', maxWidth: 520 }}>
              하루에 다 하지 않아도 괜찮아요. 준비되는 만큼, 다음 단계로.
            </p>
          </Stack>
        </Reveal>

        <JourneySteps />
      </Stack>
    </Box>
  );
}
  
// 이 플랫폼이 누구를 위한 곳인지 먼저 알려주는 섹션. 진단·평가로 들리는 표현("~증상", "~장애")은
// 피하고, 사용자가 "나도 해당되네" 하고 편하게 느낄 수 있는 상황 묘사만 쓴다.
// 강조(bold)할 부분은 [본문, 강조] 쌍으로 나눠서 적는다.
const AUDIENCE: [string, string, string][] = [
  ['사람 앞에 서면 ', '하고 싶은 말이 맴도는', ' 사람'],
  ['말하다가 ', '머릿속이 하얘져서', ' 멈춘 적이 있는 사람'],
  ['밖에 나가기가 부담돼서 ', '집에서 혼자', ' 시작해보고 싶은 사람'],
  ['내 목소리와 표정이 어떤지 ', '부담 없이', ' 확인해보고 싶은 사람'],
  ['면접이나 발표 전에 ', '실전처럼 연습', '이 필요한 사람'],
  ['한 번에 다 해야 한다는 압박 대신 ', '한 단계씩', ' 연습하고 싶은 사람'],
];

function Audience() {
  return (
    <Box component="section" style={{ padding: '96px 24px', background: 'var(--rb-bg)' }}>
      <Stack style={{ maxWidth: MAXW, margin: '0 auto' }} gap={40}>
        <Reveal>
          <Stack align="center" gap={10} ta="center">
            <SectionBadge>WHO</SectionBadge>
            <h2 style={{ margin: 0, fontSize: 34, fontWeight: 700, letterSpacing: '-0.02em', wordBreak: 'keep-all' }}>
              이런 분들을 환영해요
            </h2>
            <p style={{ margin: 0, fontSize: 15, lineHeight: 1.8, color: 'var(--rb-ink-soft)', maxWidth: 520, wordBreak: 'keep-all' }}>
              사람을 대면해 말하는 것이 부담스러웠던 분, 집 밖으로 나서기 막막했던 분을 환영해요.
            </p>
          </Stack>
        </Reveal>

        <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing={30}>
          {AUDIENCE.map(([before, em, after], i) => (
            <Reveal key={em} delay={i * 70}>
              <Box
                className="rb-card-hover rb-audience-card"
                style={{
                  ...card,
                  height: '100%',
                  boxSizing: 'border-box',
                  padding: '28px 30px',
                  fontSize: 17,
                  lineHeight: 1.0,
                  color: 'var(--rb-ink)',
                  wordBreak: 'keep-all',
                  textAlign: 'center',
                  border: '1px solid var(--rb-line)',
                }}
              >
                {before}
                <strong style={{ color: 'var(--rb-primary-strong)', fontWeight: 800 }}>{em}</strong>
                {after}
              </Box>
            </Reveal>
          ))}
        </SimpleGrid>
      </Stack>
    </Box>
  );
}

function FinalCta() {
  return (
    <Box
      component="section"
      id="start"
      style={{
        padding: '96px 24px',
        textAlign: 'center',
        background: 'var(--rb-surface-tint)',
      }}
    >
      <Reveal>
        <Stack align="center" gap={16} style={{ maxWidth: 520, margin: '0 auto' }}>
          <h2
            style={{
              margin: 0,
              fontFamily: 'var(--rb-font-display)',
              fontWeight: 600,
              fontSize: 32,
              letterSpacing: '-0.01em',
            }}
          >
            지금, 첫 걸음을 시작해보세요.
            </h2>
            <p style={{margin:0, fontSize: 15, lineHeight:1.8, color:'var(--rb-ink-soft)'}}>
              로그인 없이 바로 1단계 음성 진단을 시작할 수 있어요. 단계를 나눠서 훈련할 수 있어요.
            </p>
        </Stack>
      </Reveal>
    </Box>
  );
}

function IconLink({ label, children }: { label: string; children: ReactNode }) {
  return (
    <a
      href="#"
      aria-label={label}
      style={{
        width: 38,
        height: 38,
        border: '1px solid var(--rb-line-strong)',
        borderRadius: 10,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--rb-ink-soft)',
      }}
    >
      {children}
    </a>
  );
}

function Footer() {
  return (
    <Box
      component="footer"
      id="contact"
      style={{ background: 'var(--rb-surface)', borderTop: '1px solid var(--rb-line)', padding: '56px 24px 36px' }}
    >
      <Group justify="space-between" align="flex-start" wrap="wrap" gap={56} style={{ maxWidth: MAXW, margin: '0 auto' }}>
        <Stack gap={20} style={{ maxWidth: 520 }}>
          <RebornWordmark size={20} animate={false} />
          <p style={{ margin: 0, fontSize: 14, lineHeight: 1.85, color: 'var(--rb-ink-soft)' }}>
            고립·은둔 청년이 다시 사람 앞에 설 수 있도록, 발화 불안을 안전한 공간에서 단계별로 연습하는 AI 재활
            트레이닝입니다.
          </p>
          <Group gap={10}>
            <IconLink label="Instagram">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="5" />
                <circle cx="12" cy="12" r="4" />
                <circle cx="17" cy="7" r="1" fill="currentColor" stroke="none" />
              </svg>
            </IconLink>
            <IconLink label="Email">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round">
                <rect x="3" y="5" width="18" height="14" rx="2" />
                <path d="M4 7l8 6 8-6" />
              </svg>
            </IconLink>
            <IconLink label="GitHub">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 19c-4 1.5-4-2-6-2.5M15 22v-3.9c0-1.1.1-1.5-.6-2.2 3-.3 5.6-1.5 5.6-6a4.6 4.6 0 0 0-1.3-3.2 4.3 4.3 0 0 0-.1-3.2s-1-.3-3.4 1.3a11.6 11.6 0 0 0-6.2 0C6.2 2.5 5.2 2.8 5.2 2.8a4.3 4.3 0 0 0-.1 3.2A4.6 4.6 0 0 0 3.8 9.2c0 4.4 2.6 5.6 5.6 6-.5.5-.6 1-.6 1.8V22" />
              </svg>
            </IconLink>
          </Group>
        </Stack>

        <Stack gap={16}>
          <span style={{ fontSize: 15, fontWeight: 700 }}>Contact</span>
          <Group gap={11} style={{ fontSize: 14, color: 'var(--rb-ink-soft)' }}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="var(--rb-ink-faint)" strokeWidth="2" strokeLinejoin="round">
              <rect x="3" y="5" width="18" height="14" rx="2" />
              <path d="M4 7l8 6 8-6" />
            </svg>
            [문의 이메일]
          </Group>
          <Group gap={11} style={{ fontSize: 14, color: 'var(--rb-ink-soft)' }}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="var(--rb-ink-faint)" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="5" />
              <circle cx="12" cy="12" r="4" />
              <circle cx="17" cy="7" r="1" fill="var(--rb-ink-faint)" stroke="none" />
            </svg>
            [@인스타그램]
          </Group>
        </Stack>
      </Group>

      <Box
        style={{
          maxWidth: MAXW,
          margin: '36px auto 0',
          paddingTop: 20,
          borderTop: '1px solid var(--rb-line)',
          fontSize: 12,
          color: 'var(--rb-ink-faint)',
        }}
      >
        홍익대학교 · RE-BORN · © 2026
      </Box>
    </Box>
  );
}

export default function Landing() {
  return (
    <Box style={{ background: 'var(--rb-bg)' }}>
      <Nav />
      <Hero />
      <Audience />
      <Steps />
      <FinalCta />
      <Footer />
    </Box>
  );
}
