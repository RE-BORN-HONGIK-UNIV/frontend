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
        d="M14.6 13.6 C 9.2 9.6, 3.4 11.2, 4 15.8 C 4.5 19.7, 10.6 19.9, 14.9 16.6"
        stroke={loopStroke}
        strokeWidth={2.6}
        strokeLinecap="round"
        opacity={tone === 'white' ? 0.75 : 1}
      />
      {/* right loop */}
      <path
        className={animate ? 'rb-ring' : undefined}
        d="M17.4 13.6 C 22.8 9.6, 28.6 11.2, 28 15.8 C 27.5 19.7, 21.4 19.9, 17.1 16.6"
        stroke={loopStroke}
        strokeWidth={2.6}
        strokeLinecap="round"
        opacity={tone === 'white' ? 0.75 : 1}
      />
      {/* tails */}
      <path
        d="M14.9 16.9 L11.3 26.8 L13.9 23.6"
        stroke={loopStroke}
        strokeWidth={2.2}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={tone === 'white' ? 0.75 : 1}
      />
      <path
        d="M17.1 16.9 L20.7 26.8 L18.1 23.6"
        stroke={loopStroke}
        strokeWidth={2.2}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={tone === 'white' ? 0.75 : 1}
      />
      {/* knot */}
      <circle className={animate ? 'rb-dot' : undefined} cx={16} cy={15.1} r={2.6} fill={knotFill} />
      <defs>
        <linearGradient id={gid} x1="13.4" y1="12.5" x2="18.6" y2="17.7" gradientUnits="userSpaceOnUse">
          <stop stopColor="var(--rb-logo-ink)" />
          <stop offset="1" stopColor="var(--rb-logo-accent)" />
        </linearGradient>
      </defs>
    </svg>
  );
}
