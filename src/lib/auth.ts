const TOKEN_KEY = 'rb.token';
const NAME_KEY = 'rb.name';
const EMAIL_KEY = 'rb.email';
const GUEST_KEY = 'rb.guest';

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
  signIn(token: string, name: string, email?: string, guest = false) {
    set(TOKEN_KEY, token);
    set(NAME_KEY, name);
    if (email) set(EMAIL_KEY, email);
    else del(EMAIL_KEY);
    if (guest) set(GUEST_KEY, 'true');
    else del(GUEST_KEY);
  },
  signOut() {
    del(TOKEN_KEY);
    del(NAME_KEY);
    del(EMAIL_KEY);
    del(GUEST_KEY);
  },
};
