import { RebornMark } from './RebornMark';

/**
 * "Re-born" 워드마크 + 리본 심볼.
 * 손글씨체(Caveat)로 쓴 "Re-born" 옆에 리본 마크를 나란히 배치 — Re-born과
 * ribbon의 발음 유사성에서 착안한 구성(자세한 의미는 RebornMark 주석 참고).
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
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: size * 0.06,
      }}
    >
      <span
        style={{
          fontFamily: 'var(--rb-font-logo)',
          fontWeight: 700,
          fontSize: size,
          lineHeight: 1,
          color: onGradient ? '#ffffff' : 'var(--rb-logo-ink)',
        }}
      >
        Re-born
      </span>
      <RebornMark size={size * 0.5} tone={onGradient ? 'white' : 'accent'} animate={animate} />
    </span>
  );
}
