import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useIsFetching } from '@tanstack/react-query';

/**
 * 화면이 바뀔 때 맨 위에 차오르는 얇은 초록 막대 — 2026-11.
 * 화면이 바뀌면 85%까지 천천히 차오르고, 새 화면이 서버에서 불러오는 게(react-query) 끝나면 100%를 채우고 사라진다.
 * 너무 빨리 끝나 깜빡이기만 하지 않게 최소 0.35초는 보여 준다. 처음 열 때는 안 띄운다.
 */
const MIN_VISIBLE_MS = 350;

export function TopProgress() {
  const { pathname } = useLocation();
  const fetching = useIsFetching();
  const [state, setState] = useState<'idle' | 'run' | 'done'>('idle');
  const startedAt = useRef(0);
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    startedAt.current = Date.now();
    setState('run');
  }, [pathname]);

  useEffect(() => {
    if (state !== 'run' || fetching > 0) return;
    const t = setTimeout(() => setState('done'), Math.max(0, MIN_VISIBLE_MS - (Date.now() - startedAt.current)));
    return () => clearTimeout(t);
  }, [state, fetching]);

  useEffect(() => {
    if (state !== 'done') return;
    const t = setTimeout(() => setState('idle'), 450);
    return () => clearTimeout(t);
  }, [state]);

  return <div className="rb-topbar" data-state={state} aria-hidden />;
}
