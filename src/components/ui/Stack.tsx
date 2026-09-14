import type { CSSProperties, ReactNode } from 'react';
import { splitShorthand, type ShorthandProps } from './styleProps';

interface StackProps extends ShorthandProps {
  gap?: number | string;
  align?: CSSProperties['alignItems'];
  justify?: CSSProperties['justifyContent'];
  style?: CSSProperties;
  className?: string;
  children?: ReactNode;
}

export function Stack({ gap = 0, align, justify, style, className, children, ...rest }: StackProps) {
  const [, shorthandStyle] = splitShorthand(rest);
  return (
    <div
      className={className}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: typeof gap === 'number' ? `${gap}px` : gap,
        alignItems: align,
        justifyContent: justify,
        ...shorthandStyle,
        ...style,
      }}
    >
      {children}
    </div>
  );
}
