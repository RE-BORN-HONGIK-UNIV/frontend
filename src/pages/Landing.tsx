import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Anchor, Box, Button, Group, SimpleGrid, Stack } from '@/components/ui';
import { useMediaQuery } from '@/lib/useMediaQuery';
import { RebornWordmark } from '@/components/RebornWordmark';
import { Reveal } from '@/components/Reveal';
import { SectionBadge } from '@/components/SectionBadge';

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
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '20px 40px',
        borderBottom: '1px solid var(--rb-line)',
        background: 'var(--rb-surface)',
        position: 'relative',
        zIndex: 5,
      }}
    >
      <RebornWordmark size={36} animate={false} />
      <Group gap={32} visibleFrom="sm">
        <Anchor component={Link} to="/community" c="var(--rb-ink-soft)" fz={14} underline="never">
          이야기
        </Anchor>
        <Anchor href="#contact" c="var(--rb-ink-soft)" fz={14} underline="never">
          문의
        </Anchor>
      </Group>
      <Button
        component={Link}
        to="/signup"
        variant="outline"
        color="brand"
        radius="xl"
        size="xs"
        styles={{ root: { fontWeight: 600 } }}
      >
        시작하기
      </Button>
    </Box>
  );
}

function Hero() {
  const isMobile = useMediaQuery('(max-width: 48em)');
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

      <Stack align="flex-start" gap={26} style={{ position: 'relative', maxWidth: 720 }}>
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
          <Anchor href="#steps" c="var(--rb-ink-soft)" fz={14} fw={500} underline="never">
            3단계 과정 보기 →
          </Anchor>
        </Group>
      </Stack>

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

function Facts() {
  const items = [
    ['5', '발화 지표 진단'],
    ['3', '단계 재활 여정'],
    ['AI', '음성·표정·대화 분석'],
  ];
  return (
    <Box component="section" style={{ padding: '0 24px 96px', background: 'var(--rb-bg)' }}>
      <Reveal>
        <Group
          justify="space-around"
          wrap="wrap"
          gap={24}
          style={{
            maxWidth: MAXW,
            margin: '0 auto',
            background: 'var(--rb-primary-tint)',
            border: '1px solid var(--rb-line)',
            borderRadius: 24,
            padding: 40,
          }}
        >
          {items.map(([n, label]) => (
            <Stack key={label} align="center" gap={4}>
              <span
                style={{
                  fontFamily: 'var(--rb-font-display)',
                  fontSize: 40,
                  fontWeight: 600,
                  color: 'var(--rb-primary-strong)',
                }}
              >
                {n}
              </span>
              <span style={{ fontSize: 13, color: 'var(--rb-ink-soft)' }}>{label}</span>
            </Stack>
          ))}
        </Group>
      </Reveal>
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
      <Steps />
      <Why />
      <Facts />
      <FinalCta />
      <Footer />
    </Box>
  );
}
