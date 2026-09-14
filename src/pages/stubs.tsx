import { Link } from 'react-router-dom';
import { Anchor, Box, Stack, Text, Title } from '@/components/ui';
import { RebornWordmark } from '@/components/RebornWordmark';

function Shell({ title, note }: { title: string; note: string }) {
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
      <Stack align="center" gap={16} ta="center" style={{ maxWidth: 420 }}>
        <RebornWordmark size={40} animate={false} />
        <Title order={2} fz={22}>
          {title}
        </Title>
        <Text c="var(--rb-ink-soft)" fz={14}>
          {note}
        </Text>
        <Anchor component={Link} to="/" c="var(--rb-primary-strong)" fz={14}>
          ← 홈으로
        </Anchor>
      </Stack>
    </Box>
  );
}

export function NotFound() {
  return <Shell title="페이지를 찾을 수 없어요" note="주소를 다시 확인해 주세요." />;
}
