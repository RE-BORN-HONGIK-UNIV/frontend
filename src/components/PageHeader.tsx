import type { ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Anchor, Box, Group, Text, Title } from '@/components/ui';
import { RebornWordmark } from './RebornWordmark';
import { auth } from '@/lib/auth';

/** Shared header for app pages (Dashboard, VoiceStage, FaceStage, InterviewStage).
 * '이야기'(Community) 페이지와 같은 흰 배경 + 상단 네비(로고/이야기/문의/사용자명/
 * 로그아웃) 스타일로 통일 — 예전엔 이 화면들만 진한 그린 그라디언트 배너를 써서,
 * '이야기'와 오갈 때 디자인 시스템이 확 바뀌는 느낌이 있었음(CommunityShell.tsx
 * 참고). 가운데 title/subtitle 영역은 기존처럼 maxWidth로 정렬. */
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
  const navigate = useNavigate();
  const authed = auth.isAuthed();

  return (
    <Box style={{ background: 'var(--rb-surface)', borderBottom: '1px solid var(--rb-line)' }}>
      <Group justify="space-between" style={{ padding: '20px 40px' }}>
        <Link to="/">
          <RebornWordmark size={36} animate={false} />
        </Link>
        <Group gap={32} visibleFrom="sm">
          <Anchor component={Link} to="/community" c="var(--rb-ink-soft)" fz={14} underline="never">
            이야기
          </Anchor>
          <Anchor href="#contact" c="var(--rb-ink-soft)" fz={14} underline="never">
            문의
          </Anchor>
        </Group>
        {authed && (
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
        )}
      </Group>

      <Box style={{ maxWidth: 1120, margin: '0 auto', padding: '4px 40px 26px' }}>
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
