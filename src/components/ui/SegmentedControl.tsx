interface SegmentedControlProps {
  value: string;
  onChange: (value: string) => void;
  data: { label: string; value: string }[];
  fullWidth?: boolean;
}

export function SegmentedControl({ value, onChange, data, fullWidth }: SegmentedControlProps) {
  return (
    <div
      role="tablist"
      style={{
        display: 'flex',
        width: fullWidth ? '100%' : undefined,
        background: 'var(--rb-bg)',
        border: '1px solid var(--rb-line)',
        borderRadius: 10,
        padding: 3,
        gap: 2,
      }}
    >
      {data.map((item) => {
        const active = item.value === value;
        return (
          <button
            key={item.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(item.value)}
            style={{
              flex: 1,
              padding: '7px 10px',
              fontSize: 13,
              fontWeight: 600,
              border: 'none',
              borderRadius: 8,
              cursor: 'pointer',
              background: active ? 'var(--rb-surface)' : 'transparent',
              color: active ? 'var(--rb-primary-strong)' : 'var(--rb-ink-soft)',
              boxShadow: active ? '0 1px 3px rgba(35,40,38,0.12)' : 'none',
              transition: 'background 120ms ease, color 120ms ease',
            }}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
