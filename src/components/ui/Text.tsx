import { createElement, type ElementType, type ReactNode } from 'react';
import { splitShorthand, type ShorthandProps } from './styleProps';

interface TextProps extends ShorthandProps {
  component?: ElementType;
  style?: React.CSSProperties;
  className?: string;
  children?: ReactNode;
  [key: string]: unknown;
}

export function Text({ component = 'p', style, children, ...rest }: TextProps) {
  const [elementProps, shorthandStyle] = splitShorthand(rest);
  return createElement(
    component,
    { ...elementProps, style: { margin: 0, ...shorthandStyle, ...style } },
    children,
  );
}
