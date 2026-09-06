import { useId, type CSSProperties } from 'react';

/**
 * "Re-b[o]rn" wordmark — the 'o' is the broken-ring symbol.
 * On mount (animate): the ring draws, then the dot glides into place.
 */
export function RebornWordmark({
  size = 96,
  animate = true,
  onGradient = false,
}: {
  size?: number;
  animate?: boolean;
  /** true when placed on a filled brand background — renders in solid white */
  onGradient?: boolean;
}) {
  const gid = `rbw-${useId().replace(/[:]/g, '')}`;

  const text: CSSProperties = onGradient
    ? { color: '#ffffff' }
    : {
        background: 'var(--rb-grad)',
        WebkitBackgroundClip: 'text',
        backgroundClip: 'text',
        color: 'transparent',
      };

  return (
    <span
      style={{
        fontFamily: 'var(--rb-font-display)',
        fontWeight: 600,
        fontSize: size,
        lineHeight: 1,
        letterSpacing: '-0.03em',
        display: 'inline-flex',
        alignItems: 'center',
      }}
    >
      <span style={text}>Re-b</span>
      <span
        aria-hidden="true"
        style={{
          display: 'inline-flex',
          width: '0.64em',
          height: '0.64em',
          margin: '0 0.04em',
          position: 'relative',
          top: '0.055em',
        }}
      >
        <svg viewBox="0 0 32 32" width="100%" height="100%" fill="none">
          <path
            className={animate ? 'rb-ring' : undefined}
            d="M21 7.3 A 10 10 0 1 1 25.4 19.4"
            stroke={onGradient ? '#ffffff' : 'var(--rb-primary-deep)'}
            strokeWidth={3}
            strokeLinecap="round"
            opacity={onGradient ? 0.7 : 1}
          />
          <circle
            className={animate ? 'rb-dot' : undefined}
            cx={25.8}
            cy={11.8}
            r={4.7}
            fill={onGradient ? '#ffffff' : `url(#${gid})`}
          />
          <defs>
            <linearGradient id={gid} x1="21" y1="7" x2="30" y2="17" gradientUnits="userSpaceOnUse">
              <stop stopColor="#2C543B" />
              <stop offset="1" stopColor="#8AC79B" />
            </linearGradient>
          </defs>
        </svg>
      </span>
      <span style={text}>rn</span>
    </span>
  );
}
