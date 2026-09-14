import type { CSSProperties, ReactNode } from 'react';
import { splitShorthand, type ShorthandProps } from './styleProps';

const TINT: Record<string, { bg: string; fg: string }> = {
  brand: { bg: 'var(--rb-primary-tint)', fg: 'var(--rb-primary-strong)' },
  red: { bg: '#fdecea', fg: '#a32d2d' },
  gray: { bg: 'var(--rb-surface-tint)', fg: 'var(--rb-ink-soft)' },
};

interface AlertProps extends ShorthandProps {
  color?: 'brand' | 'red' | 'gray';
  variant?: 'light' | 'filled';
  style?: CSSProperties;
  children?: ReactNode;
}

export function Alert({ color = 'brand', style, children, ...rest }: AlertProps) {
  const [, shorthandStyle] = splitShorthand(rest);
  const tint = TINT[color] ?? TINT.brand;
  return (
    <div
      role="alert"
      style={{
        background: tint.bg,
        color: tint.fg,
        borderRadius: 10,
        padding: rest.p !== undefined ? undefined : '10px 14px',
        ...shorthandStyle,
        ...style,
      }}
    >
      {children}
    </div>
  );
}
