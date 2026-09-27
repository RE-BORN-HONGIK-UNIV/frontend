import { Box, Group, Text } from '@/components/ui';

type GazeSegment = { type: 'fixation' | 'aversion'; start: number; end: number };

const SEGMENT_COLOR: Record<GazeSegment['type'], string> = {
  fixation: 'var(--rb-primary)',
  aversion: 'var(--rb-amber-strong)',
};

/**
 * gaze.score 하나만으론 "몇 점인지"만 알 수 있고 언제·얼마나 시선을 피했는지는
 * 안 보임. 이미 있는 segments(고정/이탈 구간)를 타임라인으로 펼쳐서, 점수를
 * 또 보여주는 대신 실제로 어떻게 움직였는지를 보여준다 — FaceAvatar와 같은
 * 방향(점수 반복 대신 원본에 가까운 정보)의 시각화.
 */
export function GazeTimeline({ segments }: { segments: GazeSegment[] }) {
  const total = segments.length ? segments[segments.length - 1].end : 0;
  const aversionSec = segments
    .filter((s) => s.type === 'aversion')
    .reduce((sum, s) => sum + (s.end - s.start), 0);
  const fixationSec = Math.max(0, total - aversionSec);

  return (
    <Box>
      <Box
        style={{
          position: 'relative',
          height: 20,
          borderRadius: 6,
          background: 'var(--rb-line)',
          overflow: 'hidden',
          display: 'flex',
        }}
      >
        {total > 0 ? (
          segments.map((seg, i) => (
            <Box
              key={i}
              style={{
                width: `${((seg.end - seg.start) / total) * 100}%`,
                background: SEGMENT_COLOR[seg.type],
                marginRight: i === segments.length - 1 ? 0 : 1,
              }}
            />
          ))
        ) : (
          <Text fz={12} c="var(--rb-ink-faint)" style={{ margin: 'auto' }}>
            구간 정보가 없어요
          </Text>
        )}
      </Box>

      <Group justify="space-between" mt={4}>
        <Text fz={11} c="var(--rb-ink-faint)">0초</Text>
        <Text fz={11} c="var(--rb-ink-faint)">{total.toFixed(1)}초</Text>
      </Group>

      <Group gap={16} mt={10}>
        <Group gap={6}>
          <Box style={{ width: 10, height: 10, borderRadius: 3, background: SEGMENT_COLOR.fixation }} />
          <Text fz={12} c="var(--rb-ink-soft)">시선 고정 {fixationSec.toFixed(1)}초</Text>
        </Group>
        <Group gap={6}>
          <Box style={{ width: 10, height: 10, borderRadius: 3, background: SEGMENT_COLOR.aversion }} />
          <Text fz={12} c="var(--rb-ink-soft)">시선 이탈 {aversionSec.toFixed(1)}초</Text>
        </Group>
      </Group>
    </Box>
  );
}
