import { Stack, Text } from '@/components/ui';

/** 결과 화면 (임시). */
export function ResultView() {
  return (
    <Stack align="center" gap={10} ta="center" style={{ paddingTop: 60 }}>
      <Text fz={17} fw={600}>
        수고하셨어요!
      </Text>
      <Text fz={13} c="var(--rb-ink-soft)" style={{ maxWidth: 320, lineHeight: 1.6 }}>
        오늘 연습한 내용을 정리하고 있어요. 결과 화면은 다음 단계에서 만들 예정이에요.
      </Text>
    </Stack>
  );
}
