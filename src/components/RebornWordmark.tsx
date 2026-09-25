import { RebornMark } from './RebornMark';

/**
 * "ReBorn" 워드마크 + 리본 심볼(2026-09-25 로고 리디자인 레퍼런스 기준).
 * 필기체(Playball)로 쓴 "ReBorn" 끝에 작은 리본 마크를 꼬리처럼 붙여 배치 —
 * Re-born과 ribbon의 발음 유사성에서 착안한 구성(자세한 의미는 RebornMark
 * 주석 참고). 리본은 레퍼런스처럼 글자보다 한참 작게(size의 0.62배 →
 * 0.32배) 끝에 바짝 붙여서(gap 축소, 음수 margin으로 겹침) 독립된 아이콘이
 * 아니라 "n" 뒤에 달린 꼬리표처럼 보이게 했다.
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
        alignItems: 'flex-end',
        gap: 0,
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
        ReBorn
      </span>
      <span style={{ marginLeft: -size * 0.03, marginBottom: size * 0.14 }}>
        <RebornMark size={size * 0.32} tone={onGradient ? 'white' : 'accent'} animate={animate} />
      </span>
    </span>
  );
}
