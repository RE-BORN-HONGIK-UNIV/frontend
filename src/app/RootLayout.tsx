import { Outlet, ScrollRestoration } from 'react-router-dom';

/** Wraps every route: restores scroll position on navigation. */
export function RootLayout() {
  return (
    <>
      <ScrollRestoration />
      <Outlet />
    </>
  );
}
