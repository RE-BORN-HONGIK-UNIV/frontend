import type { CSSProperties } from 'react';

/** Mantine에서 쓰던 숏핸드 props를 style 객체로 변환.
 * 값 자체(픽셀 숫자, 색상 CSS var 문자열)는 원본 그대로 유지 —
 * Tailwind 고정 스케일에 억지로 맞추지 않고 기존 디자인을 그대로 보존. */
export interface ShorthandProps {
  fz?: number | string;
  fw?: number | string;
  c?: string;
  ta?: CSSProperties['textAlign'];
  mt?: number | string;
  mb?: number | string;
  ml?: number | string;
  mr?: number | string;
  m?: number | string;
  p?: number | string;
  px?: number | string;
  py?: number | string;
  pt?: number | string;
  pb?: number | string;
  w?: number | string;
  h?: number | string;
  lineClamp?: number;
  display?: CSSProperties['display'];
}

/** Mantine spacing 토큰(xs/sm/md/lg/xl)도 그대로 들어올 수 있어서 픽셀로 매핑 */
const SPACING_TOKEN: Record<string, string> = {
  xs: '8px', sm: '12px', md: '16px', lg: '24px', xl: '32px',
};
const px = (v: number | string | undefined) => {
  if (typeof v === 'number') return `${v}px`;
  if (v !== undefined && v in SPACING_TOKEN) return SPACING_TOKEN[v];
  return v;
};

export function shorthandToStyle(props: ShorthandProps): CSSProperties {
  const style: CSSProperties = {};
  if (props.fz !== undefined) style.fontSize = px(props.fz);
  if (props.fw !== undefined) style.fontWeight = props.fw as CSSProperties['fontWeight'];
  if (props.c !== undefined) style.color = props.c;
  if (props.ta !== undefined) style.textAlign = props.ta;
  if (props.mt !== undefined) style.marginTop = px(props.mt);
  if (props.mb !== undefined) style.marginBottom = px(props.mb);
  if (props.ml !== undefined) style.marginLeft = px(props.ml);
  if (props.mr !== undefined) style.marginRight = px(props.mr);
  if (props.m !== undefined) style.margin = px(props.m);
  if (props.p !== undefined) style.padding = px(props.p);
  if (props.px !== undefined) {
    style.paddingLeft = px(props.px);
    style.paddingRight = px(props.px);
  }
  if (props.py !== undefined) {
    style.paddingTop = px(props.py);
    style.paddingBottom = px(props.py);
  }
  if (props.pt !== undefined) style.paddingTop = px(props.pt);
  if (props.pb !== undefined) style.paddingBottom = px(props.pb);
  if (props.w !== undefined) style.width = px(props.w);
  if (props.h !== undefined) style.height = px(props.h);
  if (props.display !== undefined) style.display = props.display;
  if (props.lineClamp !== undefined) {
    style.display = '-webkit-box';
    style.WebkitLineClamp = props.lineClamp;
    style.WebkitBoxOrient = 'vertical';
    style.overflow = 'hidden';
  }
  return style;
}

export const SHORTHAND_KEYS = [
  'fz', 'fw', 'c', 'ta', 'mt', 'mb', 'ml', 'mr', 'm', 'p', 'px', 'py', 'pt', 'pb', 'w', 'h', 'lineClamp', 'display',
] as const;

/** props에서 숏핸드 키를 분리해 [나머지 props, style]로 반환. */
export function splitShorthand<T extends ShorthandProps>(
  props: T,
): [Omit<T, keyof ShorthandProps>, CSSProperties] {
  const style = shorthandToStyle(props);
  const rest = { ...props } as Record<string, unknown>;
  for (const key of SHORTHAND_KEYS) delete rest[key];
  return [rest as Omit<T, keyof ShorthandProps>, style];
}

export const RADIUS: Record<string, string> = {
  xs: '6px', sm: '10px', md: '16px', lg: '24px', xl: '32px',
};

export const COLOR: Record<string, string> = {
  brand: 'var(--rb-primary)',
  red: '#c0392b',
  gray: 'var(--rb-ink-faint)',
};
