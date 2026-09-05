import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom'; 

const AXES = [
  { key: 'stability',  label: '음성 안정성',   desc: '음성 떨림·에너지 변동 안정도' },
  { key: 'fluency',    label: '발화 유창성',   desc: '채움말 없이 자연스러운 발화'   },
  { key: 'pause_ctrl', label: '침묵 조절력',   desc: '무음 구간 적절성'              },
  { key: 'continuity', label: '발화 지속성',   desc: '연장음 없이 적절한 속도 유지'  },
  { key: 'calm',       label: '발화 에너지', desc: '종합 불안 역산 지수'           },
];

const TRAINING_TIPS = {
  stability: '말하기 전 깊게 숨을 들이마시고 천천히 내뱉으며, 짧은 문장을 떨림 없이 끝까지 말하는 연습부터 해보세요.',
  fluency: '말하기 전 머릿속으로 문장을 먼저 정리해보세요. "음", "어" 대신 짧은 침묵으로 바꾸는 연습이 효과적이에요.',
  pause_ctrl: '문장과 문장 사이에 의도적으로 1~2초 침묵을 두는 연습을 해보세요. 침묵이 어색하지 않다는 걸 몸으로 익히는 게 핵심이에요.',
  continuity: '문장을 짧게 끊어 말하는 연습부터 시작해보세요. 한 호흡에 너무 길게 말하지 않도록 의식적으로 끊어주세요.',
  calm: '말하기 전 가벼운 스트레칭이나 심호흡으로 긴장을 풀고, 좋아하는 문장을 소리 내어 읽는 것부터 시작해보세요.',
};

const COLORS = ['#A98FD9', '#7C6FA8', '#5B4B92', '#C9B8E9', '#8B6FCB'];

const LOADING_STEPS = [
  '음성 파형 불러오는 중...',
  'CNN 모델 추론 중...',
  '채움말 분석 중...',
  '멈춤 구간 분석 중...',
  '결과 차트 출력 중...'
];

const GUIDE_ITEMS = [
  { icon: '🔇', title: '조용한 환경', desc: '주변 소음이 없는 곳에서 녹음하세요' },
  { icon: '🎙️', title: '마이크 근접', desc: '마이크와 10~20cm 거리를 유지하세요' },
  { icon: '⏱️', title: '30초 이상', desc: '정확한 분석을 위해 30초 이상 발화하세요' },
  { icon: '🗣️', title: '자연스럽게', desc: '평소 말하듯 자연스럽게 발화하세요' },
  { icon: '📁', title: 'WAV 형식', desc: '음성 파일은 WAV 형식으로 준비하세요' },
  { icon: '🔁', title: '반복 연습', desc: '여러 번 녹음해서 변화를 확인해보세요' },
];

function RadarChart({ scores }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current || !scores) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const W = 300, H = 340, cx = 150, cy = 175, R = 88, n = 5;

    ctx.clearRect(0, 0, W, H);
    const angles = AXES.map((_, i) => (Math.PI * 2 * i) / n - Math.PI / 2);

    [0.2, 0.4, 0.6, 0.8, 1.0].forEach(frac => {
      ctx.beginPath();
      angles.forEach((a, i) => {
        const x = cx + R * frac * Math.cos(a);
        const y = cy + R * frac * Math.sin(a);
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      });
      ctx.closePath();
      ctx.strokeStyle = 'rgba(169,143,217,0.22)';
      ctx.lineWidth = 0.8;
      ctx.stroke();
    });

    angles.forEach(a => {
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + R * Math.cos(a), cy + R * Math.sin(a));
      ctx.strokeStyle = 'rgba(169,143,217,0.22)';
      ctx.lineWidth = 0.8;
      ctx.stroke();
    });

    const vals = AXES.map(a => (scores[a.key] || 0) / 100);
    ctx.beginPath();
    angles.forEach((a, i) => {
      const x = cx + R * vals[i] * Math.cos(a);
      const y = cy + R * vals[i] * Math.sin(a);
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.closePath();
    ctx.fillStyle = 'rgba(169,143,217,0.15)';
    ctx.fill();
    ctx.strokeStyle = '#A98FD9';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    angles.forEach((a, i) => {
      const x = cx + R * vals[i] * Math.cos(a);
      const y = cy + R * vals[i] * Math.sin(a);
      ctx.beginPath();
      ctx.arc(x, y, 5, 0, Math.PI * 2);
      ctx.fillStyle = COLORS[i];
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    });

    ctx.font = 'bold 11px "Noto Sans KR", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    angles.forEach((a, i) => {
      const lr = R + 35;
      const lx = cx + lr * Math.cos(a);
      const ly = cy + lr * Math.sin(a);
      ctx.fillStyle = '#1a1a1a';
      ctx.fillText(AXES[i].label, lx, ly);
    });
  }, [scores]);

  return (
    <canvas ref={canvasRef} width={300} height={340} style={{ display: 'block', margin: '0 auto' }} />
  );
}

export default function VoiceStage() {
    const navigate = useNavigate();
  const [file, setFile]         = useState(null);
  const [dragging, setDragging] = useState(false);
  const [phase, setPhase]       = useState('idle');
  const [loadStep, setLoadStep] = useState(0);
  const [loadPct, setLoadPct]   = useState(0);
  const [result, setResult]     = useState(null);
  const [errMsg, setErrMsg]     = useState('');
  const inputRef = useRef(null);

  const handleFile = (f) => {
    if (!f) return;
    const allowed = ['.wav'];
    const ext = f.name.slice(f.name.lastIndexOf('.')).toLowerCase();
    if (!allowed.includes(ext)) {
      alert('WAV 형식만 지원합니다.');
      return;
    }
    setFile(f);
    setPhase('idle');
    setResult(null);
  };

  const onDrop = useCallback((e) => {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
  }, []);

  const analyze = async () => {
    if (!file) return;
    setPhase('loading');
    setLoadStep(0);
    setLoadPct(0);

    const interval = setInterval(() => {
      setLoadStep(s => {
        const ns = Math.min(s + 1, LOADING_STEPS.length - 1);
        setLoadPct(Math.round((ns / (LOADING_STEPS.length - 1)) * 90));
        return ns;
      });
    }, 800);

    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/analyze', { method: 'POST', body: fd });
      const data = await res.json();

      clearInterval(interval);
      setLoadPct(100);

      if (!res.ok) {
        setErrMsg(data.error || '서버 오류가 발생했습니다.');
        setPhase('error');
        return;
      }
      setResult(data);
        localStorage.setItem('voiceStageCompleted', 'true');
        localStorage.setItem('voiceStageScore', Math.round(Object.values(data.scores).reduce((a, b) => a + b, 0) / 5));
        localStorage.setItem('voiceStageCompletedAt', new Date().toISOString());
      setTimeout(() => setPhase('result'), 300);
    } catch (e) {
      clearInterval(interval);
      setErrMsg('백엔드 서버에 연결할 수 없습니다. (localhost:5000 실행 확인)');
      setPhase('error');
    }
  };

  const reset = () => {
    setFile(null);
    setPhase('idle');
    setResult(null);
    setErrMsg('');
    if (inputRef.current) inputRef.current.value = '';
  };

  const scoreColor = (v) => v >= 75 ? '#1E8A57' : v >= 55 ? '#B07A00' : '#A32D2D';

  const overall = result
    ? Math.round(Object.values(result.scores).reduce((a, b) => a + b, 0) / 5)
    : 0;

  const buildFeedback = (result) => {
    const { scores } = result;
    const entries = Object.entries(scores);
    const best  = entries.reduce((a, b) => a[1] > b[1] ? a : b);
    const worst = entries.reduce((a, b) => a[1] < b[1] ? a : b);
    const bestAxis  = AXES.find(a => a.key === best[0]);
    const worstAxis = AXES.find(a => a.key === worst[0]);
    const ov = Math.round(entries.reduce((s, e) => s + e[1], 0) / 5);

    const items = [
      {
        type: 'good', icon: '✓',
        text: `${bestAxis.label} 영역이 ${best[1]}점으로 가장 우수합니다. ${bestAxis.desc} 부분에서 안정적인 역량을 보였습니다.`,
      },
      {
        type: worst[1] < 60 ? 'warn' : 'tip', icon: worst[1] < 60 ? '!' : '→',
        text: `${worstAxis.label} 영역(${worst[1]}점)을 집중 훈련해 보세요. ${worstAxis.desc} 개선이 필요합니다.`,
      },
      {
        type: ov >= 75 ? 'good' : 'tip', icon: ov >= 75 ? '🚀' : '💪',
        text: ov >= 75
          ? '종합 점수가 양호합니다. 2단계 비언어적 태도 교정으로 진행할 준비가 되었습니다!'
          : '아직 연습이 더 필요합니다. 안전한 공간에서 천천히 반복 훈련하면 충분히 개선됩니다.',
      },
    ];

    const fillerCount = result.filler_detail?.filler_count ?? 0;
    if (fillerCount > 3) {
      items.splice(2, 0, {
        type: 'warn', icon: '!',
        text: `채움말(어, 음 등)이 ${fillerCount}회 감지되었습니다. 발화 유창성 향상을 위해 의식적으로 줄여보세요.`,
      });
    }

    const pauseCount = result.pause_detail?.anxious_pause_count ?? 0;
    if (pauseCount > 2) {
      items.splice(2, 0, {
        type: 'warn', icon: '!',
        text: `1.2초 이상의 불안한 멈춤이 ${pauseCount}회 감지되었습니다. 자연스러운 흐름을 유지하는 연습이 필요합니다.`,
      });
    }

    return items;
  };

  const S = styles;

  return (
    <div style={S.page}>
      <div style={S.container}>
        <button
            onClick={() => navigate('/dashboard')}
            style={{
                background: 'rgba(255,255,255,0.2)',
                border: 'none', color: '#fff',
                fontSize: 12, fontWeight: 500,
                padding: '6px 14px', borderRadius: 20,
                cursor: 'pointer', marginBottom: 10,
                fontFamily: '"Noto Sans KR",sans-serif',
            }}
        >
            ← 홈으로
        </button>
            <div style={{ ...S.header, position: 'relative' }}>
                <button
                onClick={() => navigate('/dashboard')}
                style={{
                    position: 'absolute', top: 16, right: 16,
                    background: 'rgba(255,255,255,0.2)',
                    border: 'none', color: '#fff',
                    fontSize: 12, fontWeight: 500,
                    padding: '5px 12px', borderRadius: 20,
                    cursor: 'pointer',
                    fontFamily: '"Noto Sans KR",sans-serif',
                }}
            >
                ← 홈
            </button>
          <div style={S.badge}>1단계 · 음성 정밀 진단</div>
          <h1 style={S.h1}><span style={{ fontWeight: 700 }}>Re-born</span> 보이스 터치</h1>
          <p style={S.headerSub}>Vision AI 기반 고립·은둔 청년 비언어적 능력 재활 트레이닝 </p>
        </div>

        <div style={S.body}>
          {phase !== 'result' && (
            <>
              <section>
                <div style={S.sectionLabel}>분석 전 체크리스트</div>
                <div style={S.guideGrid}>
                  {GUIDE_ITEMS.map((g, i) => (
                    <div key={i} style={S.guideCard}>
                      <div style={S.guideIcon}>{g.icon}</div>
                      <div style={S.guideTitle}>{g.title}</div>
                      <div style={S.guideDesc}>{g.desc}</div>
                    </div>
                  ))}
                </div>
              </section>

              <section>
                <div style={S.sectionLabel}>음성 파일 업로드</div>
                <div style={S.card}>
                  <div
                    style={{ ...S.dropzone, ...(dragging ? S.dropzoneDrag : {}) }}
                    onClick={() => inputRef.current?.click()}
                    onDragOver={e => { e.preventDefault(); setDragging(true); }}
                    onDragLeave={() => setDragging(false)}
                    onDrop={onDrop}
                  >
                    <div style={S.uploadIcon}>🎙️</div>
                    <div style={S.dropTitle}>음성 파일을 업로드하세요</div>
                    <div style={S.dropSub}>WAV 지원</div>
                    <input
                      ref={inputRef}
                      type="file"
                      accept=".wav"
                      style={{ display: 'none' }}
                      onChange={e => handleFile(e.target.files[0])}
                    />
                  </div>

                  {file && phase !== 'loading' && (
                    <div style={S.fileRow}>
                      <span style={S.fileIcon}>🎵</span>
                      <span style={S.fileName}>{file.name}</span>
                      <button style={S.removeBtn} onClick={reset}>✕</button>
                    </div>
                  )}

                  {phase === 'loading' && (
                    <div style={S.loadingBox}>
                      <div style={S.loadingTrack}>
                        <div style={{ ...S.loadingFill, width: `${loadPct}%` }} />
                      </div>
                      <div style={S.loadingText}>{LOADING_STEPS[loadStep]}</div>
                    </div>
                  )}

                  {phase === 'error' && (
                    <div style={S.errorBox}>{errMsg}</div>
                  )}

                  <button
                    style={{ ...S.analyzeBtn, ...((!file || phase === 'loading') ? S.analyzeBtnDisabled : {}) }}
                    onClick={analyze}
                    disabled={!file || phase === 'loading'}
                  >
                    {phase === 'loading' ? '분석 중...' : '🧠  AI 분석 시작'}
                  </button>
                </div>
              </section>
            </>
          )}

          {phase === 'result' && result && (() => {
            const feedback = buildFeedback(result);
            const modelScores = result.model_scores || {};
            const probs = result.probabilities || {};

            return (
              <>
                <button style={S.retryBtn} onClick={reset}>↺  새 파일로 다시 분석</button>

                <div style={S.classBanner}>
                  <span style={{ color: '#7C6FA8', fontWeight: 600, fontSize: 15 }}>
                    CNN 모델 직접 점수
                  </span>
                  <div style={S.probRow}>
                    {Object.entries(modelScores).map(([k, v]) => (
                      <span key={k} style={S.probChip}>
                        {k}: <strong>{v}점</strong>
                      </span>
                    ))}
                  </div>
                  <div style={{ fontSize: 12, color: '#888', marginTop: 6 }}>
                    비정상 발화 확률 — 연장음: {probs.prolongation ?? '–'}% · 떨림: {probs.tremor ?? '–'}% · 에너지변동: {probs.energy ?? '–'}% · 채움말: {result.filler_detail?.filler_ratio_pct ?? '0'}% · 불안한멈춤: {result.pause_detail?.anxious_pause_ratio ? (result.pause_detail.anxious_pause_ratio * 100).toFixed(1) : '0'}%
                  </div>
                  {result.demo_mode && (
                    <div style={{ fontSize: 11, color: '#888', marginTop: 4 }}>
                      ※ 모델 파일 없음 — 데모 모드
                    </div>
                  )}
                </div>

                <div style={S.sectionLabel}>발화 역량 오각형 분석</div>
                <div style={S.card}>
                  <div style={S.radarWrap}>
                    <RadarChart scores={result.scores} />
                    <div style={S.legend}>
                      {AXES.map((a, i) => {
                        const v = result.scores[a.key];
                        return (
                          <div key={a.key} style={S.legendItem}>
                            <span style={{ ...S.legendDot, background: COLORS[i] }} />
                            <span style={S.legendLabel}>{a.label}</span>
                            <div style={S.barTrack}>
                              <div style={{ ...S.barFill, width: `${v}%`, background: COLORS[i] }} />
                            </div>
                            <span style={{ ...S.legendScore, color: scoreColor(v) }}>{v}</span>
                          </div>
                        );
                      })}
                      <div style={{ ...S.legendItem, marginTop: 10, borderTop: '1px solid #e0e0e0', paddingTop: 10 }}>
                        <span style={{ fontSize: 13, color: '#555', flex: 1 }}>종합 점수</span>
                        <span style={{ fontSize: 22, fontWeight: 700, color: scoreColor(overall) }}>{overall}</span>
                        <span style={{ fontSize: 13, color: '#aaa', marginLeft: 2 }}>/100</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div style={S.sectionLabel}>상세 측정 지표</div>
                <div style={S.card}>
                  <div style={S.metricGrid}>
                    {[
                      { label: '음성 길이',     value: result.pause_detail?.total_duration_sec,  unit: '초' },
                      { label: '채움말/전체구간', value: `${result.filler_detail?.filler_count ?? '–'}/${result.filler_detail?.sound_segment_count ?? '–'}`, unit: '개' },
                      { label: '불안 멈춤/전체 멈춤', value: `${result.pause_detail?.anxious_pause_count ?? '–'}/${result.pause_detail?.pause_count ?? '–'}`, unit: '개' },
                      { label: '음성 떨림 지수', value: probs.tremor,                             unit: '%'  },
                    ].map(m => (
                      <div key={m.label} style={S.metricCard}>
                        <div style={S.metricLabel}>{m.label}</div>
                        <div style={S.metricValue}>{m.value ?? '–'}</div>
                        <div style={S.metricUnit}>{m.unit}</div>
                      </div>
                    ))}
                  </div>
                </div>

              <div style={S.sectionLabel}>맞춤 피드백</div>
              <div style={S.card}>
                {(() => {
                  const entries = Object.entries(result.scores);
                  const sorted = [...entries].sort((a, b) => b[1] - a[1]);
                  const strengths = sorted.slice(0, 2);
                  const weaknesses = sorted.slice(-2).reverse();
                  const best = sorted[0];
                  const worst = sorted[sorted.length - 1];
                  const bestAxis = AXES.find(a => a.key === best[0]);
                  const worstAxis = AXES.find(a => a.key === worst[0]);

                  return (
                    <>
                      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                        <div style={{ flex: '1 1 200px' }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: '#1E8A57', marginBottom: 8 }}>✓ 강점</div>
                          {strengths.map(([key, val]) => {
                            const axis = AXES.find(a => a.key === key);
                            return (
                              <div key={key} style={{ background: '#F0FBF5', border: '1px solid #8DDDB5', borderRadius: 10, padding: '10px 12px', marginBottom: 8 }}>
                                <div style={{ fontSize: 13, fontWeight: 600 }}>{axis.label} <span style={{ color: '#1E8A57' }}>{val}점</span></div>
                                <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>{axis.desc}</div>
                            </div>
                            );
                          })}
                        </div>
                        <div style={{ flex: '1 1 200px' }}>
  <div style={{ fontSize: 13, fontWeight: 700, color: '#B07A00', marginBottom: 8 }}>! 보완점</div>
  {weaknesses.map(([key, val]) => {
    const axis = AXES.find(a => a.key === key);
    return (
      <div key={key} style={{ background: '#FFFBEA', border: '1px solid #F5E17A', borderRadius: 10, padding: '10px 12px', marginBottom: 8 }}>
        <div style={{ fontSize: 13, fontWeight: 600 }}>{axis.label} <span style={{ color: '#B07A00' }}>{val}점</span></div>
        <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>{axis.desc}</div>
        <button
          onClick={() => navigate(`/voice/training/${key}`)}
          style={{
            marginTop: 8, background: '#fff', border: '1px solid #7C6FA8',
            color: '#7C6FA8', borderRadius: 8, padding: '5px 10px',
            fontSize: 12, fontWeight: 500, cursor: 'pointer',
          }}
        >
          재활 가이드 보기 →
        </button>
      </div>
    );
  })}
</div>
                      </div>

        <p style={{ fontSize: 13, lineHeight: 1.8, color: '#1a1a1a', margin: '14px 0 0', paddingTop: 12, borderTop: '1px solid #f0f0f0' }}>
          <strong>{bestAxis.label}</strong>이 {best[1]}점으로 가장 우수했고, <strong>{worstAxis.label}</strong>은 {worst[1]}점으로 보완이 필요합니다.
          {overall >= 75
            ? ' 전체적으로 안정적인 발화 역량을 보여주고 있어 다음 단계로 진행해볼 만합니다.'
            : ' 안전한 공간에서 천천히 반복 연습하면 충분히 개선될 수 있습니다.'}
        </p>

        <div style={{ background: '#F5F8FF', border: '1px solid #C9DBFF', borderRadius: 10, padding: '12px 14px', marginTop: 10 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#3B5BDB', marginBottom: 4 }}>💡 다음 훈련 제안</div>
          <p style={{ fontSize: 13, lineHeight: 1.7, color: '#1a1a1a', margin: 0 }}>
            {TRAINING_TIPS[worstAxis.key]}
          </p>
        </div>
      </>
    );
  })()}
</div>
              </>
            );
          })()}
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
  container: { maxWidth: 700, margin: '0 auto' },
  header: {
    background: 'linear-gradient(135deg,#7C6FA8 0%,#A98FD9 60%,#C9B8E9 100%)',
    padding: '2rem 2rem 1.6rem',
    borderRadius: '0 0 24px 24px',
    marginBottom: 8,
  },
  badge: {
    display: 'inline-block',
    background: 'rgba(255,255,255,0.2)',
    color: '#fff', fontSize: 13, fontWeight: 500,
    padding: '3px 12px', borderRadius: 20,
    marginBottom: 10, letterSpacing: '0.5px',
  },
  h1: {
    fontFamily: '"Gowun Dodum",serif',
    fontSize: 30, fontWeight: 400,
    color: '#fff', margin: 0, lineHeight: 1.3,
  },
  headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.75)', marginTop: 6 },
  body: { padding: '0 1rem' },
  sectionLabel: {
    fontSize: 15, fontWeight: 600, letterSpacing: '1px',
    color: '#7C6FA8', textTransform: 'uppercase',
    margin: '1.4rem 0 8px',
    display: 'flex', alignItems: 'center', gap: 8,
  },
  guideGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: 10,
    marginBottom: 4,
  },
  guideCard: {
    background: '#fff',
    border: '1px solid rgba(169,143,217,0.2)',
    borderRadius: 12,
    padding: '14px 12px',
    textAlign: 'center',
    boxShadow: '0 1px 6px rgba(124,111,168,0.05)',
  },
  guideIcon: { fontSize: 24, marginBottom: 6 },
  guideTitle: { fontSize: 13, fontWeight: 600, color: '#7C6FA8', marginBottom: 4 },
  guideDesc: { fontSize: 11, color: '#888', lineHeight: 1.5 },
  card: {
    background: '#fff',
    border: '1px solid rgba(169,143,217,0.25)',
    borderRadius: 16, padding: '1.25rem',
    boxShadow: '0 2px 12px rgba(124,111,168,0.06)',
  },
  dropzone: {
    border: '2px dashed #C9B8E9', borderRadius: 12,
    padding: '2rem 1rem', textAlign: 'center',
    cursor: 'pointer', background: '#F7F4FC',
    transition: 'background 0.2s',
  },
  dropzoneDrag: { background: '#E3D8F5', borderColor: '#A98FD9' },
  uploadIcon: { fontSize: 35, marginBottom: 10 },
  dropTitle: { fontSize: 14, fontWeight: 500, color: '#1a1a1a', marginBottom: 4 },
  dropSub: { fontSize: 12, color: '#888' },
  fileRow: {
    display: 'flex', alignItems: 'center', gap: 10,
    background: '#F7F4FC', border: '1px solid #C9B8E9',
    borderRadius: 10, padding: '10px 14px', marginTop: 10,
  },
  fileIcon: { fontSize: 18 },
  fileName: { fontSize: 13, flex: 1, color: '#1a1a1a', wordBreak: 'break-all' },
  removeBtn: {
    background: 'none', border: 'none', cursor: 'pointer',
    color: '#aaa', fontSize: 16, padding: '2px 6px', borderRadius: 4,
  },
  loadingBox: { marginTop: 14 },
  loadingTrack: { height: 4, background: '#e0e0e0', borderRadius: 4, overflow: 'hidden' },
  loadingFill: {
    height: '100%', borderRadius: 4,
    background: 'linear-gradient(90deg,#A98FD9,#C9B8E9)',
    transition: 'width 0.4s ease',
  },
  loadingText: { fontSize: 12, color: '#888', textAlign: 'center', marginTop: 8 },
  errorBox: {
    marginTop: 10, padding: '10px 14px',
    background: '#FFF0F0', border: '1px solid #F09595',
    borderRadius: 10, fontSize: 13, color: '#A32D2D',
  },
  analyzeBtn: {
    width: '100%', marginTop: 12,
    background: 'linear-gradient(135deg,#7C6FA8,#A98FD9)',
    color: '#fff', border: 'none', borderRadius: 10,
    padding: '13px', fontSize: 15, fontWeight: 500,
    fontFamily: '"Noto Sans KR",sans-serif',
    cursor: 'pointer', display: 'block',
    transition: 'opacity 0.2s',
  },
  analyzeBtnDisabled: { opacity: 0.5, cursor: 'not-allowed' },
  retryBtn: {
    display: 'block', width: '100%', marginTop: '1.2rem',
    background: '#fff', border: '1px solid #D9CCEF',
    borderRadius: 10, padding: '10px',
    fontSize: 13, fontWeight: 500, color: '#7C6FA8',
    fontFamily: '"Noto Sans KR",sans-serif', cursor: 'pointer',
  },
  classBanner: {
    borderRadius: 12, border: '1.5px solid #C9B8E9',
    background: '#F7F4FC', padding: '12px 16px', marginTop: '1rem',
  },
  probRow: { display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  probChip: {
    fontSize: 12, background: 'rgba(255,255,255,0.7)',
    padding: '2px 10px', borderRadius: 20, color: '#333',
  },
  radarWrap: { display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 16 },
  legend: { flex: '1 1 180px', minWidth: 180 },
  legendItem: {
    display: 'flex', alignItems: 'center', gap: 8,
    paddingBottom: 8, marginBottom: 8,
    borderBottom: '0.5px solid #f0f0f0',
  },
  legendDot: { width: 10, height: 10, borderRadius: '50%', flexShrink: 0 },
  legendLabel: { fontSize: 13, fontWeight: 600, color: '#1a1a1a', flex: 1 },
  barTrack: { width: 64, height: 4, background: '#eee', borderRadius: 4, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 4, transition: 'width 0.5s' },
  legendScore: { fontSize: 13, fontWeight: 600, minWidth: 24, textAlign: 'right' },
  metricGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit,minmax(110px,1fr))',
    gap: 10,
  },
  metricCard: {
    background: '#FBFAFE', borderRadius: 10, padding: '12px 10px', textAlign: 'center',
    border: '1px solid rgba(169,143,217,0.15)',
  },
  metricLabel: { fontSize: 11, color: '#888', marginBottom: 4 },
  metricValue: { fontSize: 20, fontWeight: 600, color: '#1a1a1a' },
  metricUnit: { fontSize: 11, color: '#aaa' },
  fbItem: {
    display: 'flex', gap: 10, alignItems: 'flex-start',
    padding: '10px 12px', borderRadius: 10, marginBottom: 8, border: '1px solid',
  },
  fbIcon: { fontSize: 16, flexShrink: 0 },
  fbText: { fontSize: 13, lineHeight: 1.65, margin: 0, color: '#1a1a1a' },
  fbTypes: {
    good: { background: '#F0FBF5', borderColor: '#8DDDB5' },
    warn: { background: '#FFFBEA', borderColor: '#F5E17A' },
    tip:  { background: '#EAF3FF', borderColor: '#B5D4F4' },
  },
};