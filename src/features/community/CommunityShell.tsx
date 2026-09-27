import { useState, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Anchor, Box, Group, IconPanelLeft, Text, Title } from '@/components/ui';
import { RebornWordmark } from '@/components/RebornWordmark';
import { SiteNavLinks } from '@/components/SiteNavLinks';
import { auth } from '@/lib/auth';
import { useMediaQuery } from '@/lib/useMediaQuery';
import { CommunitySidebar } from './CommunitySidebar';

const SIDEBAR_KEY = 'rb.community.sidebarOpen';

function getStoredSidebarOpen(): boolean {
  try {
    return localStorage.getItem(SIDEBAR_KEY) !== 'false';
  } catch {
    return true;
  }
}

function persistSidebarOpen(open: boolean) {
  try {
    localStorage.setItem(SIDEBAR_KEY, String(open));
  } catch {
    /* private mode — this tab only */
  }
}

/** '이야기' 영역 전용 레이아웃 — 다른 화면(Dashboard/VoiceStage 등)의 진한 그린
 * 그라디언트 PageHeader 대신, 커뮤니티다운 밝은 화이트 헤더 + 카테고리
 * 사이드바 구조를 씀. PageHeader 자체는 다른 화면들이 계속 쓰고 있어서
 * 안 건드리고, 이 폴더 안에서만 별도로 구성.
 *
 * maxWidth로 가운데 정렬하지 않고 좌우 padding만 줘서 창 너비에 그대로
 * 맞춰지게 함(Claude Code 데스크톱 앱처럼 가장자리까지 꽉 채우는 레이아웃).
 * 사이드바는 접고 펼 수 있고, 그 상태는 localStorage에 저장해 다음 방문
 * 때도 유지됨. */
export function CommunityShell({
  title,
  subtitle,
  headerRight,
  children,
}: {
  title: ReactNode;
  subtitle?: string;
  headerRight?: ReactNode;
  children: ReactNode;
}) {
  const navigate = useNavigate();
  const isMobile = useMediaQuery('(max-width: 48em)');
  const [sidebarOpen, setSidebarOpen] = useState(getStoredSidebarOpen);

  const toggleSidebar = () => {
    setSidebarOpen((v) => {
      const next = !v;
      persistSidebarOpen(next);
      return next;
    });
  };

  return (
    <Box style={{ minHeight: '100dvh', background: 'var(--rb-bg)', paddingBottom: 60 }}>
      <Box style={{ background: 'var(--rb-surface)', borderBottom: '1px solid var(--rb-line)' }}>
        <Group justify="space-between" style={{ padding: '20px 40px' }}>
          <Group gap={16}>
            {!isMobile && (
              <button
                type="button"
                onClick={toggleSidebar}
                aria-label={sidebarOpen ? '사이드바 닫기' : '사이드바 열기'}
                aria-pressed={sidebarOpen}
                className="rb-icon-btn"
              >
                <IconPanelLeft />
              </button>
            )}
            <Link to="/">
              <RebornWordmark size={36} animate={false} />
            </Link>
          </Group>
          <SiteNavLinks active="community" />
          <Group gap={14}>
            <Text fz={14} c="var(--rb-ink-soft)">
              {auth.name || '회원'}님
            </Text>
            <Anchor
              fz={14}
              c="var(--rb-ink-soft)"
              onClick={() => {
                auth.signOut();
                navigate('/login');
              }}
            >
              로그아웃
            </Anchor>
          </Group>
        </Group>
      </Box>

      <Box style={{ padding: '28px 28px 0' }}>
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
          {isMobile ? (
            <CommunitySidebar variant="chips" />
          ) : (
            sidebarOpen && <CommunitySidebar variant="sidebar" />
          )}
          <Box style={{ flex: 1, minWidth: 0, width: '100%' }}>{children}</Box>
        </Box>
      </Box>
    </Box>
  );
}
