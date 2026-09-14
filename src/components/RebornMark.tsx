import { useId } from 'react';

type Tone = 'accent' | 'ink' | 'white';

/**
 * Standalone Re-born symbol: a ribbon bow.
 * "Re-born"이 "ribbon"과 발음이 비슷한 데서 착안 — 묶여 있던(고립됐던) 리본이
 * 풀어지듯, 다른 사람들처럼 대면을 두려워하지 않는 상태로 나아간다는 의미.
 */
export function RebornMark({
  size = 32,
  tone = 'accent',
  animate = false,
}: {
  size?: number;
  tone?: Tone;
  animate?: boolean;
}) {
  const gid = `rbm-${useId().replace(/[:]/g, '')}`;
  const loopStroke =
    tone === 'white' ? '#ffffff' : tone === 'ink' ? 'var(--rb-ink)' : 'var(--rb-logo-accent)';
  const knotFill = tone === 'white' ? '#ffffff' : tone === 'ink' ? 'var(--rb-ink)' : `url(#${gid})`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
      style={{ display: 'block', overflow: 'visible' }}
    >
      {/* left loop */}
      <path
        className={animate ? 'rb-ring' : undefined}
        d="M14.8 13.4 C 10.5 8.2, 2.8 9.6, 3.4 15.4 C 3.9 20.4, 11.5 20.8, 15.1 16.3"
        stroke={loopStroke}
        strokeWidth={2.4}
        strokeLinecap="round"
        opacity={tone === 'white' ? 0.75 : 1}
      />
      {/* right loop */}
      <path
        className={animate ? 'rb-ring' : undefined}
        d="M17.2 13.6 C 21.2 9.2, 28.6 10.4, 28.2 15.8 C 27.8 20.2, 21 20.4, 16.9 16.5"
        stroke={loopStroke}
        strokeWidth={2.4}
        strokeLinecap="round"
        opacity={tone === 'white' ? 0.75 : 1}
      />
      {/* tails — flowing curves, not straight lines, so the mark reads well at large hero scale too */}
      <path
        d="M14.9 17 C 13 20, 10.5 22.5, 10.8 27.2 L 13.6 23.8"
        stroke={loopStroke}
        strokeWidth={2.1}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={tone === 'white' ? 0.75 : 1}
      />
      <path
        d="M17.1 17 C 19 20, 21.5 22.5, 21.2 27.2 L 18.4 23.8"
        stroke={loopStroke}
        strokeWidth={2.1}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={tone === 'white' ? 0.75 : 1}
      />
      {/* knot */}
      <circle className={animate ? 'rb-dot' : undefined} cx={16} cy={15} r={2.5} fill={knotFill} />
      <defs>
        <linearGradient id={gid} x1="13.4" y1="12.5" x2="18.6" y2="17.7" gradientUnits="userSpaceOnUse">
          <stop stopColor="var(--rb-logo-ink)" />
          <stop offset="1" stopColor="var(--rb-logo-accent)" />
        </linearGradient>
      </defs>
    </svg>
  );
}
