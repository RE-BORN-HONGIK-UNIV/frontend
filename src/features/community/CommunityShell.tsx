import type { ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Anchor, Box, Group, Text, Title } from '@/components/ui';
import { RebornWordmark } from '@/components/RebornWordmark';
import { auth } from '@/lib/auth';
import { useMediaQuery } from '@/lib/useMediaQuery';
import { CommunitySidebar } from './CommunitySidebar';

/** '이야기' 영역 전용 레이아웃 — 다른 화면(Dashboard/VoiceStage 등)의 진한 그린
 * 그라디언트 PageHeader 대신, 커뮤니티다운 밝은 화이트 헤더 + 카테고리
 * 사이드바 구조를 씀. PageHeader 자체는 다른 화면들이 계속 쓰고 있어서
 * 안 건드리고, 이 폴더 안에서만 별도로 구성. */
export function CommunityShell({
  back,
  eyebrow,
  title,
  subtitle,
  headerRight,
  children,
}: {
  back?: string;
  eyebrow?: string;
  title: ReactNode;
  subtitle?: string;
  headerRight?: ReactNode;
  children: ReactNode;
}) {
  const navigate = useNavigate();
  const isMobile = useMediaQuery('(max-width: 48em)');

  return (
    <Box style={{ minHeight: '100dvh', background: 'var(--rb-bg)', paddingBottom: 60 }}>
      <Box style={{ background: 'var(--rb-surface)', borderBottom: '1px solid var(--rb-line)' }}>
        <Group justify="space-between" style={{ maxWidth: 1040, margin: '0 auto', padding: '14px 20px' }}>
          <Link to="/dashboard">
            <RebornWordmark size={22} animate={false} />
          </Link>
          <Anchor
            fz={13}
            c="var(--rb-ink-soft)"
            onClick={() => {
              auth.signOut();
              navigate('/login');
            }}
          >
            로그아웃
          </Anchor>
        </Group>
      </Box>

      <Box style={{ maxWidth: 1040, margin: '0 auto', padding: '28px 20px 0' }}>
        {back && (
          <Anchor component={Link} to={back} fz={13} c="var(--rb-ink-soft)" display="inline-block" mb={14}>
            ← 뒤로
          </Anchor>
        )}
        {eyebrow && (
          <Text fz={13} fw={600} c="var(--rb-primary-strong)" mb={4} style={{ letterSpacing: '0.5px' }}>
            {eyebrow}
          </Text>
        )}
        <Group justify="space-between" align="flex-start" gap={12} mb={subtitle ? 6 : 20}>
          <Title order={1} fz={24} fw={700}>
            {title}
          </Title>
          {headerRight}
        </Group>
        {subtitle && (
          <Text fz={13} c="var(--rb-ink-soft)" mb={20}>
            {subtitle}
          </Text>
        )}

        <Box
          style={{
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            gap: isMobile ? 4 : 24,
            alignItems: 'flex-start',
          }}
        >
          <CommunitySidebar variant={isMobile ? 'chips' : 'sidebar'} />
          <Box style={{ flex: 1, minWidth: 0, width: '100%' }}>{children}</Box>
        </Box>
      </Box>
    </Box>
  );
}
