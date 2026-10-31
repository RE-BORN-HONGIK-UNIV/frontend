/**
 * 말하기 습관 오각형 — 경량 웹 ui.tsx의 Pentagon을 옮기고 색을 디자인 토큰으로 바꿨다(다크 모드 대응).
 * v: 축 5개의 0~1 값. 숫자는 그리지 않고 모양만 보여 준다(점수 숫자를 보이지 않는 리포트 원칙).
 */
export function Pentagon({ v, size = 260, labels }: { v: number[]; size?: number; labels: string[] }) {
  const xy = (k: number, s: number) => {
    const a = ((-90 + 72 * k) * Math.PI) / 180;
    return [100 + 72 * s * Math.cos(a), 100 + 72 * s * Math.sin(a)];
  };
  const pts = (f: (k: number) => number) =>
    v.map((_, k) => xy(k, f(k)).map((n) => n.toFixed(1)).join(',')).join(' ');
  return (
    <svg viewBox="-40 -12 280 224" width={size} height={size} role="img" aria-label={`말하기 습관 다섯 가지 모양: ${labels.join(', ')}`}>
      {[1, 0.66, 0.33].map((s) => (
        <polygon key={s} points={pts(() => s)} fill="none" stroke="var(--rb-line)" />
      ))}
      <polygon points={pts((k) => v[k])} fill="color-mix(in srgb, var(--rb-primary) 20%, transparent)" stroke="var(--rb-primary)" strokeWidth="2.5" />
      {v.map((s, k) => {
        const [x, y] = xy(k, s);
        return <circle key={k} cx={x} cy={y} r="3.5" fill="var(--rb-primary)" />;
      })}
      {labels.map((t, k) => {
        const [x, y] = xy(k, 1.2);
        return (
          <text key={t} x={x} y={y + 4} fontSize="13" fontWeight="600" fill="var(--rb-ink-soft)" textAnchor={k === 0 ? 'middle' : k < 3 ? 'start' : 'end'}>
            {t}
          </text>
        );
      })}
    </svg>
  );
}
