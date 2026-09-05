import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { signup } from '../utils/auth';
import './Login.css';

export default function Signup() {
  const [name, setName] = useState('');
  const [nickname, setNickname] = useState('');
const [birthYear, setBirthYear] = useState('');
const [birthMonth, setBirthMonth] = useState('');
const [birthDay, setBirthDay] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [termsAgreed, setTermsAgreed] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

const handleSubmit = async (e) => {
  e.preventDefault();
  if (!name || !email || !password || !confirm || !birthYear || !birthMonth || !birthDay) {
    setError('필수 항목을 모두 입력해주세요.');
    return;
  }
  if (password !== confirm) {
    setError('비밀번호가 일치하지 않습니다.');
    return;
  }
  if (!termsAgreed) {
    setError('이용약관에 동의해주세요.');
    return;
  }

  const birthdate = `${birthYear}-${birthMonth.padStart(2, '0')}-${birthDay.padStart(2, '0')}`;

  try {
    await signup(email, password, name, nickname, birthdate, termsAgreed);
    navigate('/login');
  } catch (err) {
    setError(err.message);
  }
};

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">
          <span className="login-logo-badge">🌱</span>
          <h1>Re-born</h1>
          <p>회원가입</p>
        </div>

        <form onSubmit={handleSubmit}>
          <label>이름</label>
          <input type="text" placeholder="이름 입력" value={name} onChange={(e) => setName(e.target.value)} />

          <label>닉네임 <span style={{ color: '#aaa', fontWeight: 400 }}>(선택)</span></label>
          <input type="text" placeholder="서비스에서 사용할 닉네임" value={nickname} onChange={(e) => setNickname(e.target.value)} />

        <label>생년월일</label>
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            <input
    type="text"
    placeholder="YYYY"
    maxLength={4}
    value={birthYear}
    onChange={(e) => setBirthYear(e.target.value.replace(/[^0-9]/g, ''))}
    style={{ flex: 1.2, marginBottom: 0 }}
  />
  <input
    type="text"
    placeholder="MM"
    maxLength={2}
    value={birthMonth}
    onChange={(e) => setBirthMonth(e.target.value.replace(/[^0-9]/g, ''))}
    style={{ flex: 1, marginBottom: 0 }}
  />
  <input
    type="text"
    placeholder="DD"
    maxLength={2}
    value={birthDay}
    onChange={(e) => setBirthDay(e.target.value.replace(/[^0-9]/g, ''))}
    style={{ flex: 1, marginBottom: 0 }}
  />
</div>

          <label>이메일</label>
          <input type="email" placeholder="name@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />

          <label>비밀번호</label>
          <input type="password" placeholder="비밀번호 입력" value={password} onChange={(e) => setPassword(e.target.value)} />

          <label>비밀번호 확인</label>
          <input type="password" placeholder="비밀번호 다시 입력" value={confirm} onChange={(e) => setConfirm(e.target.value)} />

          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginTop: 4 }}>
            <input
              type="checkbox"
              checked={termsAgreed}
              onChange={(e) => setTermsAgreed(e.target.checked)}
              style={{ width: 'auto', height: 'auto', margin: 0 }}
            />
            <span>이용약관 및 개인정보 수집에 동의합니다. (필수)</span>
          </label>

          {error && <p className="login-error">{error}</p>}

          <button type="submit">회원가입</button>
        </form>

        <p className="login-footer">
          이미 계정이 있으신가요? <Link to="/login">로그인</Link>
        </p>
      </div>
    </div>
  );
}