import { IconMoon, IconSun } from './ui';
import { useTheme } from '@/lib/useTheme';

/** 모든 페이지에 뜨는 다크모드 토글 — RootLayout에서 한 번만 렌더링.
 * 우상단은 PageHeader의 로그아웃 링크와 겹칠 수 있어서 우하단 고정으로 뺌. */
export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? '라이트 모드로 전환' : '다크 모드로 전환'}
      style={{
        position: 'fixed',
        right: 20,
        bottom: 20,
        zIndex: 40,
        width: 40,
        height: 40,
        borderRadius: '50%',
        border: '1px solid var(--rb-line)',
        background: 'var(--rb-surface)',
        color: 'var(--rb-ink-soft)',
        boxShadow: '0 4px 10px rgba(35,40,38,0.12)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
      }}
    >
      {isDark ? <IconSun /> : <IconMoon />}
    </button>
  );
}
