import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { login } from '../utils/auth';

export default function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('이메일과 비밀번호를 입력해주세요.');
      return;
    }
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="login-card">
      <div className="login-logo">
        <span className="login-logo-badge">🌱</span>
        <h1>Re-born</h1>
        <p>비언어적 능력 재활 트레이닝</p>
      </div>

      <form onSubmit={handleSubmit}>
        <label>이메일</label>
        <input type="email" placeholder="name@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />

        <label>비밀번호</label>
        <input type="password" placeholder="비밀번호 입력" value={password} onChange={(e) => setPassword(e.target.value)} />

        {error && <p className="login-error">{error}</p>}

        <button type="submit">로그인</button>
      </form>

      <p className="login-footer">
        계정이 없으신가요? <Link to="/signup">회원가입</Link>
      </p>
    </div>
  );
}