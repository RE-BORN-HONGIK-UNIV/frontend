import type { CSSProperties, ReactNode } from 'react';

const COLS: Record<number, string> = {
  1: 'grid-cols-1', 2: 'grid-cols-2', 3: 'grid-cols-3', 4: 'grid-cols-4', 6: 'grid-cols-6',
};
const COLS_SM: Record<number, string> = {
  1: 'sm:grid-cols-1', 2: 'sm:grid-cols-2', 3: 'sm:grid-cols-3', 4: 'sm:grid-cols-4', 6: 'sm:grid-cols-6',
};
const COLS_MD: Record<number, string> = {
  1: 'md:grid-cols-1', 2: 'md:grid-cols-2', 3: 'md:grid-cols-3', 4: 'md:grid-cols-4', 6: 'md:grid-cols-6',
};

interface SimpleGridProps {
  cols: number | { base: number; sm?: number; md?: number };
  spacing?: number;
  style?: CSSProperties;
  children?: ReactNode;
}

export function SimpleGrid({ cols, spacing = 16, style, children }: SimpleGridProps) {
  const c = typeof cols === 'number' ? { base: cols } : cols;
  const className = [
    'grid',
    COLS[c.base],
    c.sm !== undefined ? COLS_SM[c.sm] : undefined,
    c.md !== undefined ? COLS_MD[c.md] : undefined,
  ]
    .filter(Boolean)
    .join(' ');
  return (
    <div className={className} style={{ gap: spacing, ...style }}>
      {children}
    </div>
  );
}
