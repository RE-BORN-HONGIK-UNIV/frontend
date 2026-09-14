import { createElement, type ElementType, type ReactNode } from 'react';
import { splitShorthand, type ShorthandProps } from './styleProps';

interface BoxProps extends ShorthandProps {
  component?: ElementType;
  to?: string;
  className?: string;
  style?: React.CSSProperties;
  children?: ReactNode;
  [key: string]: unknown;
}

/** Mantine Box 대체 — 대부분의 기존 코드가 style={{...}} 객체를 그대로 넘기므로
 * 그 패턴을 그대로 지원하고, component/to로 다형성(Link 등)만 얹는다. */
export function Box({ component = 'div', style, children, ...rest }: BoxProps) {
  const [elementProps, shorthandStyle] = splitShorthand(rest);
  return createElement(
    component,
    { ...elementProps, style: { ...shorthandStyle, ...style } },
    children,
  );
}
