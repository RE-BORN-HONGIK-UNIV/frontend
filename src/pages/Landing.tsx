import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Anchor, Box, Button, Group, SimpleGrid, Stack } from '@/components/ui';
import { useMediaQuery } from '@/lib/useMediaQuery';
import { RebornWordmark } from '@/components/RebornWordmark';
import { Reveal } from '@/components/Reveal';
import { SectionBadge } from '@/components/SectionBadge';
import { SiteNavLinks } from '@/components/SiteNavLinks';
import { HaruAvatar, TileTag } from '@/features/haru/HaruAvatar';
import { Pentagon } from '@/features/report/Pentagon';

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

function StepIcon({ kind }: { kind: 'voice' | 'gaze' | 'chat' }) {
  const stroke = kind === 'gaze' ? 'var(--rb-primary-deep)' : 'var(--rb-primary-strong)';
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {kind === 'voice' && <path d="M4 10v4M8 6v12M12 3v18M16 7v10M20 10v4" />}
      {kind === 'gaze' && (
        <>
          <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
          <circle cx="12" cy="12" r="3" />
        </>
      )}
      {kind === 'chat' && <path d="M4 5h16v11H9l-4 4z" />}
    </svg>
  );
}

function WhyIcon({ kind }: { kind: 'pace' | 'heart' | 'chart' }) {
  const stroke = kind === 'heart' ? 'var(--rb-primary-deep)' : 'var(--rb-primary-strong)';
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {kind === 'pace' && (
        <>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 2" />
        </>
      )}
      {kind === 'heart' && (
        <path d="M12 20s-7-4.4-9.3-8.5C1 8 3 4.5 6.5 4.5c2 0 3.5 1.2 4.5 2.5 1-1.3 2.5-2.5 4.5-2.5C19 4.5 21 8 19.3 11.5 17 15.6 12 20 12 20z" />
      )}
      {kind === 'chart' && <polygon points="12,3 21,9.8 17.5,20.5 6.5,20.5 3,9.8" />}
    </svg>
  );
}

function IconTile({ children, deep = false }: { children: ReactNode; deep?: boolean }) {
  return (
    <Box
      style={{
        width: 44,
        height: 44,
        borderRadius: 12,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: deep ? 'var(--rb-primary-deep-tint)' : 'var(--rb-primary-tint)',
      }}
    >
      {children}
    </Box>
  );
}

/* ── sections ─────────────────────────────────────────────── */

function Nav() {
  return (
    <Box
      component="header"
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr auto 1fr',
        alignItems: 'center',
        padding: '20px 40px',
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
      <Box />
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
            <div style={{ lineHeight: 1.4 }}>
              <b style={{ display: 'block', color: 'var(--rb-ink)' }}>내 대답</b>
              <span style={{ color: 'var(--rb-ink-faint)' }}>말로 대답해요</span>
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
        padding: '120px 24px 92px',
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
          maxWidth: MAXW,
          display: 'grid',
          gridTemplateColumns: stacked ? '1fr' : '1fr 1.1fr',
          gap: stacked ? 56 : 40,
          alignItems: 'center',
        }}
      >
        <Stack align="flex-start" gap={26} style={{ position: 'relative', minWidth: 0 }}>
        <RebornWordmark size={isMobile ? 60 : 96} />
        <Box fz={isMobile ? 17 : 20} c="var(--rb-ink-soft)" fw={500}>
          다시, 나의 목소리로.
        </Box>
        <Box style={{ width: 64, height: 3, borderRadius: 2, background: 'var(--rb-primary)' }} />
        <Box
          style={{
            background: 'rgba(255,255,255,0.72)',
            backdropFilter: 'blur(6px)',
            WebkitBackdropFilter: 'blur(6px)',
            border: '1px solid var(--rb-line)',
            borderRadius: 24,
            padding: '24px 30px',
            maxWidth: 620,
          }}
        >
          <p style={{ margin: 0, fontSize: 15, lineHeight: 1.95, color: 'var(--rb-ink)' }}>
            발화 불안으로 목소리 내기 어려운 순간을, 판단 없는 공간에서 천천히 연습합니다. 음성·표정·대화를 AI가
            분석해{' '}
            <strong style={{ color: 'var(--rb-primary-strong)', fontWeight: 700 }}>세 단계</strong>로, 다시
            사람 앞에 설 수 있도록 함께 나아갑니다.
          </p>
        </Box>
        <Group gap={18} mt={4}>
          <Button component={Link} to="/signup" color="brand" radius="xl" size="md" styles={{ root: { fontWeight: 700 } }}>
            무료로 시작하기
          </Button>
          {/* 로그인 없이 시작 — 대시보드는 PrivateRoute가 게스트로 바로 열어 준다 */}
          <Anchor component={Link} to="/dashboard" c="var(--rb-primary-strong)" fz={14} fw={600} underline="never">
            로그인 없이 시작하기
          </Anchor>
          <Anchor href="#steps" c="var(--rb-ink-soft)" fz={14} fw={500} underline="never">
            3단계 과정 보기 →
          </Anchor>
        </Group>
        </Stack>

        <HeroPreview compact={stacked} />
      </div>

      <Box mt={60} style={{ position: 'relative' }}>
        <svg width="26" height="40" viewBox="0 0 26 40" fill="none" aria-hidden="true">
          <rect x="1.5" y="1.5" width="23" height="37" rx="11.5" stroke="var(--rb-ink-faint)" strokeWidth="1.5" />
          <circle cx="13" cy="11" r="3" fill="var(--rb-ink-faint)" />
        </svg>
      </Box>
    </Box>
  );
}

const STEPS = [
  {
    tag: 'STEP 1',
    deep: false,
    icon: 'voice' as const,
    title: '음성 정밀 진단',
    desc: '30초 발화를 올리면 떨림·유창성·침묵 조절 등 5가지 지표를 오각형 그래프로 진단합니다.',
    soon: false,
  },
  {
    tag: 'STEP 2',
    deep: true,
    icon: 'gaze' as const,
    title: '표정·시선 분석',
    desc: '표정과 시선 처리를 분석해 비언어적 소통 습관을 함께 살펴봅니다.',
    soon: true,
  },
  {
    tag: 'STEP 3',
    deep: false,
    icon: 'chat' as const,
    title: '실전 모의 면접',
    desc: '앞 단계 결과에 맞춘 난이도로 AI와 모의 면접을 진행하고 대화 흐름을 되짚어봅니다.',
    soon: true,
  },
];

function Steps() {
  return (
    <Box
      component="section"
      id="steps"
      style={{
        padding: '96px 24px',
        background: 'var(--rb-surface-tint)',
        borderTop: '1px solid var(--rb-line)',
        borderBottom: '1px solid var(--rb-line)',
      }}
    >
      <Stack style={panel} gap={32}>
        <Reveal>
          <Stack align="center" gap={16} ta="center">
            <SectionBadge>여정</SectionBadge>
            <h2 style={{ margin: 0, fontSize: 34, fontWeight: 700, letterSpacing: '-0.02em' }}>
              세 단계로, 나만의 속도로
            </h2>
            <p style={{ margin: 0, fontSize: 15, lineHeight: 1.8, color: 'var(--rb-ink-soft)', maxWidth: 520 }}>
              한 번에 다 하지 않아도 괜찮아요. 준비되는 만큼, 다음 단계로.
            </p>
          </Stack>
        </Reveal>

        <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing={20}>
          {STEPS.map((s, i) => (
            <Reveal key={s.tag} delay={i * 90}>
              <Stack gap={14} style={card} className="rb-card-hover">
                <Group justify="space-between">
                  <span
                    style={{
                      padding: '4px 11px',
                      borderRadius: 999,
                      fontSize: 12,
                      fontWeight: 700,
                      letterSpacing: '0.04em',
                      background: s.deep ? 'var(--rb-primary-deep-tint)' : 'var(--rb-primary-tint)',
                      color: s.deep ? 'var(--rb-primary-deep)' : 'var(--rb-primary-strong)',
                    }}
                  >
                    {s.tag}
                  </span>
                  {s.soon && (
                    <span
                      style={{
                        padding: '4px 10px',
                        borderRadius: 999,
                        fontSize: 11,
                        fontWeight: 600,
                        background: 'var(--rb-bg)',
                        color: 'var(--rb-ink-faint)',
                        border: '1px solid var(--rb-line)',
                      }}
                    >
                      준비 중
                    </span>
                  )}
                </Group>
                <IconTile deep={s.deep}>
                  <StepIcon kind={s.icon} />
                </IconTile>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>{s.title}</h3>
                <p style={{ margin: 0, fontSize: 14, lineHeight: 1.8, color: 'var(--rb-ink-soft)' }}>
                  {s.desc}
                </p>
              </Stack>
            </Reveal>
          ))}
        </SimpleGrid>
      </Stack>
    </Box>
  );
}

const WHY = [
  {
    icon: 'pace' as const,
    deep: false,
    title: '나의 속도로',
    desc: '정답도 제한 시간도 없어요. 오늘은 한 문장만 말해도 충분합니다.',
  },
  {
    icon: 'heart' as const,
    deep: true,
    title: '판단하지 않는 피드백',
    desc: '잘잘못을 따지는 대신, 다음에 함께 연습할 것만 부드럽게 짚어줍니다.',
  },
  {
    icon: 'chart' as const,
    deep: false,
    title: '작은 변화를 기록',
    desc: '매번의 발화가 오각형 그래프로 쌓여, 나아지는 모습이 눈에 보입니다.',
  },
];

function Why() {
  return (
    <Box component="section" id="why" style={{ padding: '96px 24px', background: 'var(--rb-bg)' }}>
      <Stack style={panel} gap={36}>
        <Reveal>
          <Stack align="center" gap={16} ta="center">
            <SectionBadge>왜 Re-born</SectionBadge>
            <h2 style={{ margin: 0, fontSize: 34, fontWeight: 700, letterSpacing: '-0.02em' }}>
              혼자여도, 괜찮아요
            </h2>
          </Stack>
        </Reveal>
        <SimpleGrid cols={{ base: 1, sm: 3 }} spacing={28}>
          {WHY.map((w, i) => (
            <Reveal key={w.title} delay={i * 90}>
              <Stack align="center" ta="center" gap={12}>
                <Box
                  style={{
                    width: 46,
                    height: 46,
                    borderRadius: 14,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: w.deep ? 'var(--rb-primary-deep-tint)' : 'var(--rb-primary-tint)',
                  }}
                >
                  <WhyIcon kind={w.icon} />
                </Box>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>{w.title}</h3>
                <p style={{ margin: 0, fontSize: 14, lineHeight: 1.8, color: 'var(--rb-ink-soft)' }}>
                  {w.desc}
                </p>
              </Stack>
            </Reveal>
          ))}
        </SimpleGrid>
      </Stack>
    </Box>
  );
}

// 이 플랫폼이 누구를 위한 곳인지 먼저 알려주는 섹션. 진단·평가로 들리는 표현("~증상", "~장애")은
// 피하고, 사용자가 "나도 해당되네" 하고 편하게 느낄 수 있는 상황 묘사만 쓴다.
// 강조(bold)할 부분은 [본문, 강조] 쌍으로 나눠서 적는다.
const AUDIENCE: [string, string, string][] = [
  ['사람 앞에서 말하려면 ', '가슴이 먼저 뛰는', ' 사람'],
  ['말하다가 ', '머릿속이 하얘져서', ' 멈춘 적이 있는 사람'],
  ['밖에 나가기가 부담돼서 ', '집에서 혼자', ' 시작해보고 싶은 사람'],
  ['내 목소리와 표정이 어떤지 ', '부담 없이', ' 살펴보고 싶은 사람'],
  ['면접이나 발표 전에 ', '실전처럼 연습', '해보고 싶은 사람'],
  ['한 번에 다 하기엔 막막하지만 ', '내 속도로 한 걸음씩', ' 가고 싶은 사람'],
];

function Audience() {
  return (
    <Box component="section" style={{ padding: '96px 24px', background: 'var(--rb-bg)' }}>
      <Stack style={{ maxWidth: MAXW, margin: '0 auto' }} gap={40}>
        <Reveal>
          <Stack align="center" gap={16} ta="center">
            <SectionBadge>이런 분께</SectionBadge>
            <h2 style={{ margin: 0, fontSize: 34, fontWeight: 700, letterSpacing: '-0.02em', wordBreak: 'keep-all' }}>
              이런 분들이라면 잘 찾아오셨어요
            </h2>
            <p style={{ margin: 0, fontSize: 15, lineHeight: 1.8, color: 'var(--rb-ink-soft)', maxWidth: 520, wordBreak: 'keep-all' }}>
              말하는 게 어렵고 사람 앞이 부담스러웠던 분, 집 밖으로 나서기 막막했던 분을 환영해요.
            </p>
          </Stack>
        </Reveal>

        <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing={20}>
          {AUDIENCE.map(([before, em, after], i) => (
            <Reveal key={em} delay={i * 70}>
              <Box
                className="rb-card-hover rb-audience-card"
                style={{
                  ...card,
                  height: '100%',
                  boxSizing: 'border-box',
                  padding: '26px 28px',
                  fontSize: 15,
                  lineHeight: 1.85,
                  color: 'var(--rb-ink)',
                  wordBreak: 'keep-all',
                  border: '1px solid var(--rb-line)',
                }}
              >
                {before}
                <strong style={{ color: 'var(--rb-primary-strong)', fontWeight: 700 }}>{em}</strong>
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
        borderTop: '1px solid var(--rb-line)',
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
            지금, 첫 걸음을 떼보세요
          </h2>
          <p style={{ margin: 0, fontSize: 15, lineHeight: 1.8, color: 'var(--rb-ink-soft)' }}>
            회원가입하면 바로 1단계 음성 진단을 시작할 수 있어요. 작게 말해도 괜찮습니다.
          </p>
          <Button component={Link} to="/signup" color="brand" radius="xl" size="md" styles={{ root: { fontWeight: 700 } }}>
            무료로 시작하기
          </Button>
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
      <Why />
      <FinalCta />
      <Footer />
    </Box>
  );
}
