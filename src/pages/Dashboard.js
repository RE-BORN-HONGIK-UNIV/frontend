import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import mascot from '../assets/mascot.svg';
import bellIcon from '../assets/bell-icon.svg';
import settingsIcon from '../assets/settings-icon.svg';

function calcStreak() {
  const today = new Date().toDateString();
  const lastVisit = localStorage.getItem('lastVisitDate');
  const prevStreak = parseInt(localStorage.getItem('visitStreak') || '0', 10);

  if (lastVisit === today) {
    return prevStreak || 1;
  }

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  let newStreak = 1;
  if (lastVisit === yesterday.toDateString()) {
    newStreak = prevStreak + 1;
  }

  localStorage.setItem('lastVisitDate', today);
  localStorage.setItem('visitStreak', String(newStreak));
  return newStreak;
}

function daysSince(dateStr) {
  if (!dateStr) return null;
  const diff = Date.now() - new Date(dateStr).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

export default function Dashboard() {
  const navigate = useNavigate();
  const userName = localStorage.getItem('userName') || '회원';
  const userEmail = localStorage.getItem('userEmail') || '';

  const voiceCompleted = localStorage.getItem('voiceStageCompleted') === 'true';
  const voiceScore = localStorage.getItem('voiceStageScore');
  const voiceCompletedAt = localStorage.getItem('voiceStageCompletedAt');

  const [streak, setStreak] = useState(1);

  useEffect(() => {
    setStreak(calcStreak());
  }, []);

  const STAGES = [
    {
      id: 1,
      title: '음성 정밀 진단',
      subtitle: '보이스 터치',
      desc: voiceCompleted
        ? `음성 분석 완료 · 종합 점수 ${voiceScore}점`
        : '음성 파형을 분석해 발화 안정성, 유창성, 침묵 조절력 등을 진단합니다.',
      icon: '🎙️',
      path: '/voice',
      status: voiceCompleted ? 'done' : 'available',
    },
    {
      id: 2,
      title: '표정 분석',
      subtitle: '멀티모달 인터랙션',
      desc: '시선 처리와 표정을 분석해 비언어적 소통 능력을 교정합니다.',
      icon: '🙂',
      path: '/face',
      status: 'locked',
    },
    {
      id: 3,
      title: '실전 모의 면접',
      subtitle: 'Adaptive Interview',
      desc: '앞 단계 결과를 바탕으로 맞춤형 난이도의 모의 면접을 진행합니다.',
      icon: '💼',
      path: '/interview',
      status: 'locked',
    },
  ];

  const completedCount = STAGES.filter(s => s.status === 'done').length;
  const totalCount = STAGES.length;
  const progressPct = Math.round((completedCount / totalCount) * 100);
  const isFirstVisit = completedCount === 0;
  const visitGap = daysSince(voiceCompletedAt);

  const handleReset = () => {
    if (window.confirm('진행 상황을 초기화할까요?')) {
      localStorage.removeItem('voiceStageCompleted');
      localStorage.removeItem('voiceStageScore');
      localStorage.removeItem('voiceStageCompletedAt');
      window.location.reload();
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userName');
    localStorage.removeItem('userEmail');
    navigate('/login');
  };

  return (
    <div style={styles.page}>

      <div style={styles.header}>
        <div style={styles.headerIcons}>
        <button style={styles.iconBtn} aria-label="알림">
          <img src={bellIcon} alt="" style={{ width: 35, height: 35 }} />
      </button>
      <button style={styles.iconBtn} aria-label="설정">
        <img src={settingsIcon} alt="" style={{ width: 35, height: 35 }} />
      </button>
    </div>
        <img src={mascot} alt="" style={styles.mascotImg} />
        <div style={styles.headerInner}>
          <div style={styles.badge}>AI 기반 디지털 재활 솔루션</div>
          <h1 style={styles.h1}>Re-born: 나의 재활 훈련</h1>
          <p style={styles.headerSub}>3단계로 차근차근, 나만의 속도로</p>
        </div>
      </div>

      <div style={styles.container}>
        <div style={styles.body}>
          <div style={styles.gridLayout}>

            <div>
              <div style={styles.progressCard}>
                {isFirstVisit ? (
                  <div style={styles.welcomeBox}>
                    <p style={styles.welcomeTitle}>환영합니다, {userName} 님 🌱</p>
                    <p style={styles.welcomeDesc}>첫 훈련을 시작해보세요. 천천히, 당신의 속도로 진행하면 돼요.</p>
                  </div>
                ) : (
                  <div style={styles.progressTop}>
                    <div>
                      <div style={styles.progressLabel}>진행 현황</div>
                      <div style={styles.progressCount}>
                        {completedCount} <span style={styles.progressTotal}>/ {totalCount} 단계 완료</span>
                      </div>
                    </div>
                    <div style={styles.progressCircle}>
                      <svg width="56" height="56" viewBox="0 0 56 56">
                        <circle cx="28" cy="28" r="24" fill="none" stroke="#F7F4FC" strokeWidth="6" />
                        <circle
                          cx="28" cy="28" r="24" fill="none"
                          stroke="#A98FD9" strokeWidth="6"
                          strokeDasharray={`${2 * Math.PI * 24}`}
                          strokeDashoffset={`${2 * Math.PI * 24 * (1 - progressPct / 100)}`}
                          strokeLinecap="round"
                          transform="rotate(-90 28 28)"
                        />
                      </svg>
                      <span style={styles.progressPctText}>{progressPct}%</span>
                    </div>
                  </div>
                )}

                <div style={styles.progressSteps}>
                  {STAGES.map((s, i) => (
                    <React.Fragment key={s.id}>
                      <div style={styles.progressStepItem}>
                        <div style={{
                          ...styles.progressDot,
                          ...(s.status === 'done' ? styles.progressDotDone : {}),
                          ...(s.status === 'available' ? styles.progressDotActive : {}),
                        }}>
                          {s.status === 'done' ? '✓' : s.id}
                        </div>
                        <span style={styles.progressStepLabel}>{s.title}</span>
                      </div>
                      {i < STAGES.length - 1 && <div style={styles.progressLine} />}
                    </React.Fragment>
                  ))}
                </div>

                <p style={styles.encourageText}>
                  {completedCount === 0
                    ? '천천히, 당신의 속도로 시작해보세요 🌱'
                    : completedCount === totalCount
                      ? '모든 단계를 완료했어요! 정말 잘하셨어요 🎉'
                      : '꾸준히 잘 나아가고 있어요 💪'}
                </p>
              </div>

              <div style={styles.sectionLabel}>훈련 단계</div>

              {!voiceCompleted && (
                <div style={styles.recommendBox}>
                  💡 첫 훈련으로 음성 정밀 진단부터 시작해보세요. 짧게 말해도 충분해요.
                </div>
              )}
              {voiceCompleted && (
                <div style={styles.recommendBox}>
                  💡 지난번 발화 지속성이 낮게 나왔어요. 오늘은 그 부분 훈련부터 이어가볼까요?
                </div>
              )}

              {STAGES.map((stage) => {
                const locked = stage.status === 'locked';
                return (
                  <div
                    key={stage.id}
                    style={{
                      ...styles.stageCard,
                      ...(locked ? styles.stageCardLocked : {}),
                    }}
                    onClick={() => !locked && navigate(stage.path)}
                  >
                    <div style={styles.stageIconWrap}>
                      <span style={styles.stageIcon}>{stage.icon}</span>
                    </div>
                    <div style={styles.stageContent}>
                      <div style={styles.stageTopRow}>
                        <span style={styles.stageNumber}>STEP {stage.id}</span>
                        {locked && <span style={styles.lockBadge}>준비 중</span>}
                        {stage.status === 'done' && <span style={styles.doneBadge}>완료 ✓</span>}
                      </div>
                      <div style={styles.stageTitle}>{stage.title}</div>
                      <div style={styles.stageSubtitle}>{stage.subtitle}</div>
                      <p style={styles.stageDesc}>{stage.desc}</p>
                    </div>
                    <div style={styles.stageArrow}>
                      {locked ? '🔒' : '→'}
                    </div>
                  </div>
                );
              })}

              <button onClick={handleReset} style={styles.resetBtn}>
                ↺ 진행 상황 초기화
              </button>
            </div>

            <div>
              <div style={styles.profileCard}>
                <div style={styles.profileRow}>
                  <div style={styles.avatar}>{userName.charAt(0)}</div>
                  <div>
                    <p style={styles.profileName}>{userName} 님</p>
                    <p style={styles.profileEmail}>{userEmail}</p>
                  </div>
                </div>
                <button style={styles.mypageBtn} onClick={() => navigate('/mypage')}>
                  마이페이지
                </button>
                <button style={styles.logoutBtn} onClick={handleLogout}>
                  로그아웃
                </button>
              </div>

              <div style={styles.sidebarCard}>
                <p style={styles.sidebarLabel}>연속 방문</p>
                <p style={styles.streakText}>🔥 {streak}일 연속 방문 중</p>
              </div>

              <div style={{ ...styles.sidebarCard, marginTop: 16 }}>
                <p style={styles.sidebarLabel}>최근 활동</p>
                {voiceCompleted ? (
                  <p style={styles.sidebarEmpty}>
                    {visitGap !== null && visitGap > 0 ? `지난 방문: ${visitGap}일 전 · ` : ''}
                    종합 점수 {voiceScore}점
                  </p>
                ) : (
                  <p style={styles.sidebarEmpty}>아직 완료한 훈련이 없어요. 첫 훈련을 시작하면 여기에 기록이 쌓여요.</p>
                )}
              </div>
            </div>

          </div>
        </div>
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

  header: {
  width: '100%',
  position: 'relative',
  overflow: 'hidden',
  background: 'linear-gradient(135deg,#7C6FA8 0%,#A98FD9 60%,#C9B8E9 100%)',
  padding: '2.5rem 0 2rem',
  },
  headerInner: {
    maxWidth: 1400,
    margin: '0 auto',
    padding: '0 2rem',
  },
  mascotImg: {
  position: 'absolute',
  right: 140,
  bottom: -10,
  width: 220,
  height: 'auto',
  opacity: 0.95,
  },
  headerIcons: {
  position: 'absolute', top: 20, right: 32,
  display: 'flex', gap: 10, zIndex: 2,
  },
  iconBtn: {
  width: 40, height: 40,
  background: 'none', border: 'none',
  cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
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
    fontSize: 30, fontWeight: 700,
    color: '#fff', margin: 0, lineHeight: 1.3,
  },
  headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.85)', marginTop: 8, lineHeight: 1.6 },

  container: { maxWidth: 1400, margin: '0 auto', paddingTop: 8 },
  body: { padding: '0 2rem' },

  gridLayout: {
    display: 'grid',
    gridTemplateColumns: '1fr 300px',
    gap: 24,
    alignItems: 'start',
    marginTop: '1.2rem',
  },

  welcomeBox: { marginBottom: 16 },
  welcomeTitle: { fontSize: 18, fontWeight: 700, color: '#1a1a1a', margin: '0 0 6px' },
  welcomeDesc: { fontSize: 13, color: '#666', margin: 0, lineHeight: 1.6 },

  recommendBox: {
    background: '#F7F4FC',
    border: '1px solid rgba(169,143,217,0.25)',
    borderRadius: 12,
    padding: '12px 16px',
    fontSize: 13,
    color: '#5B4B92',
    marginBottom: 14,
    lineHeight: 1.6,
  },

  profileCard: {
    background: '#fff',
    border: '1px solid rgba(169,143,217,0.25)',
    borderRadius: 16,
    padding: '1.25rem',
    marginBottom: 16,
    boxShadow: '0 2px 12px rgba(124,111,168,0.06)',
  },
  profileRow: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 },
  avatar: {
    width: 40, height: 40, borderRadius: '50%',
    background: '#F7F4FC', color: '#7C6FA8',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontWeight: 700, fontSize: 15, flexShrink: 0,
  },
  profileName: { fontSize: 15, fontWeight: 700, color: '#1a1a1a', margin: 0 },
  profileEmail: { fontSize: 12, color: '#888', margin: 0 },
  mypageBtn: {
    display: 'block', width: '100%',
    background: '#7C6FA8', color: '#fff',
    border: 'none', borderRadius: 10, padding: '10px',
    fontSize: 13, fontWeight: 500, cursor: 'pointer',
    marginBottom: 8,
  },
  logoutBtn: {
    display: 'block', width: '100%',
    background: 'none', border: '1px solid #ddd',
    borderRadius: 10, padding: '10px',
    fontSize: 13, color: '#888', cursor: 'pointer',
  },

  sidebarCard: {
    background: '#fff',
    border: '1px solid rgba(169,143,217,0.25)',
    borderRadius: 16,
    padding: '1.25rem',
    boxShadow: '0 2px 12px rgba(124,111,168,0.06)',
  },
  sidebarLabel: {
    fontSize: 11, fontWeight: 600, letterSpacing: '1px',
    color: '#7C6FA8', textTransform: 'uppercase', marginBottom: 8,
  },
  sidebarEmpty: { fontSize: 13, color: '#666', margin: 0, lineHeight: 1.6 },
  streakText: { fontSize: 15, fontWeight: 700, color: '#1a1a1a', margin: 0 },

  progressCard: {
    background: '#fff',
    border: '1px solid rgba(169,143,217,0.25)',
    borderRadius: 16,
    padding: '1.25rem',
    boxShadow: '0 2px 12px rgba(124,111,168,0.06)',
  },
  progressTop: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  progressLabel: {
    fontSize: 11, fontWeight: 600, letterSpacing: '1px',
    color: '#7C6FA8', textTransform: 'uppercase', marginBottom: 4,
  },
  progressCount: { fontSize: 22, fontWeight: 700, color: '#1a1a1a' },
  progressTotal: { fontSize: 13, fontWeight: 400, color: '#888' },
  progressCircle: {
    position: 'relative',
    width: 56, height: 56,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  progressPctText: {
    position: 'absolute',
    fontSize: 12, fontWeight: 700, color: '#7C6FA8',
  },

  progressSteps: {
    display: 'flex', alignItems: 'center', marginBottom: 14,
  },
  progressStepItem: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    gap: 6, flex: '0 0 auto',
  },
  progressDot: {
    width: 28, height: 28, borderRadius: '50%',
    background: '#F0F0F0', color: '#aaa',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 12, fontWeight: 700,
    flexShrink: 0,
  },
  progressDotActive: {
    background: '#F7F4FC', color: '#7C6FA8', border: '2px solid #A98FD9',
  },
  progressDotDone: {
    background: '#A98FD9', color: '#fff',
  },
  progressStepLabel: {
    fontSize: 10, color: '#888', textAlign: 'center', width: 64,
    lineHeight: 1.3,
  },
  progressLine: {
    flex: 1, height: 2, background: '#F7F4FC', marginBottom: 22,
  },

  encourageText: {
    fontSize: 13, color: '#7C6FA8', textAlign: 'center',
    margin: 0, fontWeight: 500,
    background: '#FBFAFE', borderRadius: 10, padding: '10px',
  },

  sectionLabel: {
    fontSize: 11, fontWeight: 600, letterSpacing: '1px',
    color: '#7C6FA8', textTransform: 'uppercase',
    margin: '1.4rem 0 12px',
  },
  stageCard: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    background: '#fff',
    border: '1px solid rgba(169,143,217,0.25)',
    borderRadius: 16,
    padding: '1.25rem',
    marginBottom: 14,
    boxShadow: '0 2px 12px rgba(124,111,168,0.06)',
    cursor: 'pointer',
    transition: 'transform 0.15s, box-shadow 0.15s',
  },
  stageCardLocked: {
    opacity: 0.55,
    cursor: 'default',
    background: '#FCFBFE',
  },
  stageIconWrap: {
    flexShrink: 0,
    width: 56, height: 56,
    borderRadius: 14,
    background: 'linear-gradient(135deg,#F7F4FC,#FBFAFE)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  stageIcon: { fontSize: 28 },
  stageContent: { flex: 1, minWidth: 0 },
  stageTopRow: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 },
  stageNumber: {
    fontSize: 11, fontWeight: 700, color: '#7C6FA8',
    letterSpacing: '1px',
  },
  lockBadge: {
    fontSize: 10, fontWeight: 600, color: '#999',
    background: '#eee', padding: '2px 8px', borderRadius: 10,
  },
  doneBadge: {
    fontSize: 10, fontWeight: 600, color: '#7C6FA8',
    background: '#F7F4FC', padding: '2px 8px', borderRadius: 10,
  },
  stageTitle: { fontSize: 17, fontWeight: 700, color: '#1a1a1a', marginBottom: 2 },
  stageSubtitle: { fontSize: 12, color: '#888', marginBottom: 6 },
  stageDesc: { fontSize: 13, color: '#666', lineHeight: 1.6, margin: 0 },
  stageArrow: {
    flexShrink: 0, fontSize: 20, color: '#A98FD9', fontWeight: 700,
  },

  resetBtn: {
    display: 'block',
    width: '100%', marginTop: 6,
    background: 'none', border: '1px solid #ddd',
    borderRadius: 10, padding: '10px',
    fontSize: 12, color: '#bbb',
    fontFamily: '"Noto Sans KR",sans-serif',
    cursor: 'pointer',
  },
};