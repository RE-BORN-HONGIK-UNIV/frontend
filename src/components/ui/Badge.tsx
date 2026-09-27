import type { CSSProperties, ReactNode } from 'react';

const TINT: Record<string, { bg: string; fg: string }> = {
  brand: { bg: 'var(--rb-primary-tint)', fg: 'var(--rb-primary-strong)' },
  gray: { bg: 'var(--rb-surface-tint)', fg: 'var(--rb-ink-faint)' },
  amber: { bg: 'var(--rb-amber-tint)', fg: 'var(--rb-amber-strong)' },
};

interface BadgeProps {
  color?: 'brand' | 'gray' | 'amber';
  variant?: 'light' | 'filled';
  size?: 'xs' | 'sm' | 'md';
  style?: CSSProperties;
  styles?: { root?: CSSProperties };
  children?: ReactNode;
}

const SIZE_FONT: Record<string, number> = { xs: 10, sm: 11, md: 12 };

export function Badge({ color = 'brand', size = 'sm', style, styles, children }: BadgeProps) {
  const tint = TINT[color] ?? TINT.brand;
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '3px 10px',
        borderRadius: 999,
        fontSize: SIZE_FONT[size],
        fontWeight: 700,
        letterSpacing: '0.02em',
        background: tint.bg,
        color: tint.fg,
        ...styles?.root,
        ...style,
      }}
    >
      {children}
    </span>
  );
}
