export async function signup(email, password, name, nickname, birthdate, termsAgreed) {
  const res = await fetch('/api/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, name, nickname, birthdate, terms_agreed: termsAgreed }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error);
}

export async function login(email, password) {
  const res = await fetch('/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error);
  localStorage.setItem('token', data.token);
  localStorage.setItem('userName', data.name);
  localStorage.setItem('userEmail', email);
}