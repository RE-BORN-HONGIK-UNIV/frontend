import type { CSSProperties, ReactNode } from 'react';

/** Tailwind는 클래스명을 소스 텍스트에서 그대로 찾아 스캔하므로, 아래 맵의 리터럴
 * 문자열들이 실제로 파일 안에 존재해야 빌드에 포함된다 (동적 템플릿 문자열 금지). */
const COL_SPAN: Record<number, string> = {
  1: 'col-span-1', 2: 'col-span-2', 3: 'col-span-3', 4: 'col-span-4',
  5: 'col-span-5', 6: 'col-span-6', 7: 'col-span-7', 8: 'col-span-8',
  9: 'col-span-9', 10: 'col-span-10', 11: 'col-span-11', 12: 'col-span-12',
};
const COL_SPAN_SM: Record<number, string> = {
  1: 'sm:col-span-1', 2: 'sm:col-span-2', 3: 'sm:col-span-3', 4: 'sm:col-span-4',
  6: 'sm:col-span-6', 12: 'sm:col-span-12',
};
const COL_SPAN_MD: Record<number, string> = {
  4: 'md:col-span-4', 6: 'md:col-span-6', 8: 'md:col-span-8', 12: 'md:col-span-12',
};

interface GridProps {
  gutter?: number;
  style?: CSSProperties;
  children?: ReactNode;
}

export function Grid({ gutter = 16, style, children }: GridProps) {
  return (
    <div
      className="grid grid-cols-12"
      style={{ columnGap: gutter, rowGap: gutter, ...style }}
    >
      {children}
    </div>
  );
}

interface ColSpanResponsive {
  base: number;
  sm?: number;
  md?: number;
}

Grid.Col = function GridCol({ span, children }: { span: number | ColSpanResponsive; children?: ReactNode }) {
  const s: ColSpanResponsive = typeof span === 'number' ? { base: span } : span;
  const className = [
    COL_SPAN[s.base],
    s.sm !== undefined ? COL_SPAN_SM[s.sm] : undefined,
    s.md !== undefined ? COL_SPAN_MD[s.md] : undefined,
  ]
    .filter(Boolean)
    .join(' ');
  return <div className={className}>{children}</div>;
};
