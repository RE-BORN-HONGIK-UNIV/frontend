import { createElement, type ReactNode } from 'react';
import { splitShorthand, type ShorthandProps } from './styleProps';

interface TitleProps extends ShorthandProps {
  order?: 1 | 2 | 3 | 4 | 5 | 6;
  style?: React.CSSProperties;
  className?: string;
  children?: ReactNode;
  [key: string]: unknown;
}

export function Title({ order = 1, style, children, ...rest }: TitleProps) {
  const [elementProps, shorthandStyle] = splitShorthand(rest);
  return createElement(
    `h${order}`,
    {
      ...elementProps,
      style: { margin: 0, fontFamily: 'var(--font-sans)', fontWeight: 700, ...shorthandStyle, ...style },
    },
    children,
  );
}
