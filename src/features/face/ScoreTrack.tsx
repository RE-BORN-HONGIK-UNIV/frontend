import { useEffect, useState } from 'react';
import { Box, Group, Text } from '@/components/ui';

/**
 * 선택된 지표의 점수(0~100)가 전체 범위 중 어디쯤인지 보여주는 막대.
 * 방향(많음/적음 등)은 이미 옆에 있는 상태 배지가 담당하고, 이 막대는
 * "정상에서 얼마나 벗어났는지"(0=가장 나쁨, 100=가장 좋음)만 보여준다 —
 * 깜빡임/시선처럼 너무 많아도 너무 적어도 감점되는 지표는 점수 하나만으론
 * 방향을 알 수 없어서, 방향까지 막대에 억지로 넣지 않는다.
 * mount 시 채워지는 비율이 0%에서 실제 점수까지 애니메이션으로 증가한다.
 */
export function ScoreTrack({ score }: { score: number }) {
  const target = Math.min(100, Math.max(0, score));
  const [pct, setPct] = useState(0);

  useEffect(() => {
    setPct(0);
    const id = requestAnimationFrame(() => requestAnimationFrame(() => setPct(target)));
    return () => cancelAnimationFrame(id);
  }, [target]);

  return (
    <Box>
      <Box style={{ position: 'relative', height: 10, borderRadius: 5, background: 'var(--rb-line)', overflow: 'hidden' }}>
        <Box
          className="rb-meter-fill"
          style={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            left: 0,
            width: `${pct}%`,
            background: 'var(--rb-meter)',
            borderRadius: 5,
          }}
        />
      </Box>

      <Box
        className="rb-meter-marker"
        style={{ position: 'relative', left: `${pct}%`, transform: 'translateX(-50%)', width: 0 }}
      >
        <Text
          fz={12}
          fw={700}
          c="var(--rb-meter)"
          style={{ position: 'absolute', top: 4, left: '50%', transform: 'translateX(-50%)', whiteSpace: 'nowrap' }}
        >
          {target}점
        </Text>
      </Box>

      <Group justify="space-between" mt={4}>
        <Text fz={11} c="var(--rb-ink-faint)">0</Text>
        <Text fz={11} c="var(--rb-ink-faint)">100</Text>
      </Group>
    </Box>
  );
}
