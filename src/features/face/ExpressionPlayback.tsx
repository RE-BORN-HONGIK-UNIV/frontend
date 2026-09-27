import { useEffect, useRef, useState } from 'react';
import { Box, Button, Group, Text } from '@/components/ui';

type ExpressionSegment = { type: 'smile' | 'tension' | 'neutral'; start: number; end: number };
type Indicator = 'smile' | 'tension';

const LABEL: Record<Indicator, string> = { smile: '미소', tension: '긴장' };

/**
 * 실제 영상을 다시 재생하는 게 아니라, expression.segments(smile/tension/neutral
 * 구간, 초 단위)를 기준으로 "이 구간에서 이 표정이 감지됐다"를 얼굴로
 * 재현하는 가상 재생. requestAnimationFrame으로 0~총길이 사이를 흐르는
 * 가상 재생 헤드(time)를 만들고, 그 시점이 원하는 타입의 구간 안에 있으면
 * amount=1(표정 활성), 아니면 0(중립)으로 스냅한다.
 */
function useSegmentPlayback(totalDuration: number) {
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!playing) return;
    const startedAt = performance.now() - time * 1000;
    const tick = (now: number) => {
      const t = (now - startedAt) / 1000;
      if (t >= totalDuration) {
        setTime(totalDuration);
        setPlaying(false);
        return;
      }
      setTime(t);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
    // time is only read as the animation's starting point here, not a dependency to re-trigger on
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, totalDuration]);

  const toggle = () => {
    if (!playing && time >= totalDuration) setTime(0);
    setPlaying((p) => !p);
  };

  return { time, playing, toggle };
}

function MiniAvatar({ mouthLift, browFurrow }: { mouthLift: number; browFurrow: number }) {
  return (
    <svg width="96" height="96" viewBox="0 0 120 120" aria-hidden="true">
      <circle cx="60" cy="60" r="48" fill="var(--rb-surface)" stroke="var(--rb-line-strong)" strokeWidth="2" />
      <path d={`M 32 38 L 50 ${38 + browFurrow}`} stroke="var(--rb-ink)" strokeWidth="3.5" strokeLinecap="round" fill="none" />
      <path d={`M 88 38 L 70 ${38 + browFurrow}`} stroke="var(--rb-ink)" strokeWidth="3.5" strokeLinecap="round" fill="none" />
      <circle cx="40" cy="52" r="4" fill="var(--rb-ink)" />
      <circle cx="80" cy="52" r="4" fill="var(--rb-ink)" />
      <path d={`M 42 80 Q 60 ${80 - mouthLift} 78 80`} stroke="var(--rb-ink)" strokeWidth="3.5" strokeLinecap="round" fill="none" />
    </svg>
  );
}

/** 미소/긴장 중 하나만 담당하는 독립 재생 패널 — 두 개를 나란히 두면 원하는 쪽만 골라 재생할 수 있다. */
export function ExpressionPlayer({
  indicator,
  score,
  segments,
}: {
  indicator: Indicator;
  score: number;
  segments: ExpressionSegment[];
}) {
  const total = segments.length ? segments[segments.length - 1].end : 0;
  const { time, playing, toggle } = useSegmentPlayback(total);

  const active = segments.some((s) => s.type === indicator && time >= s.start && time < s.end);
  const amount = active ? 1 : 0;
  const magnitude = indicator === 'smile' ? (score / 100) * 14 : ((100 - score) / 100) * 7;

  const mouthLift = indicator === 'smile' ? magnitude * amount : 0;
  const browFurrow = indicator === 'tension' ? magnitude * amount : 0;
  const finished = !playing && total > 0 && time >= total;

  return (
    <Box style={{ textAlign: 'center' }}>
      <Text fz={13} fw={700} c="var(--rb-primary-strong)" mb={6}>
        {LABEL[indicator]}
      </Text>

      <MiniAvatar mouthLift={mouthLift} browFurrow={browFurrow} />

      <Text fz={12} c="var(--rb-ink-soft)" mt={4}>
        {score}점
      </Text>

      <Button size="sm" variant="default" radius="md" mt={8} onClick={toggle} disabled={total === 0}>
        {playing ? '일시정지' : finished ? '다시보기' : '재생'}
      </Button>

      <Box
        style={{
          position: 'relative',
          height: 6,
          borderRadius: 3,
          background: 'var(--rb-line)',
          marginTop: 10,
          overflow: 'hidden',
        }}
      >
        <Box
          style={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            left: 0,
            width: total > 0 ? `${Math.min(100, (time / total) * 100)}%` : '0%',
            background: 'var(--rb-meter)',
          }}
        />
      </Box>

      <Group justify="space-between" mt={4}>
        <Text fz={10} c="var(--rb-ink-faint)">{time.toFixed(1)}초</Text>
        <Text fz={10} c="var(--rb-ink-faint)">{total.toFixed(1)}초</Text>
      </Group>
    </Box>
  );
}
