import { Box, Button, Stack, Text } from '@/components/ui';

/** 면접 시작 전 인사 화면. */
export function IntroView({ onStart }: { onStart: () => void }) {
  return (
    <Stack align="center" gap={20} ta="center" style={{ paddingTop: 40 }}>
      <Box
        style={{
          width: 96,
          height: 96,
          borderRadius: '50%',
          background: 'var(--rb-surface)',
          border: '1.5px dashed var(--rb-line-strong)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text fz={36}>🙂</Text>
      </Box>

      <Stack gap={8}>
        <Text fz={17} fw={600}>
          안녕하세요, 오늘 함께 연습해볼게요
        </Text>
        <Text fz={13} c="var(--rb-ink-soft)" style={{ maxWidth: 320, lineHeight: 1.6 }}>
          이건 실제 면접이 아니라 연습이에요. 편하게 준비되면 시작해주세요.
          언제든 중간에 쉬거나 멈출 수 있어요.
        </Text>
      </Stack>

      <Button color="brand" radius="md" size="md" onClick={onStart}>
        준비됐어요
      </Button>
    </Stack>
  );
}
