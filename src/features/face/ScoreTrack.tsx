import { useEffect, useState } from 'react';
import { Box, Text } from '@/components/ui';

export interface MeterZone {
  from: number;
  to: number;
  color: 'brand' | 'amber';
}

const ZONE_FILL: Record<MeterZone['color'], string> = {
  brand: 'var(--rb-primary)',
  amber: 'var(--rb-amber)',
};

function toPercent(value: number, [min, max]: [number, number], openEnd: boolean) {
  if (max <= min) return 0;
  const raw = ((value - min) / (max - min)) * 100;
  if (openEnd) return Math.min(96, Math.max(4, raw));
  return Math.min(100, Math.max(0, raw));
}

export function ScoreTrack({
  value,
  domain,
  zones,
  unit = '',
  openEnd = false,
}: {
  value: number;
  domain: [number, number];
  zones?: MeterZone[];
  unit?: string;
  openEnd?: boolean;
}) {
  const target = toPercent(value, domain, openEnd);
  const [pct, setPct] = useState(0);

  useEffect(() => {
    setPct(0);
    const id = requestAnimationFrame(() => requestAnimationFrame(() => setPct(target)));
    return () => cancelAnimationFrame(id);
  }, [target]);

  return (
    <Box style={{ marginTop: 14 }}>
      <Box style={{ position: 'relative', height: 8, borderRadius: 4, background: 'var(--rb-line)', overflow: 'hidden' }}>
        {zones ? (
          zones.map((z, i) => {
            const left = toPercent(z.from, domain, false);
            const right = toPercent(z.to, domain, false);
            return (
              <Box
                key={i}
                style={{
                  position: 'absolute',
                  top: 0,
                  bottom: 0,
                  left: `${left}%`,
                  width: `${Math.max(0, right - left)}%`,
                  background: ZONE_FILL[z.color],
                  marginLeft: i === 0 ? 0 : 1,
                  marginRight: i === zones.length - 1 ? 0 : 1,
                  borderRadius: 4,
                }}
              />
            );
          })
        ) : (
          <Box
            style={{
              position: 'absolute',
              top: 0,
              bottom: 0,
              left: 0,
              width: `${target}%`,
              background: 'var(--rb-primary)',
              borderRadius: 4,
            }}
          />
        )}
      </Box>

      <Box
        className="rb-meter-marker"
        style={{
          position: 'relative',
          left: `${pct}%`,
          transform: 'translateX(-50%)',
          width: 0,
          marginTop: 6,
        }}
      >
        <Box
          style={{
            width: 12,
            height: 12,
            borderRadius: '50%',
            background: '#fff',
            border: '2px solid var(--rb-ink)',
            boxShadow: '0 1px 3px rgba(0,0,0,0.25)',
            marginLeft: -6,
          }}
        />
        <Text
          fz={11}
          fw={700}
          c="var(--rb-ink)"
          style={{ position: 'absolute', top: 16, left: '50%', transform: 'translateX(-50%)', whiteSpace: 'nowrap' }}
        >
          {value}
          {unit}
        </Text>
      </Box>
    </Box>
  );
}