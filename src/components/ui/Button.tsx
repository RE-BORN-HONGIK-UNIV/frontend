import { createElement, type ElementType, type ReactNode } from 'react';
import { Loader } from './Loader';
import { RADIUS, COLOR } from './styleProps';

interface ButtonProps {
  component?: ElementType;
  to?: string;
  type?: 'button' | 'submit' | 'reset';
  color?: 'brand' | 'red' | 'gray';
  variant?: 'filled' | 'outline' | 'subtle' | 'default' | 'light';
  radius?: keyof typeof RADIUS;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'compact-xs';
  loading?: boolean;
  fullWidth?: boolean;
  disabled?: boolean;
  onClick?: React.MouseEventHandler;
  mt?: number;
  mb?: number;
  style?: React.CSSProperties;
  styles?: { root?: React.CSSProperties };
  className?: string;
  children?: ReactNode;
  [key: string]: unknown;
}

const SIZE_PADDING: Record<string, string> = {
  xs: '6px 14px', sm: '9px 18px', md: '11px 22px', lg: '14px 28px', 'compact-xs': '3px 8px',
};
const SIZE_FONT: Record<string, number> = { xs: 12, sm: 13, md: 14, lg: 16, 'compact-xs': 11 };

export function Button({
  component = 'button', type = 'button', color = 'brand', variant = 'filled', radius = 'md',
  size = 'md', loading = false, fullWidth = false, disabled = false, mt, mb, style, styles, children, ...rest
}: ButtonProps) {
  const base = COLOR[color] ?? COLOR.brand;
  const variantStyle: React.CSSProperties =
    variant === 'outline'
      ? { background: 'transparent', color: base, border: `1.5px solid ${base}` }
      : variant === 'subtle'
        ? { background: 'transparent', color: base, border: 'none' }
        : variant === 'light'
          ? { background: 'var(--rb-primary-tint)', color: 'var(--rb-primary-strong)', border: 'none' }
          : variant === 'default'
            ? { background: 'var(--rb-surface)', color: 'var(--rb-ink)', border: '1px solid var(--rb-line-strong)' }
            : { background: base, color: '#fff', border: 'none' };

  return createElement(
    component,
    {
      type: component === 'button' ? type : undefined,
      disabled: disabled || loading,
      onClick: rest.onClick,
      to: rest.to,
      className: rest.className,
      style: {
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        width: fullWidth ? '100%' : undefined,
        marginTop: mt,
        marginBottom: mb,
        padding: SIZE_PADDING[size],
        fontSize: SIZE_FONT[size],
        fontWeight: 600,
        borderRadius: RADIUS[radius] ?? RADIUS.md,
        cursor: disabled || loading ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        transition: 'opacity 120ms ease, transform 120ms ease',
        ...variantStyle,
        ...styles?.root,
        ...style,
      },
    },
    loading ? <Loader size="xs" color={variant === 'filled' ? 'white' : 'brand'} /> : null,
    children,
  );
}
