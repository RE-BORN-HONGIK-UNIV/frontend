import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
} from 'recharts';
import type { AnalyzeScores } from '@/lib/api/types';
import { AXES } from './constants';

export function VoiceRadar({ scores }: { scores: AnalyzeScores }) {
  // 모델이 아직 없는 축은 0으로 그리고 이름에 (준비 중)을 붙인다
  const data = AXES.map((a) => {
    const v = scores[a.key];
    return { axis: v === null ? `${a.label} (준비 중)` : a.label, value: v ?? 0 };
  });

  return (
    <div style={{ width: '100%', height: 300 }}>
      <ResponsiveContainer>
        <RadarChart data={data} outerRadius="72%">
          <PolarGrid stroke="var(--rb-line-strong)" />
          <PolarAngleAxis
            dataKey="axis"
            tick={{ fill: 'var(--rb-ink)', fontSize: 12, fontWeight: 600 }}
          />
          <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
          <Radar
            dataKey="value"
            stroke="var(--rb-primary)"
            strokeWidth={2.5}
            fill="var(--rb-primary)"
            fillOpacity={0.16}
            dot={{ r: 4, fill: 'var(--rb-primary-strong)', stroke: '#fff', strokeWidth: 1.5 }}
            isAnimationActive={false}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
