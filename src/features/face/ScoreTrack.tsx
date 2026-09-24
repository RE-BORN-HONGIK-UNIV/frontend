import { useEffect, useState } from 'react';
import { Badge, Box, Group, Text } from '@/components/ui';

/** marker 텍스트가 막대 양 끝(0%/100%)에서 컨테이너 밖으로 삐져나가 아래
 * 라벨과 겹치지 않도록, 끝에 가까우면 텍스트를 가운데 정렬 대신 안쪽으로
 * 붙인다 — 앵커 위치(left: pct%) 자체는 그대로 두고 정렬 기준만 바꾼다. */
function markerTextTransform(pct: number) {
  if (pct < 8) return 'translateX(0)';
  if (pct > 92) return 'translateX(-100%)';
  return 'translateX(-50%)';
}

/**
 * 선택된 지표의 점수(0~100)가 전체 범위 중 어디쯤인지 보여주는 막대.
 * 방향(많음/적음 등)은 이미 옆에 있는 상태 배지가 담당하고, 이 막대는
 * "정상에서 얼마나 벗어났는지"(0=가장 나쁨, 100=가장 좋음)만 보여준다 —
 * 깜빡임/시선처럼 너무 많아도 너무 적어도 감점되는 지표는 점수 하나만으론
 * 방향을 알 수 없어서, 방향까지 막대에 억지로 넣지 않는다.
 * mount 시 채워지는 비율이 0%에서 실제 점수까지 애니메이션으로 증가한다.
 *
 * status/statusColor를 넘기면 막대 아래에 숫자(0/100) 대신 실제 판정
 * 결과("정상"/"빈번" 등)를 보여준다 — 0/100은 척도일 뿐 사용자 상태를
 * 알려주지 않아서, 이미 계산된 상태 문구를 그대로 노출하는 쪽이 더 유용함.
 */
export function ScoreTrack({
  score,
  status,
  statusColor,
}: {
  score: number;
  status?: string;
  statusColor?: 'brand' | 'amber' | 'gray';
}) {
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

      <Box className="rb-meter-marker" style={{ position: 'relative', left: `${pct}%`, width: 0 }}>
        <Text
          fz={12}
          fw={700}
          c="var(--rb-meter)"
          style={{ position: 'absolute', top: 4, left: 0, whiteSpace: 'nowrap', transform: markerTextTransform(pct) }}
        >
          {target}점
        </Text>
      </Box>

      {status ? (
        <Group justify="center" mt={6}>
          <Badge color={statusColor ?? 'gray'}>{status}</Badge>
        </Group>
      ) : (
        <Group justify="space-between" mt={4}>
          <Text fz={11} c="var(--rb-ink-faint)">0</Text>
          <Text fz={11} c="var(--rb-ink-faint)">100</Text>
        </Group>
      )}
    </Box>
  );
}
