import { useId } from 'react';

type Tone = 'gradient' | 'ink' | 'white';

/** Standalone Re-born symbol: a broken ring with a dot emerging from it. */
export function RebornMark({
  size = 32,
  tone = 'gradient',
  animate = false,
}: {
  size?: number;
  tone?: Tone;
  animate?: boolean;
}) {
  const gid = `rbm-${useId().replace(/[:]/g, '')}`;
  const ringStroke =
    tone === 'white' ? '#ffffff' : tone === 'ink' ? 'var(--rb-ink)' : 'var(--rb-primary-deep)';
  const dotFill = tone === 'white' ? '#ffffff' : tone === 'ink' ? 'var(--rb-ink)' : `url(#${gid})`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
      style={{ display: 'block' }}
    >
      <path
        className={animate ? 'rb-ring' : undefined}
        d="M6.6 7.3 A 10 10 0 1 1 11 19.4"
        stroke={ringStroke}
        strokeWidth={3}
        strokeLinecap="round"
        opacity={tone === 'white' ? 0.7 : 1}
      />
      <circle className={animate ? 'rb-dot' : undefined} cx={11.4} cy={11.8} r={4.7} fill={dotFill} />
      <defs>
        <linearGradient id={gid} x1="6.6" y1="7" x2="15.6" y2="17" gradientUnits="userSpaceOnUse">
          <stop stopColor="#2C543B" />
          <stop offset="1" stopColor="#8AC79B" />
        </linearGradient>
      </defs>
    </svg>
  );
}
