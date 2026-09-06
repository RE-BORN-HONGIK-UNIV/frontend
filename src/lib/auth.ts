const TOKEN_KEY = 'rb.token';
const NAME_KEY = 'rb.name';
const EMAIL_KEY = 'rb.email';

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
  signIn(token: string, name: string, email?: string) {
    set(TOKEN_KEY, token);
    set(NAME_KEY, name);
    if (email) set(EMAIL_KEY, email);
  },
  signOut() {
    del(TOKEN_KEY);
    del(NAME_KEY);
    del(EMAIL_KEY);
  },
};
