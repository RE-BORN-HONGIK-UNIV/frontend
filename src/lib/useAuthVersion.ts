import { useSyncExternalStore } from 'react';
import { authVersion, subscribeAuth } from './auth';

/** 로그인·로그아웃·닉네임 변경 때마다 바뀌는 숫자 — 부르는 컴포넌트를 다시 그리게 한다(auth 값은 그대로 auth.xxx로 읽음) */
export function useAuthVersion(): number {
  return useSyncExternalStore(subscribeAuth, authVersion, authVersion);
}
