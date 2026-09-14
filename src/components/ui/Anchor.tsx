import { createElement, type ElementType, type ReactNode } from 'react';
import { splitShorthand, type ShorthandProps } from './styleProps';

interface AnchorProps extends ShorthandProps {
  component?: ElementType;
  to?: string;
  href?: string;
  underline?: 'always' | 'hover' | 'never';
  style?: React.CSSProperties;
  className?: string;
  children?: ReactNode;
  [key: string]: unknown;
}

export function Anchor({ component, underline = 'hover', style, children, ...rest }: AnchorProps) {
  const [elementProps, shorthandStyle] = splitShorthand(rest);
  const tag: ElementType = component ?? 'a';
  return createElement(
    tag,
    {
      ...elementProps,
      style: {
        cursor: 'pointer',
        textDecoration: underline === 'always' ? 'underline' : 'none',
        ...shorthandStyle,
        ...style,
      },
      onMouseEnter:
        underline === 'hover'
          ? (e: React.MouseEvent<HTMLElement>) => { (e.currentTarget as HTMLElement).style.textDecoration = 'underline'; }
          : undefined,
      onMouseLeave:
        underline === 'hover'
          ? (e: React.MouseEvent<HTMLElement>) => { (e.currentTarget as HTMLElement).style.textDecoration = 'none'; }
          : undefined,
    },
    children,
  );
}
