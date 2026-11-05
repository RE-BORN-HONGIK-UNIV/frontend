import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Anchor, Box, Group, Text, Title } from '@/components/ui';
import { RebornWordmark } from './RebornWordmark';
import { SiteNavLinks } from './SiteNavLinks';
import { auth } from '@/lib/auth';
import { LogoutButton } from '@/components/LogoutButton';

/** Shared header for app pages outside the 1→2→3단계 flow (Dashboard, PracticePage).
 * 1·2·3단계와 결과 화면은 단계 표시가 있는 StageHeader를 쓴다(경량 웹 상단바).
 * '이야기'(Community) 페이지와 같은 흰 배경 + 상단 네비(로고/이야기/문의/사용자명/
 * 로그아웃) 스타일로 통일 — 예전엔 이 화면들만 진한 그린 그라디언트 배너를 써서,
 * '이야기'와 오갈 때 디자인 시스템이 확 바뀌는 느낌이 있었음(CommunityShell.tsx
 * 참고). title/subtitle 영역도 CommunityShell처럼 maxWidth 없이 좌우 padding만
 * 줘서 화면 끝까지 채움 — Dashboard.tsx 본문 wrapper와 동일한 이유. */
export function PageHeader({
  back,
  eyebrow,
  title,
  subtitle,
  rightExtra,
}: {
  back?: string;
  eyebrow?: ReactNode;
  title: string;
  subtitle?: string;
  /** title 옆(데스크톱) / title 아래(모바일)에 붙는 부가 요소 (예: 연속 방문일). */
  rightExtra?: ReactNode;
}) {
  const authed = auth.isAuthed();

  return (
    <Box style={{ background: 'var(--rb-surface)', borderBottom: '1px solid var(--rb-line)' }}>
      <Group justify="space-between" style={{ padding: '20px 40px' }}>
        <Link to="/">
          <RebornWordmark size={36} animate={false} />
        </Link>
        <Group gap={32}>
        <SiteNavLinks active="training" />
        {authed && (
          <Group gap={14}>
            <Text fz={14} c="var(--rb-ink-soft)">
              {auth.name || '회원'}님
            </Text>
            {/* 로그아웃 → 가운데 확인 창(게스트는 기록이 저장되지 않는다고 알림) → 이 기기 기록 지우고 메인으로.
                다음 "무료로 시작하기"는 새 게스트·새 닉네임부터. 로그인은 메인 화면 상단에서 */}
            <LogoutButton />
          </Group>
        )}
      </Group>
      </Group>

      <Box style={{ padding: '4px 40px 26px' }}>
        {back && (
          <Anchor component={Link} to={back} fz={13} c="var(--rb-ink-soft)" display="inline-block" mb={14}>
            ← 뒤로
          </Anchor>
        )}

        <Group justify="space-between" align="flex-start" wrap="wrap" gap={12}>
          <Box>
            {eyebrow && (
              <Box mb={4}>
                {typeof eyebrow === 'string' ? (
                  <Text fz={13} fw={600} c="var(--rb-primary-strong)" style={{ letterSpacing: '0.5px' }}>
                    {eyebrow}
                  </Text>
                ) : (
                  eyebrow
                )}
              </Box>
            )}
            <Title order={1} fz={27} fw={700}>
              {title}
            </Title>
            {subtitle && (
              <Text c="var(--rb-ink-soft)" fz={13} mt={6}>
                {subtitle}
              </Text>
            )}
          </Box>
          {rightExtra}
        </Group>
      </Box>
    </Box>
  );
}
