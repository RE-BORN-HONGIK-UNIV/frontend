import type { CSSProperties, ReactNode } from 'react';
import { splitShorthand, type ShorthandProps } from './styleProps';

interface GroupProps extends ShorthandProps {
  gap?: number | string;
  align?: CSSProperties['alignItems'];
  justify?: CSSProperties['justifyContent'];
  wrap?: CSSProperties['flexWrap'];
  /** Mantine의 visibleFrom="sm" 같은 반응형 숨김 — Tailwind 브레이크포인트 클래스로 매핑 */
  visibleFrom?: 'sm' | 'md' | 'lg' | 'xl';
  style?: CSSProperties;
  className?: string;
  children?: ReactNode;
}

const VISIBLE_FROM_CLASS: Record<string, string> = {
  sm: 'hidden sm:flex',
  md: 'hidden md:flex',
  lg: 'hidden lg:flex',
  xl: 'hidden xl:flex',
};

export function Group({
  gap = 8, align = 'center', justify, wrap = 'wrap', visibleFrom, style, className, children, ...rest
}: GroupProps) {
  const [, shorthandStyle] = splitShorthand(rest);
  const visibleClass = visibleFrom ? VISIBLE_FROM_CLASS[visibleFrom] : undefined;
  return (
    <div
      className={[visibleClass, className].filter(Boolean).join(' ') || undefined}
      style={{
        display: visibleFrom ? undefined : 'flex', // visibleFrom일 땐 클래스(hidden sm:flex)가 display 담당
        flexDirection: 'row',
        gap: typeof gap === 'number' ? `${gap}px` : gap,
        alignItems: align,
        justifyContent: justify,
        flexWrap: wrap,
        ...shorthandStyle,
        ...style,
      }}
    >
      {children}
    </div>
  );
}
