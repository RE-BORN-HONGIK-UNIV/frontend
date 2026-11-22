const TOKEN_KEY = 'rb.token';
const NAME_KEY = 'rb.name';
const EMAIL_KEY = 'rb.email';
const GUEST_KEY = 'rb.guest';
const NICK_KEY = 'rb.nick';

function get(k: string) {
  try {
    return localStorage.getItem(k);
  } catch {
    return null;
  }
}
function set(k: string, v: string) {
  try {
    localStorage.setItem(k, v);
  } catch {
    /* private mode — session only */
  }
}
function del(k: string) {
  try {
    localStorage.removeItem(k);
  } catch {
    /* ignore */
  }
}

// 로그인 상태가 바뀌면 알린다 — 머리줄처럼 이미 그려진 화면이 새로고침 없이 바로 바뀌게(useAuthVersion).
// 예전엔 메인 화면에서 로그아웃하면 같은 주소(/)로 가서 화면을 다시 그리지 않아 '이름님 · 로그아웃'이 남았다.
const listeners = new Set<() => void>();
let version = 0;
function changed() {
  version += 1;
  listeners.forEach((l) => l());
}
export function subscribeAuth(listener: () => void) {
  listeners.add(listener);
  // 다른 탭에서 로그인·로그아웃한 것도 반영
  const onStorage = (e: StorageEvent) => {
    if (e.key === null || e.key.startsWith('rb.')) changed();
  };
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', onStorage);
  };
}
export const authVersion = () => version;

export const auth = {
  get token() {
    return get(TOKEN_KEY);
  },
  get name() {
    return get(NAME_KEY) ?? '';
  },
  get email() {
    return get(EMAIL_KEY) ?? '';
  },
  isAuthed() {
    return !!get(TOKEN_KEY);
  },
  /** 로그인 없이 시작한 게스트 — 다시 로그인할 방법이 없어서 "로그아웃" 대신 "로그인"을 보여 준다 */
  get isGuest() {
    return get(GUEST_KEY) === 'true';
  },
  /** 게스트가 아직 불러 줄 이름(닉네임)을 정하지 않음 → NicknameGate가 이름 입력 창을 띄운다 */
  get needsNickname() {
    return get(GUEST_KEY) === 'true' && get(NICK_KEY) !== 'true';
  },
  /** 서버(PUT /api/me/nickname)에 저장한 뒤 화면에 쓸 이름도 바꾼다 */
  setNickname(nickname: string) {
    set(NAME_KEY, nickname);
    set(NICK_KEY, 'true');
    changed();
  },
  signIn(token: string, name: string, email?: string, guest = false) {
    set(TOKEN_KEY, token);
    set(NAME_KEY, name);
    if (email) set(EMAIL_KEY, email);
    else del(EMAIL_KEY);
    if (guest) set(GUEST_KEY, 'true');
    else del(GUEST_KEY);
    del(NICK_KEY);
    changed();
  },
  signOut() {
    del(TOKEN_KEY);
    del(NAME_KEY);
    del(EMAIL_KEY);
    del(GUEST_KEY);
    del(NICK_KEY);
    changed();
  },
};
