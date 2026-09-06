import type { ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Anchor, Box, Group, Text, Title } from '@mantine/core';
import { RebornWordmark } from './RebornWordmark';
import { auth } from '@/lib/auth';

/** Shared gradient header for app pages (Dashboard, VoiceStage, …). */
export function PageHeader({
  back,
  eyebrow,
  title,
  subtitle,
}: {
  back?: string;
  eyebrow?: ReactNode;
  title: string;
  subtitle?: string;
}) {
  const navigate = useNavigate();
  const authed = auth.isAuthed();

  return (
    <Box style={{ background: 'var(--rb-grad)', padding: '28px 24px 26px', borderRadius: '0 0 24px 24px' }}>
      <Box style={{ maxWidth: 1120, margin: '0 auto' }}>
        <Group justify="space-between" align="center">
          <Link to={authed ? '/dashboard' : '/'}>
            <RebornWordmark size={18} animate={false} onGradient />
          </Link>
          {authed && (
            <Anchor
              fz={13}
              c="rgba(255,255,255,0.85)"
              onClick={() => {
                auth.signOut();
                navigate('/login');
              }}
            >
              로그아웃
            </Anchor>
          )}
        </Group>

        {back && (
          <Anchor
            component={Link}
            to={back}
            fz={13}
            c="rgba(255,255,255,0.85)"
            display="inline-block"
            mt={14}
          >
            ← 뒤로
          </Anchor>
        )}

        {eyebrow && (
          <Box mt={back ? 10 : 14}>
            {typeof eyebrow === 'string' ? (
              <Text fz={13} fw={600} c="rgba(255,255,255,0.85)" style={{ letterSpacing: '0.5px' }}>
                {eyebrow}
              </Text>
            ) : (
              eyebrow
            )}
          </Box>
        )}

        <Title order={1} c="#fff" fz={27} fw={700} mt={eyebrow ? 4 : 14}>
          {title}
        </Title>
        {subtitle && (
          <Text c="rgba(255,255,255,0.8)" fz={13} mt={6}>
            {subtitle}
          </Text>
        )}
      </Box>
    </Box>
  );
}
