import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { api } from '@/lib/api/client';
import { auth } from '@/lib/auth';
import type { GazeBlinkLatest, Stage1Latest } from '@/lib/api/types';
import {
  BLINK_NORMAL,
  buildFaceReport,
  buildStage3FaceLines,
  buildSummary,
  buildVoiceReport,
  VOICE_AXIS_LABELS,
  type Chip,
  type FaceReport,
  type VoiceReport,
} from './buildReport';
import { Pentagon } from './Pentagon';
import { loadStageDetails, STAGE_DETAILS_EVENT, type StageDetails } from './stageDetails';
import './report.css';

/** 글 안의 **굵게**를 굵은 글씨로 (경량 웹과 같은 표기) */
const rich = (t: string) => t.split(/\*\*(.+?)\*\*/).map((s, i) => (i % 2 ? <b key={i}>{s}</b> : s));
const Tag = ({ c }: { c: Chip }) => <span className={`chip ${c.tone}`}>{c.text}</span>;

/**
 * 아직 값이 없는 칸 — 경량 웹 리포트에 있던 칸을 자리만 잡아 둔다. 서버(또는 분석)가 값을 주기 시작하면
 * 이 자리에 바로 그려진다(buildReport의 null 필드). 예시 값을 채워 넣지 않는다.
 */
function Pending({ children }: { children: ReactNode }) {
  return (
    <div className="pending">
      <span className="chip n">준비 중</span>
      <span>{children}</span>
    </div>
  );
}

/** 1→2→3단계 흐름 막대. 값이 없는 단계는 점선 빈 막대 */
function Spark({ flow }: { flow: (number | null)[] }) {
  return (
    <div>
      <div className="spark" aria-hidden>
        {flow.map((v, i) => (v === null ? <i key={i} className="none" /> : <i key={i} style={{ height: `${Math.max(8, v)}%` }} />))}
      </div>
      <div className="sparkl">
        {['1단계', '2단계', '3단계'].map((n) => (
          <span key={n}>{n}</span>
        ))}
      </div>
    </div>
  );
}

/** 받아쓴 대답에 표시 입히기 (경량 웹과 같은 표기): [f:말버릇] [l:늘인 소리] [p:긴 멈춤] [k:바라보며 말한 부분] */
const MARK: Record<string, string> = { f: 'f', l: 'l', p: 'ps', k: 'lk' };
function Script({ t }: { t: string }) {
  const p = t.split(/\[([flpk]):([^\]]+)\]/);
  const out: ReactNode[] = [];
  for (let i = 0; i < p.length; i += 3) {
    out.push(p[i]);
    if (i + 2 < p.length) out.push(<span key={i} className={MARK[p[i + 1]]}>{p[i + 2]}</span>);
  }
  return <div className="script">{out}</div>;
}

/** 이 기기에 남긴 1·2단계 세부값 → 없으면 서버의 최신 요약 점수로 대신 (기기를 바꾼 경우) */
function useStageReports(given?: StageDetails) {
  // 3단계 목소리 분석은 리포트가 열린 뒤에 끝나므로, 저장되면 다시 읽는다
  const [version, setVersion] = useState(0);
  useEffect(() => {
    if (given) return;
    const onChange = () => setVersion((v) => v + 1);
    window.addEventListener(STAGE_DETAILS_EVENT, onChange);
    return () => window.removeEventListener(STAGE_DETAILS_EVENT, onChange);
  }, [given]);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- version이 바뀌면 기기 기록을 다시 읽는다
  const local = useMemo(() => given ?? loadStageDetails(), [given, version]);
  const [s1, setS1] = useState<Stage1Latest | null>(null);
  const [s2, setS2] = useState<GazeBlinkLatest | null>(null);
  const [loading, setLoading] = useState(!given && (!local.stage1 || !local.stage2));

  useEffect(() => {
    if (given || (local.stage1 && local.stage2)) return;
    let cancelled = false;
    Promise.all([
      local.stage1 ? null : api.latestStage1().then((r) => r.result).catch(() => null),
      local.stage2 ? null : api.latestGazeBlink().then((r) => r.result).catch(() => null),
    ]).then(([a, b]) => {
      if (cancelled) return;
      setS1(a);
      setS2(b);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [local, given]);

  const others = { stage2: local.stage2Voice?.result, stage3: local.stage3Voice?.result };
  const voice: VoiceReport | null = local.stage1
    ? buildVoiceReport(local.stage1, others)
    : s1
      ? buildVoiceReport({ at: s1.at, latest: s1 }, others)
      : null;
  const face: FaceReport | null = local.stage2 ? buildFaceReport(local.stage2) : s2 ? buildFaceReport({ at: s2.at, latest: s2 }) : null;
  const real = local.stage3Face ? buildStage3FaceLines(local.stage3Face.result, local.stage2?.result) : null;
  return { voice, face, loading, marks: local.stage3Marks ?? null, marksStatus: local.stage3VoiceStatus ?? null, real };
}

/** "2026년 11월 7일 (토) 19:54:12" */
export function reportDateTime(d: Date): string {
  const day = d.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });
  const week = d.toLocaleDateString('ko-KR', { weekday: 'short' });
  const time = d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
  return `${day} (${week}) ${time}`;
}

const WRITING_STEPS = ['말하기 습관을 살펴보고 있어요', '시선과 표정을 모으고 있어요', '실전 면접을 돌아보고 있어요'];
const WRITING_STEP_MS = 650;

/**
 * 면접 직후 리포트가 '띡' 나타나지 않게, 하루가 리포트를 쓰는 것처럼 잠깐(약 2.3초) 보여 준다 — 실제로 기다리는 건
 * 아니고(값은 이미 있음) 마음의 준비를 하는 짧은 사이. 단계 줄이 하나씩 체크된다. '동작 줄이기' 설정이면 건너뜀.
 * 반환: 지금 단계(0~3), 끝났으면 null
 */
function useWritingIntro(enabled: boolean): number | null {
  const [step, setStep] = useState<number | null>(() =>
    enabled && !(typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) ? 0 : null,
  );
  useEffect(() => {
    if (step === null) return;
    const t = setTimeout(() => setStep(step >= WRITING_STEPS.length ? null : step + 1), step >= WRITING_STEPS.length ? 350 : WRITING_STEP_MS);
    return () => clearTimeout(t);
  }, [step]);
  return step;
}

function WritingIntro({ name, step }: { name: string | null; step: number }) {
  return (
    <main className="rb-report">
      <div className="rb-report-writing" role="status" aria-live="polite">
        <span className="pen" aria-hidden>
          ✍️
        </span>
        <h1>
          {name ? `${name} 님의` : '나의'} <em>리포트</em>를 쓰고 있어요
        </h1>
        <ul>
          {WRITING_STEPS.map((label, i) => (
            <li key={label} data-state={i < step ? 'done' : i === step ? 'now' : 'todo'}>
              <i aria-hidden>{i < step ? '✓' : ''}</i>
              {label}
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}

/**
 * 최종 통합 리포트 — 3단계 면접을 마친 뒤 1·2·3단계를 한 장에 모은다(경량 웹 Result.tsx에서 가져옴).
 * 1·2단계는 단계마다 따로 결과를 보여 주지 않고 여기서 처음 보여 준다.
 *
 *   이번 연습 정리 → 1 말하기 습관(1단계) → 2 시선과 표정(2단계) → 3 실전 면접 돌아보기(기존 3단계 결과 화면)
 *
 * 값은 전부 실제 분석 결과다(경량 웹은 고정 예시였음). 없는 값은 칸을 만들지 않고, 단계 기록이 없으면 하러 가는 링크를 둔다.
 */
export function FinalReport({
  answeredCount,
  interview,
  details,
  date,
  notice,
  writingIntro = false,
}: {
  /** 3단계에서 대답한 질문 수 — 3단계 기록이 없으면 null */
  answeredCount: number | null;
  interview: ReactNode;
  /** 1·2단계 값을 직접 넘길 때(예시 화면). 없으면 이 기기 기록 → 서버 요약 순으로 읽는다 */
  details?: StageDetails;
  /** 리포트 날짜 (다시 보기: 그 면접을 한 날). 없으면 오늘 */
  date?: string;
  /** 제목 위 안내 (예시 화면 표시 등) */
  notice?: ReactNode;
  /** true면 처음에 'OO 님의 리포트를 쓰고 있어요'를 잠깐 보여 준다(면접 직후). 다시 보기에선 끔 */
  writingIntro?: boolean;
}) {
  const { voice, face, loading, marks, marksStatus, real } = useStageReports(details);
  const summary = buildSummary(voice, face);
  const [today] = useState(() => reportDateTime(date ? new Date(date) : new Date()));
  const name = auth.name;
  const writing = useWritingIntro(writingIntro);
  if (writing !== null) return <WritingIntro name={name} step={writing} />;

  return (
    <main className="rb-report rb-report--reveal">
      {notice}
      <header>
        <h1>
          {name ? `${name} 님의` : '나의'} <em>연습 리포트</em>
        </h1>
        <div className="meta">
          <span className="t">{answeredCount === null ? '3단계 전' : '3단계 완료'}</span>
          <span>{today}</span>
          {/* 받아쓰기가 비어 0개로 나오던 경우('질문 0개에 대답') — 대답 수가 없으면 마쳤다는 것만 */}
          {answeredCount !== null && <span>{answeredCount > 0 ? `실전 면접 질문 ${answeredCount}개에 대답` : '실전 면접을 끝까지 마쳤어요'}</span>}
        </div>
      </header>

      <section className="sec">
        <div className="sh">
          <h2>이번 연습 정리</h2>
        </div>
        <div className="top">
          <div className="say">
            <b className="h">세 단계를 끝까지 마쳤어요</b>
            하루와 목소리로 이야기하고, 영상 통화로 얼굴을 마주하고, 실전 면접까지 해냈어요. 아래에서 단계별로 무엇이
            보였는지 천천히 살펴봐요. 점수가 아니라 다음 연습에서 해 볼 것을 고르는 자리예요.
          </div>
          <div className="chips">
            <h4>잘하고 있어요</h4>
            <div className="row">
              {summary.good.length ? summary.good.map((t) => <span key={t} className="chip g">{t}</span>) : <span className="chip g">끝까지 마친 것</span>}
            </div>
            {summary.next.length > 0 && (
              <>
                <h4>연습하면 좋아져요</h4>
                <div className="row">
                  {summary.next.map((t) => (
                    <span key={t} className="chip p">
                      {t}
                    </span>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </section>

      <VoiceSection voice={voice} loading={loading} />
      <FaceSection face={face} loading={loading} real={real} />

      <section className="sec">
        <div className="sh">
          <span className="no">3</span>
          <h2>실전 면접 돌아보기</h2>
        </div>
        <p className="sub">면접관과 나눈 질문과 대답을 다시 보고, 다음 한 걸음을 골라요. 대답 내용은 평가하지 않아요.</p>
        <div className="card" style={{ marginTop: 18 }}>
          <h3>질문별 말버릇·멈춤 표시</h3>
          <p className="k">받아쓴 대답 위에 "음, 어"·소리 늘이기·긴 멈춤이 나온 곳을 표시해요</p>
          {marks && marks.length ? (
            <>
              {marks.map((m, i) => (
                <div key={i} style={{ marginTop: 14 }}>
                  <p className="lbl">
                    Q{i + 1}. {m.question}
                  </p>
                  <Script t={m.script} />
                </div>
              ))}
              <div className="keys">
                <span className="k1">말버릇</span>
                <span className="k2">소리 늘이기</span>
                <span className="k3">긴 멈춤</span>
                <span className="k4">면접관을 바라보며 말한 부분</span>
              </div>
            </>
          ) : marksStatus === 'pending' ? (
            <Pending>3단계 대답 목소리를 정리하고 있어요. 조금 뒤에 여기에 표시가 나타나요.</Pending>
          ) : marksStatus === 'failed' ? (
            <Pending>3단계 대답 목소리를 정리하지 못했어요. 다음 면접에서 다시 살펴볼게요.</Pending>
          ) : (
            <Pending>3단계에서 대답한 목소리가 있으면 질문마다 표시가 보여요.</Pending>
          )}
        </div>
        <div style={{ marginTop: 18 }}>{interview}</div>
      </section>
    </main>
  );
}

/** 질문별 막대 (Q1~Qn) */
function PerQBars({ values, unit }: { values: number[]; unit: string }) {
  const max = Math.max(...values, 1);
  return (
    <div className="hist">
      {values.map((v, i) => (
        <div key={i}>
          <i style={{ height: `${(v / max) * 60}px` }} title={`Q${i + 1} ${v}${unit}`} />
          Q{i + 1}
        </div>
      ))}
    </div>
  );
}

function Missing({ stage, path, loading }: { stage: string; path: string; loading: boolean }) {
  return (
    <div className="empty">
      {loading ? (
        <span>기록을 불러오는 중이에요…</span>
      ) : (
        <>
          <span>{stage} 기록이 아직 없어요.</span>
          <Link to={path}>{stage} 하러 가기 →</Link>
        </>
      )}
    </div>
  );
}

function VoiceSection({ voice, loading }: { voice: VoiceReport | null; loading: boolean }) {
  return (
    <section className="sec">
      <div className="sh">
        <span className="no">1</span>
        <h2>말하기 습관</h2>
      </div>
      <p className="sub">1단계에서 하루와 이야기한 목소리를 다섯 가지로 살펴봤어요.</p>
      {!voice ? (
        <Missing stage="1단계" path="/voice" loading={loading} />
      ) : (
        <>
          <div className="clg">
            <span className="chip g">지금처럼 하면 돼요</span>
            <span className="chip y">가끔 있어요</span>
            <span className="chip p">다음 연습 포인트</span>
          </div>
          <div className="hb">
            <Pentagon v={voice.v} labels={VOICE_AXIS_LABELS} />
            <ul className="rows">
              {voice.habits.map((h) => (
                <li key={h.key}>
                  <b>
                    {h.name}
                    <small>{h.easy}</small>
                  </b>
                  <p>{h.line}</p>
                  <Spark flow={h.flow} />
                  <Tag c={h.chip} />
                </li>
              ))}
            </ul>
          </div>

          {voice.habits[0].flow.slice(1).every((v) => v === null) && (
            <p className="note">막대는 1→2→3단계 흐름이에요. 지금은 1단계 목소리만 살펴봐서 2·3단계 막대는 비어 있어요.</p>
          )}
          {(
            <div className="five">
              {!voice.fillers && (
                <div className="card">
                  <h3>"음, 어" 같은 말</h3>
                  <p className="k">발화 유창성</p>
                  <Pending>어떤 말이 몇 번, 어디서 나왔는지는 이 기기에서 1단계를 다시 하면 보여요.</Pending>
                </div>
              )}
              {voice.fillers && (
                <div className="card">
                  <h3>
                    "음, 어" 같은 말 <Tag c={voice.fillers.chip} />
                  </h3>
                  <p className="k">발화 유창성 · 대답을 받아쓴 글로 셌어요</p>
                  {voice.fillers.words.length > 0 && (
                    <div className="words">
                      {voice.fillers.words.map(([w, n]) => (
                        <span key={w}>
                          "{w}"<small>{n}번</small>
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="tick" aria-hidden>
                    {voice.fillers.ticks.map((x, i) => (
                      <i key={i} style={{ left: `${x}%` }} />
                    ))}
                  </div>
                  <div className="tickl">
                    <span>대화 처음</span>
                    <span>대화 끝</span>
                  </div>
                  <p className="d">{rich(voice.fillers.line)}</p>
                </div>
              )}
              {voice.pauses && (
                <div className="card">
                  <h3>
                    오래 멈추기 <Tag c={voice.pauses.chip} />
                  </h3>
                  <p className="k">침묵 조절력 · 대답 중에 오래 멈춘 순간</p>
                  <div className="ln" aria-hidden>
                    {voice.pauses.marks.map((m, i) => (
                      <i key={i} style={{ left: `${m.left}%`, width: `${m.width}%` }}>
                        <b>{m.label}</b>
                      </i>
                    ))}
                  </div>
                  <div className="tickl">
                    <span>대화 처음</span>
                    <span>대화 끝</span>
                  </div>
                  <p className="d">{rich(voice.pauses.line)}</p>
                </div>
              )}
              {!voice.pauses && (
                <div className="card">
                  <h3>오래 멈추기</h3>
                  <p className="k">침묵 조절력</p>
                  <Pending>언제 몇 초 멈췄는지는 이 기기에서 1단계를 다시 하면 보여요.</Pending>
                </div>
              )}

              <div className="card">
                <h3>
                  소리 늘이기 {voice.prolong && <Tag c={voice.prolong.chip} />}
                </h3>
                <p className="k">발화 지속성 · 한 소리를 길게 늘인 순간</p>
                {voice.prolong ? (
                  <>
                    <ul className="mo">
                      {voice.prolong.items.map((it, i) => (
                        <li key={i}>
                          <q>
                            <u>{it.word}</u>
                          </q>
                          <span>{it.at}</span>
                        </li>
                      ))}
                    </ul>
                    <p className="d">{rich(voice.prolong.line)}</p>
                  </>
                ) : (
                  <Pending>"저어는"처럼 늘인 말과 그 시각을 보여 드릴 예정이에요.</Pending>
                )}
              </div>

              <div className="card">
                <h3>
                  끝까지 또렷하게 {voice.energy && <Tag c={voice.energy.chip} />}
                </h3>
                <p className="k">발화 에너지 · 한 문장 안에서 목소리 크기</p>
                {voice.energy ? (
                  <>
                    <div className="en" aria-hidden>
                      {voice.energy.bars.map((v, i) => (
                        <i key={i} style={{ height: `${v}%` }} />
                      ))}
                    </div>
                    <div className="tickl">
                      <span>문장 처음</span>
                      <span>문장 끝</span>
                    </div>
                    <p className="d">{rich(voice.energy.line)}</p>
                  </>
                ) : (
                  <Pending>문장 끝으로 갈수록 목소리가 작아지는지 막대로 보여 드릴 예정이에요.</Pending>
                )}
              </div>

              <div className="card wide">
                <h3>
                  목소리 떨림 {voice.tremor && <Tag c={voice.tremor.chip} />}
                </h3>
                <p className="k">음성 안정성 · 대화하는 동안 목소리가 얼마나 고르게 나왔는지</p>
                {voice.tremor ? (
                  <>
                    <svg className="trc" viewBox="0 0 600 84" preserveAspectRatio="none" aria-hidden>
                      <rect x="0" y="0" width="600" height="30" fill="var(--rp-warm-bg)" />
                      <polyline
                        points={voice.tremor.curve
                          .map((c, i, a) => `${(i / (a.length - 1)) * 600},${(80 - c * 76).toFixed(1)}`)
                          .join(' ')}
                        fill="none"
                        stroke="var(--rp-accent)"
                        strokeWidth="2.5"
                      />
                    </svg>
                    <div className="tickl">
                      <span>대화 처음</span>
                      <span>위 칸에 가까울수록 많이 흔들림</span>
                      <span>대화 끝</span>
                    </div>
                    <p className="d">{rich(voice.tremor.line)}</p>
                  </>
                ) : (
                  <Pending>대화하는 동안 목소리가 언제 흔들렸는지 선으로 보여 드릴 예정이에요.</Pending>
                )}
              </div>
            </div>
          )}

          {voice.tip && (
            <div className="tip">
              <b>다음 연습에서 해 볼 것</b>
              {voice.tip}
            </div>
          )}
          <p className="src">
            다섯 가지는 목소리 분석 모델로, "음, 어" 같은 말은 대답을 받아쓴 글로 셌어요
            {voice.spokenSec ? ` · 대답한 목소리 ${Math.round(voice.spokenSec)}초` : ''}.
          </p>
        </>
      )}
    </section>
  );
}

function FaceSection({ face, loading, real }: { face: FaceReport | null; loading: boolean; real: ReturnType<typeof buildStage3FaceLines> | null }) {
  const [lo, hi] = BLINK_NORMAL;
  const MAX = 50; // 막대 오른쪽 끝(1분 50번) — 화면 눈금용
  return (
    <section className="sec">
      <div className="sh">
        <span className="no">2</span>
        <h2>시선과 표정</h2>
      </div>
      <p className="sub">
        {real
          ? '2단계 영상 통화와 3단계 실전 면접에서 대답하는 동안 카메라로 살펴봤어요. 영상은 저장하지 않았어요.'
          : '2단계에서 하루와 영상 통화하는 동안 카메라로 살펴봤어요. 영상은 저장하지 않았어요.'}
      </p>
      {!face ? (
        <Missing stage="2단계" path="/face" loading={loading} />
      ) : (
        <>
          <div className="fx">
            <div>
              <h3>
                눈 깜빡임 <Tag c={face.blink.chip} />
              </h3>
              <p className="what">1분에 몇 번 깜빡였는지</p>
              {face.blink.big && <p className="big">{face.blink.big}</p>}
              <p className="d">{face.blink.line}</p>
              {real && <p className="d">{real.blink}</p>}
            </div>
            {face.blink.ratePerMin !== null && (
              <div>
                <div className="track">
                  <div className="ok" style={{ left: `${(lo / MAX) * 100}%`, width: `${((hi - lo) / MAX) * 100}%` }} />
                  <span className="pin" style={{ left: `${Math.min(100, (face.blink.ratePerMin / MAX) * 100)}%` }}>
                    이번 {Math.round(face.blink.ratePerMin)}번
                  </span>
                  {[0, lo, hi, MAX].map((t) => (
                    <span key={t} className="lb" style={{ left: `${(t / MAX) * 100}%` }}>
                      {t === 0 ? '0' : `${t}번`}
                    </span>
                  ))}
                </div>
                <div className="zones">
                  <span style={{ width: `${(lo / MAX) * 100}%` }}>적게</span>
                  <span style={{ width: `${((hi - lo) / MAX) * 100}%`, color: 'var(--rp-accent-ink)', fontWeight: 700 }}>편안한 범위</span>
                  <span style={{ width: `${((MAX - hi) / MAX) * 100}%` }}>자주</span>
                </div>
                <p className="what" style={{ marginTop: 18 }}>질문별 1분 깜빡임</p>
                {face.blink.perQ ? (
                  <PerQBars values={face.blink.perQ} unit="번" />
                ) : (
                  <Pending>하루의 질문마다 몇 번 깜빡였는지 보여 드릴 예정이에요.</Pending>
                )}
              </div>
            )}
          </div>

          <div className="fx">
            <div>
              <h3>
                눈 맞춤 <Tag c={face.gaze.chip} />
              </h3>
              <p className="what">하루를 한 번 볼 때 얼마나 오래 바라봤는지</p>
              {face.gaze.big && <p className="big">{face.gaze.big}</p>}
              {face.gaze.line && <p className="d">{face.gaze.line}</p>}
              {real && <p className="d">{real.gaze}</p>}
            </div>
            {face.gaze.segments && face.gaze.segments.length > 0 && (
              <div>
                <p className="what">대답하는 동안의 시선 흐름</p>
                <div className="bar" style={{ marginTop: 10 }}>
                  {face.gaze.segments.map((g, i) => (
                    <i key={i} className={g.type} style={{ flex: Math.max(0.05, g.end - g.start) }} />
                  ))}
                </div>
                <div className="leg">
                  <span>바라본 시간</span>
                  <span className="a">다른 곳을 본 시간</span>
                </div>
                <p className="what" style={{ marginTop: 18 }}>질문별 평균 눈 맞춤</p>
                {face.gaze.perQ ? (
                  <PerQBars values={face.gaze.perQ} unit="초" />
                ) : (
                  <Pending>하루의 질문마다 얼마나 오래 바라봤는지 보여 드릴 예정이에요.</Pending>
                )}
              </div>
            )}
          </div>

          <div className="fx">
            <div>
              <h3>
                표정 <Tag c={face.expr.chip} />
              </h3>
              <p className="what">미소 지은 순간과 굳은(긴장한) 순간</p>
              {face.expr.smilePct !== null && face.expr.tensionPct !== null && (
                <div className="vs">
                  <div>
                    <small>대화 중 미소 지은 시간</small>
                    <b>{face.expr.smilePct}%</b>
                  </div>
                  <div>
                    <small>대답할 때 굳은 시간</small>
                    <b>{face.expr.tensionPct}%</b>
                  </div>
                </div>
              )}
              {face.expr.line && <p className="d">{face.expr.line}</p>}
              {real && <p className="d">{real.expr}</p>}
            </div>
            {face.expr.segments && face.expr.segments.length > 0 && (
              <div>
                <p className="what">대답하는 동안의 표정 흐름</p>
                <div className="bar" style={{ marginTop: 10 }}>
                  {face.expr.segments.map((g, i) => (
                    <i key={i} className={g.type} style={{ flex: Math.max(0.05, g.end - g.start) }} />
                  ))}
                </div>
                <div className="leg">
                  <span className="s">미소</span>
                  <span className="t">굳은 순간</span>
                  <span className="n">평소 표정</span>
                </div>
                {face.expr.emo && (
                  <ul className="emo">
                    {(
                      [
                        ['s', '미소', face.expr.emo.smile],
                        ['n', '평소 표정', face.expr.emo.neutral],
                        ['t', '굳은 순간', face.expr.emo.tension],
                      ] as const
                    ).map(([k, label, pct]) => (
                      <li key={k} className={k}>
                        <span>{label}</span>
                        <div className="b">
                          <i style={{ width: `${pct}%` }} />
                        </div>
                        <b>{pct}%</b>
                      </li>
                    ))}
                  </ul>
                )}
                <p className="d" style={{ fontSize: 13.5 }}>
                  미소는 많을수록 좋은 게 아니에요. 인사나 가벼운 이야기처럼 어울리는 순간에 자연스럽게 나오면 충분해요.
                </p>
              </div>
            )}
          </div>
        </>
      )}
    </section>
  );
}
