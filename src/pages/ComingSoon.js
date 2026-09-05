import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function ComingSoon({ title, subtitle }) {
  const navigate = useNavigate();

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <div style={styles.header}>
          <div style={styles.badge}>준비 중</div>
          <h1 style={styles.h1}>{title}</h1>
          <p style={styles.headerSub}>{subtitle}</p>
        </div>

        <div style={styles.body}>
          <div style={styles.card}>
            <div style={styles.icon}>🚧</div>
            <div style={styles.text}>이 단계는 아직 개발 중입니다.</div>
            <button style={styles.backBtn} onClick={() => navigate('/dashboard')}>
              ← 홈으로 돌아가기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: '100vh',
    background: 'linear-gradient(160deg,#F2FAE6 0%,#E8F8F0 100%)',
    fontFamily: '"Noto Sans KR",sans-serif',
    paddingBottom: 60,
  },
  container: { maxWidth: 700, margin: '0 auto' },
  header: {
    background: 'linear-gradient(135deg,#1E8A57 0%,#3FBB7F 60%,#8BC34A 100%)',
    padding: '2rem 2rem 1.6rem',
    borderRadius: '0 0 24px 24px',
    marginBottom: 8,
  },
  badge: {
    display: 'inline-block',
    background: 'rgba(255,255,255,0.2)',
    color: '#fff', fontSize: 11, fontWeight: 500,
    padding: '3px 12px', borderRadius: 20,
    marginBottom: 10, letterSpacing: '0.5px',
  },
  h1: {
    fontFamily: '"Gowun Dodum",serif',
    fontSize: 28, fontWeight: 400,
    color: '#fff', margin: 0, lineHeight: 1.3,
  },
  headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.75)', marginTop: 6 },
  body: { padding: '0 1rem' },
  card: {
    background: '#fff',
    border: '1px solid rgba(63,187,127,0.25)',
    borderRadius: 16, padding: '3rem 1.5rem',
    textAlign: 'center',
    marginTop: '1.4rem',
    boxShadow: '0 2px 12px rgba(30,138,87,0.06)',
  },
  icon: { fontSize: 48, marginBottom: 16 },
  text: { fontSize: 15, color: '#666', marginBottom: 20 },
  backBtn: {
    background: 'linear-gradient(135deg,#1E8A57,#3FBB7F)',
    color: '#fff', border: 'none', borderRadius: 10,
    padding: '12px 24px', fontSize: 14, fontWeight: 500,
    fontFamily: '"Noto Sans KR",sans-serif',
    cursor: 'pointer',
  },
};
