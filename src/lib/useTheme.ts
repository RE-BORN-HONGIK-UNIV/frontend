import { useEffect, useState } from 'react';
import { applyTheme, getInitialTheme, persistTheme, type Theme } from './theme';

/** index.html의 인라인 스크립트가 첫 페인트 전에 data-theme을 이미 세팅해두므로,
 * 여기서는 그 값을 읽어와 React state와 동기화만 함(깜빡임 없음). */
export function useTheme() {
  const [theme, setTheme] = useState<Theme>(getInitialTheme);

  useEffect(() => {
    applyTheme(theme);
    persistTheme(theme);
  }, [theme]);

  const toggleTheme = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'));

  return { theme, toggleTheme };
}
