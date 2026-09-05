import React from 'react';
import LoginForm from '../components/LoginForm';
import './Landing.css';

export default function Landing() {
  return (
    <div className="landing-page">
      <div className="landing-intro">
        <h1>Re-born</h1>
        <p className="landing-tagline">천천히, 당신의 속도로</p>
        <p className="landing-desc">
          Vision AI 기반 고립·은둔 청년 비언어적 능력 재활 트레이닝
        </p>
      </div>
      <div className="landing-login">
        <LoginForm />
      </div>
    </div>
  );
}