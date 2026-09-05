import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';

const AXIS_INFO = {
  stability:  { label: '음성 안정성', desc: '음성 떨림·에너지 변동 안정도' },
  fluency:    { label: '발화 유창성', desc: '채움말 없이 자연스러운 발화' },
  pause_ctrl: { label: '침묵 조절력', desc: '무음 구간 적절성' },
  continuity: { label: '발화 지속성', desc: '연장음 없이 적절한 속도 유지' },
  calm:       { label: '발화 에너지', desc: '종합 불안 역산 지수' },
};

const PLACEHOLDER_TRAININGS = [
  { id: 1, name: '훈련 A (임시)' },
  { id: 2, name: '훈련 B (임시)' },
  { id: 3, name: '훈련 C (임시)' },
  { id: 4, name: '훈련 D (임시)' },
  { id: 5, name: '훈련 E (임시)' },
];

export default function TrainingGuide() {
  const { axisKey } = useParams();
  const navigate = useNavigate();
  const axis = AXIS_INFO[axisKey];

  if (!axis) {
    return (
      <div style={styles.page}>
        <div style={styles.container}>
          <p>존재하지 않는 지표입니다.</p>
          <button onClick={() => navigate('/voice')} style={styles.backBtn}>← 돌아가기</button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <button onClick={() => navigate('/voice')} style={styles.backBtn}>← 결과로 돌아가기</button>

        <div style={styles.header}>
          <div style={styles.badge}>재활 가이드</div>
          <h1 style={styles.h1}>{axis.label}</h1>
          <p style={styles.headerSub}>{axis.desc}</p>
        </div>

        <div style={styles.sectionLabel}>추천 훈련 5가지</div>
        {PLACEHOLDER_TRAININGS.map((t) => (
          <div
            key={t.id}
            style={styles.trainingCard}
            onClick={() => navigate(`/voice/training/${axisKey}/${t.id}`)}
          >
            <div style={styles.trainingIcon}>{t.id}</div>
            <div style={styles.trainingContent}>
              <div style={styles.trainingName}>{t.name}</div>
              <div style={styles.trainingDesc}>내용 준비 중</div>
            </div>
            <div style={styles.trainingArrow}>→</div>
          </div>
        ))}
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: '100vh',
    background: 'linear-gradient(160deg,#FBFAFE 0%,#F7F4FC 100%)',
    fontFamily: '"Noto Sans KR",sans-serif',
    paddingBottom: 60,
  },
  container: { maxWidth: 700, margin: '0 auto', padding: '2rem 1rem' },
  backBtn: {
    background: 'none', border: '1px solid #D9CCEF',
    borderRadius: 20, padding: '6px 14px',
    fontSize: 12, fontWeight: 500, color: '#7C6FA8',
    cursor: 'pointer', marginBottom: 16,
    fontFamily: '"Noto Sans KR",sans-serif',
  },
  header: { marginBottom: 24 },
  badge: {
    display: 'inline-block',
    background: '#F7F4FC', color: '#7C6FA8',
    fontSize: 12, fontWeight: 500,
    padding: '3px 12px', borderRadius: 20,
    marginBottom: 10,
  },
  h1: { fontSize: 26, fontWeight: 700, color: '#1a1a1a', margin: '0 0 6px' },
  headerSub: { fontSize: 14, color: '#888', margin: 0 },
  sectionLabel: {
    fontSize: 13, fontWeight: 600, letterSpacing: '1px',
    color: '#7C6FA8', textTransform: 'uppercase',
    margin: '0 0 12px',
  },
  trainingCard: {
    display: 'flex', alignItems: 'center', gap: 16,
    background: '#fff',
    border: '1px solid rgba(169,143,217,0.25)',
    borderRadius: 16, padding: '1rem 1.25rem',
    marginBottom: 12,
    boxShadow: '0 2px 12px rgba(124,111,168,0.06)',
    cursor: 'pointer',
  },
  trainingIcon: {
    width: 40, height: 40, borderRadius: '50%',
    background: '#F7F4FC', color: '#7C6FA8',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontWeight: 700, flexShrink: 0,
  },
  trainingContent: { flex: 1 },
  trainingName: { fontSize: 15, fontWeight: 600, color: '#1a1a1a' },
  trainingDesc: { fontSize: 12, color: '#aaa', marginTop: 2 },
  trainingArrow: { color: '#A98FD9', fontSize: 18, fontWeight: 700 },
};