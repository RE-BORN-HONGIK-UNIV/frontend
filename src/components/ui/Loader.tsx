const SIZE: Record<string, number> = { xs: 14, sm: 18, md: 24, lg: 32 };

export function Loader({ size = 'md', color = 'brand' }: { size?: keyof typeof SIZE; color?: 'brand' | 'white' }) {
  const px = SIZE[size] ?? SIZE.md;
  const borderColor = color === 'white' ? 'rgba(255,255,255,0.4)' : 'var(--rb-primary-tint)';
  const topColor = color === 'white' ? '#fff' : 'var(--rb-primary)';
  return (
    <span
      aria-label="로딩 중"
      style={{
        display: 'inline-block',
        width: px,
        height: px,
        borderRadius: '50%',
        border: `2.5px solid ${borderColor}`,
        borderTopColor: topColor,
        animation: 'rb-spin 700ms linear infinite',
      }}
    />
  );
}
