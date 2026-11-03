import { useEffect, useState, type ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Box, Loader } from '@/components/ui';
import { auth } from '@/lib/auth';
import { startGuestOnce } from '@/features/auth/mutations';
import { NicknameGate } from '@/features/auth/NicknameGate';

/**
 * 로그인한 사람(또는 게스트)만 들어가는 화면. 로그인하지 않았으면 로그인 화면으로 보내지 않고 게스트로 바로
 * 시작한다 — 로그인 없이도 1~3단계를 시작할 수 있게(팀 요청). 게스트 계정을 못 만들면(서버 꺼짐, 시간당 제한 등)
 * 그때만 로그인 화면으로 보낸다.
 */
export function PrivateRoute({ children }: { children: ReactNode }) {
  const location = useLocation();
  const [state, setState] = useState<'ready' | 'starting' | 'failed'>(auth.isAuthed() ? 'ready' : 'starting');

  useEffect(() => {
    if (state !== 'starting') return;
    let cancelled = false;
    startGuestOnce().then(
      () => !cancelled && setState('ready'),
      () => !cancelled && setState('failed'),
    );
    return () => {
      cancelled = true;
    };
  }, [state]);

  if (state === 'ready') return <NicknameGate>{children}</NicknameGate>;
  if (state === 'failed') return <Navigate to="/login" replace state={{ from: location.pathname, guestFailed: true }} />;
  return (
    <Box style={{ minHeight: '60vh', display: 'grid', placeItems: 'center' }}>
      <Loader />
    </Box>
  );
}
