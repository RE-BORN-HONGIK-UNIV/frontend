import { toast } from '@/lib/toast';
import { COMMUNITY_CATEGORIES } from './categories';

export function CommunitySidebar({ variant }: { variant: 'sidebar' | 'chips' }) {
  const handleStubClick = (label: string) => () => toast.info(`${label}은 준비 중이에요.`);

  if (variant === 'chips') {
    return (
      <div
        style={{
          display: 'flex',
          gap: 8,
          overflowX: 'auto',
          width: '100%',
          padding: '2px 2px 4px',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {COMMUNITY_CATEGORIES.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={c.available ? undefined : handleStubClick(c.label)}
            className="rb-community-chip"
            data-active={c.available}
          >
            {c.icon}
            {c.label}
          </button>
        ))}
      </div>
    );
  }

  return (
    <nav className="rb-sidebar-enter" style={{ width: 232, flexShrink: 0 }}>
      <div
        style={{
          background: 'var(--rb-surface)',
          border: '1px solid var(--rb-line)',
          borderRadius: 16,
          padding: 10,
          position: 'sticky',
          top: 24,
        }}
      >
        {COMMUNITY_CATEGORIES.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={c.available ? undefined : handleStubClick(c.label)}
            className="rb-community-item"
            data-active={c.available}
          >
            <span className="rb-community-item-icon">{c.icon}</span>
            <span style={{ flex: 1, whiteSpace: 'nowrap' }}>{c.label}</span>
            {!c.available && <span className="rb-community-item-badge">준비중</span>}
          </button>
        ))}
      </div>
    </nav>
  );
}
