import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Box, Paper, Stack, Text, Title } from '@/components/ui';
import { RebornWordmark } from './RebornWordmark';

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <Box
      style={{
        minHeight: '100dvh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
    >
      <Stack align="center" gap={24} style={{ width: '100%', maxWidth: 400 }}>
        <Link to="/">
          <RebornWordmark size={40} animate={false} />
        </Link>

        <Paper
          w="100%"
          p={36}
          radius="lg"
          withBorder
          style={{ background: 'var(--rb-surface)', borderColor: 'var(--rb-line)' }}
        >
          <Stack gap={24}>
            <Stack gap={6}>
              <Title order={1} fz={22} fw={700}>
                {title}
              </Title>
              {subtitle && (
                <Text fz={13} c="var(--rb-ink-soft)">
                  {subtitle}
                </Text>
              )}
            </Stack>
            {children}
          </Stack>
        </Paper>

        {footer}
      </Stack>
    </Box>
  );
}
