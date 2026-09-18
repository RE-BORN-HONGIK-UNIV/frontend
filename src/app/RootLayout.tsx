import { Outlet, ScrollRestoration, useLocation } from 'react-router-dom';
import { ThemeToggle } from '@/components/ThemeToggle';

/** Wraps every route: restores scroll position + fades/slides the new page in on navigation. */
export function RootLayout() {
  const { pathname } = useLocation();
  return (
    <>
      <ScrollRestoration />
      <div key={pathname} className="rb-page-enter">
        <Outlet />
      </div>
      <ThemeToggle />
    </>
  );
}
