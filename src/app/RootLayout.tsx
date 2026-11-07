import { Outlet, ScrollRestoration, useLocation } from 'react-router-dom';
import { ThemeToggle } from '@/components/ThemeToggle';
import { TopProgress } from '@/components/TopProgress';

/** Wraps every route: restores scroll position, top progress bar, page transition (navTransition.ts —
 * View Transitions가 있으면 그쪽이 크로스페이드·슬라이드를 하고, 없으면 .rb-page-enter 페이드인). */
export function RootLayout() {
  const { pathname } = useLocation();
  return (
    <>
      <ScrollRestoration />
      <TopProgress />
      <div key={pathname} className="rb-page-enter">
        <Outlet />
      </div>
      <ThemeToggle />
    </>
  );
}
