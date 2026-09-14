import type { CSSProperties, ReactNode } from 'react';
import { splitShorthand, type ShorthandProps } from './styleProps';
import { RADIUS } from './styleProps';

interface PaperProps extends ShorthandProps {
  radius?: keyof typeof RADIUS;
  withBorder?: boolean;
  onClick?: React.MouseEventHandler;
  style?: CSSProperties;
  className?: string;
  children?: ReactNode;
}

export function Paper({ radius = 'sm', withBorder = false, style, className, children, ...rest }: PaperProps) {
  const [, shorthandStyle] = splitShorthand(rest);
  return (
    <div
      className={className}
      onClick={rest.onClick as React.MouseEventHandler | undefined}
      style={{
        background: 'var(--rb-surface)',
        borderRadius: RADIUS[radius] ?? RADIUS.sm,
        border: withBorder ? '1px solid var(--rb-line)' : undefined,
        ...shorthandStyle,
        ...style,
      }}
    >
      {children}
    </div>
  );
}
