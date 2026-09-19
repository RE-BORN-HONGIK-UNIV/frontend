import { Link } from 'react-router-dom';
import { toast } from '@/lib/toast';
import { COMMUNITY_CATEGORIES } from './categories';

/** 상세 화면(CommunityPostPage)엔 별도 '← 뒤로' 링크가 없어서, 유일하게
 * 실제 게시판인 '자유게시판'은 항상 /community로 가는 링크로 만들어둠 —
 * 목록 화면에서 눌러도 같은 페이지라 자연스럽고, 상세 화면에서 누르면
 * 목록으로 돌아가는 역할을 겸함. */
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
        {COMMUNITY_CATEGORIES.map((c) =>
          c.available ? (
            <Link key={c.id} to="/community" className="rb-community-chip" data-active="true">
              {c.icon}
              {c.label}
            </Link>
          ) : (
            <button
              key={c.id}
              type="button"
              onClick={handleStubClick(c.label)}
              className="rb-community-chip"
              data-active="false"
            >
              {c.icon}
              {c.label}
            </button>
          ),
        )}
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
        {COMMUNITY_CATEGORIES.map((c) =>
          c.available ? (
            <Link key={c.id} to="/community" className="rb-community-item" data-active="true">
              <span className="rb-community-item-icon">{c.icon}</span>
              <span style={{ flex: 1, whiteSpace: 'nowrap' }}>{c.label}</span>
            </Link>
          ) : (
            <button
              key={c.id}
              type="button"
              onClick={handleStubClick(c.label)}
              className="rb-community-item"
              data-active="false"
            >
              <span className="rb-community-item-icon">{c.icon}</span>
              <span style={{ flex: 1, whiteSpace: 'nowrap' }}>{c.label}</span>
              <span className="rb-community-item-badge">준비중</span>
            </button>
          ),
        )}
      </div>
    </nav>
  );
}
