import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { auth } from '@/lib/auth';

export function PrivateRoute({ children }: { children: ReactNode }) {
  const location = useLocation();
  return auth.isAuthed() ? (
    <>{children}</>
  ) : (
    <Navigate to="/login" replace state={{ from: location.pathname }} />
  );
}
