import { Fragment, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { api } from '@/lib/api/client';
import { auth } from '@/lib/auth';
import type { GazeBlinkLatest, GazeBlinkResult, Stage1Latest } from '@/lib/api/types';
import type { InterviewResult, InterviewTranscriptTurn } from '@/features/interview/resultSummary';
import {
  BLINK_NORMAL,
  buildFaceReport,
  buildPlan,
  buildStage3FaceLines,
  buildSummary,
  buildVoiceReport,
  VOICE_AXIS_LABELS,
  type Chip,
  type FaceReport,
  type PlanItem,
  type Tone,
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

/**
 * 받아쓴 대답에 표시 입히기: [f:말버릇] [p:긴 멈춤]. [l:늘인 소리]·[k:바라본 부분]은 글자만 남긴다 —
 * 소리 늘이기는 아직 정확도가 낮고, 바라본 부분 칠은 문장 절반을 덮어 읽기 어려워서(spec 7-2).
 */
const MARK: Record<string, string | undefined> = { f: 'f', p: 'ps' };
function Script({ t }: { t: string }) {
  const p = t.split(/\[([flpk]):([^\]]+)\]/);
  const out: ReactNode[] = [];
  for (let i = 0; i < p.length; i += 3) {
    out.push(p[i]);
    if (i + 2 < p.length) {
      const cls = MARK[p[i + 1]];
      out.push(cls ? <span key={i} className={cls}>{p[i + 2]}</span> : p[i + 2]);
    }
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
  return {
    voice,
    face,
    loading,
    marks: local.stage3Marks ?? null,
    marksStatus: local.stage3VoiceStatus ?? null,
    stage2: local.stage2?.result,
    stage3: local.stage3Face?.result,
  };
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
 *
 *   하루 한 줄 → 이번 연습 정리 → 1 말하기 습관 → 2 시선과 표정 → 3 실전 면접 돌아보기 → 4 다음 연습 계획 → 더 연습해 볼까요?
 *
 * 1·2는 분석 결과, 3·4는 그 결과로 하는 연습(설계: voice-cnn/.scratch/stage3-redesign/spec.md 7).
 * 값은 전부 실제 분석 결과다. 없는 값은 칸을 만들지 않고, 단계 기록이 없으면 하러 가는 링크를 둔다.
 */
export function FinalReport({
  interview,
  details,
  date,
  notice,
  writingIntro = false,
  onAgain,
}: {
  /** 3단계 면접 기록 — undefined면 불러오는 중, null이면 아직 없음 */
  interview: InterviewResult | null | undefined;
  /** 1·2단계 값을 직접 넘길 때(예시 화면). 없으면 이 기기 기록 → 서버 요약 순으로 읽는다 */
  details?: StageDetails;
  /** 리포트 날짜 (다시 보기: 그 면접을 한 날). 없으면 오늘 */
  date?: string;
  /** 제목 위 안내 (예시 화면 표시 등) */
  notice?: ReactNode;
  /** true면 처음에 'OO 님의 리포트를 쓰고 있어요'를 잠깐 보여 준다(면접 직후). 다시 보기에선 끔 */
  writingIntro?: boolean;
  /** "3단계 실전 면접" 카드 — 같은 화면에서 다시 시작할 때(면접 직후). 없으면 /interview로 */
  onAgain?: () => void;
}) {
  const { voice, face, loading, marks, marksStatus, stage2, stage3 } = useStageReports(details);
  const summary = buildSummary(voice, face);
  const [today] = useState(() => reportDateTime(date ? new Date(date) : new Date()));
  const name = auth.name;
  const writing = useWritingIntro(writingIntro);
  if (writing !== null) return <WritingIntro name={name} step={writing} />;

  return (
    <main className="rb-report rb-report--reveal">
      {notice}
      {interview && (
        <div className="haru-say">
          <img src="/haru/haru.jpg" alt="" />
          <div className="bubble">
            <span className="who">하루</span>
            <p>수고했어요! 끝까지 해냈네요.</p>
          </div>
        </div>
      )}
      <header>
        <h1>
          {name ? `${name} 님의` : '나의'} <em>연습 리포트</em>
        </h1>
        <div className="meta">
          <span className="t">{interview ? '3단계 완료' : '3단계 전'}</span>
          <span>{today}</span>
        </div>
      </header>

      <section className="sec">
        <div className="sh">
          <h2>이번 연습 정리</h2>
        </div>
        <div className="top">
          <div className="say">
            <b className="h">아래에서 이렇게 살펴봐요</b>
            <ol className="map">
              <li>
                <b>말하기 습관</b> 목소리로 본 다섯 가지 습관
              </li>
              <li>
                <b>시선과 표정</b> 카메라로 본 눈 맞춤과 표정
              </li>
              <li>
                <b>실전 면접 돌아보기</b> 면접관의 질문과 내 대답
              </li>
              <li>
                <b>다음 연습 계획</b> 위 결과로 고른 연습 두 가지
              </li>
            </ol>
            <span className="end">마지막에 더 연습해 볼 단계를 골라요.</span>
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
      <FaceSection face={face} loading={loading} stage2={stage2} stage3={stage3} />
      <InterviewSection interview={interview} marks={marks} marksStatus={marksStatus} />
      <PlanSection plan={buildPlan(voice, face)} />

      <section className="sec">
        <div className="sh">
          <h2>더 연습해 볼까요?</h2>
        </div>
        <p className="sub">연습하고 싶은 단계를 골라 다시 해 볼 수 있어요.</p>
        <div className="opts">
          <Link className="opt" to="/voice">
            <b>1단계 목소리 대화</b>
            <span>말버릇과 첫마디 연습</span>
          </Link>
          <Link className="opt" to="/face">
            <b>2단계 영상 통화</b>
            <span>눈 맞춤과 표정 연습</span>
          </Link>
          {onAgain ? (
            <button type="button" className="opt" onClick={onAgain}>
              <b>3단계 실전 면접</b>
              <span>처음부터 다시 실전처럼</span>
            </button>
          ) : (
            <Link className="opt" to="/interview">
              <b>3단계 실전 면접</b>
              <span>처음부터 다시 실전처럼</span>
            </Link>
          )}
        </div>
      </section>
    </main>
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
  // 연습 포인트(주황·노랑) 카드만 펼치고, 잘 되는 습관·준비 중 카드는 접어 둔다
  const cards: { tone: Tone; el: ReactNode }[] = [];
  if (voice) {
    cards.push({
      tone: voice.fillers?.chip.tone ?? 'n',
      el: voice.fillers ? (
        <div className="card" key="fillers">
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
      ) : (
        <div className="card" key="fillers">
          <h3>"음, 어" 같은 말</h3>
          <p className="k">발화 유창성</p>
          <Pending>어떤 말이 몇 번, 어디서 나왔는지는 이 기기에서 1단계를 다시 하면 보여요.</Pending>
        </div>
      ),
    });
    cards.push({
      tone: voice.pauses?.chip.tone ?? 'n',
      el: voice.pauses ? (
        <div className="card" key="pauses">
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
      ) : (
        <div className="card" key="pauses">
          <h3>오래 멈추기</h3>
          <p className="k">침묵 조절력</p>
          <Pending>언제 몇 초 멈췄는지는 이 기기에서 1단계를 다시 하면 보여요.</Pending>
        </div>
      ),
    });
    cards.push({
      tone: voice.prolong?.chip.tone ?? 'n',
      el: (
        <div className="card" key="prolong">
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
      ),
    });
    cards.push({
      tone: voice.energy?.chip.tone ?? 'n',
      el: (
        <div className="card" key="energy">
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
      ),
    });
    cards.push({
      tone: voice.tremor?.chip.tone ?? 'n',
      el: (
        <div className="card wide" key="tremor">
          <h3>
            목소리 떨림 {voice.tremor && <Tag c={voice.tremor.chip} />}
          </h3>
          <p className="k">음성 안정성 · 대화하는 동안 목소리가 얼마나 고르게 나왔는지</p>
          {voice.tremor ? (
            <>
              <svg className="trc" viewBox="0 0 600 84" preserveAspectRatio="none" aria-hidden>
                <rect x="0" y="0" width="600" height="30" fill="var(--rp-warm-bg)" />
                <polyline
                  points={voice.tremor.curve.map((c, i, a) => `${(i / (a.length - 1)) * 600},${(80 - c * 76).toFixed(1)}`).join(' ')}
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
      ),
    });
  }
  const open = cards.filter((c) => c.tone === 'p' || c.tone === 'y');
  const rest = cards.filter((c) => !open.includes(c));

  return (
    <section className="sec">
      <div className="sh">
        <span className="no">1</span>
        <h2>말하기 습관</h2>
      </div>
      <p className="sub">다섯 가지 말하기 습관을 살펴봤어요. 막대는 1→2→3단계로 이어진 흐름이에요.</p>
      {!voice ? (
        <Missing stage="1단계" path="/voice" loading={loading} />
      ) : (
        <>
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
            <p className="note">지금은 1단계 목소리만 살펴봐서 2·3단계 막대는 비어 있어요.</p>
          )}
          {open.length > 0 && <div className="five">{open.map((c) => c.el)}</div>}
          {rest.length > 0 && (
            <details className="more">
              <summary>
                {rest.every((c) => c.tone === 'g') ? '잘 되고 있는' : '나머지'} {rest.length}가지 자세히 보기
              </summary>
              <div className="five">{rest.map((c) => c.el)}</div>
            </details>
          )}
        </>
      )}
    </section>
  );
}

/** 줄 이름 · 그림 · 값이 한 줄씩 — 2단계와 실전 면접을 같은 눈금으로 나란히 */
function Pair({ rows }: { rows: { name: string; graph: ReactNode; value: string }[] }) {
  return (
    <div className="pair">
      {rows.map((r, i) => {
        const now = rows.length > 1 && i === rows.length - 1;
        return (
          <Fragment key={r.name}>
            <span className={now ? 'nm now' : 'nm'}>{r.name}</span>
            {r.graph}
            <span className={now ? 'v now' : 'v'}>{r.value}</span>
          </Fragment>
        );
      })}
    </div>
  );
}

const FlowBar = ({ segs }: { segs: { type: string; start: number; end: number }[] }) => (
  <div className="bar" aria-hidden>
    {segs.map((g, i) => (
      <i key={i} className={g.type} style={{ flex: Math.max(0.05, g.end - g.start) }} />
    ))}
  </div>
);

function FaceSection({
  face,
  loading,
  stage2,
  stage3,
}: {
  face: FaceReport | null;
  loading: boolean;
  stage2?: GazeBlinkResult;
  stage3?: GazeBlinkResult;
}) {
  const [lo, hi] = BLINK_NORMAL;
  const MAX = 50; // 막대 오른쪽 끝(1분 50번) — 화면 눈금용
  const runs = [
    ...(stage2 ? [{ name: '2단계 영상 통화', r: stage2 }] : []),
    ...(stage3 ? [{ name: '3단계 실전 면접', r: stage3 }] : []),
  ];
  const both = stage2 && stage3 ? buildStage3FaceLines(stage3, stage2) : null;
  const sec = (x: number) => `${Math.round(x * 10) / 10}초`;
  const gazeRuns = runs.filter((x) => x.r.gaze.segments.length > 0);
  const exprRuns = runs.filter((x) => x.r.expression.segments.length > 0);
  return (
    <section className="sec">
      <div className="sh">
        <span className="no">2</span>
        <h2>시선과 표정</h2>
      </div>
      <p className="sub">
        {stage3
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
              {both ? (
                <p className="big cmp">
                  <small>1분에</small> {Math.round(stage2!.blink.rate_per_min)}번 <span className="ar">→</span>{' '}
                  <span className="now">{Math.round(stage3!.blink.rate_per_min)}번</span>
                </p>
              ) : (
                face.blink.big && <p className="big">{face.blink.big}</p>
              )}
              <p className="d">{both?.blink ?? face.blink.line}</p>
            </div>
            {runs.length > 0 && (
              <div>
                <p className="what">편안한 범위와 비교</p>
                <Pair
                  rows={runs.map(({ name, r }) => ({
                    name,
                    value: `${Math.round(r.blink.rate_per_min)}번`,
                    graph: (
                      <div className="trk">
                        <i className="band" style={{ left: `${(lo / MAX) * 100}%`, width: `${((hi - lo) / MAX) * 100}%` }} />
                        <b className="dot" style={{ left: `${Math.min(100, (r.blink.rate_per_min / MAX) * 100)}%` }} />
                      </div>
                    ),
                  }))}
                />
                <div className="axis">
                  {[0, lo, hi, MAX].map((t) => (
                    <span key={t} style={{ left: `${(t / MAX) * 100}%` }}>
                      {t === 0 ? '0' : `${t}번`}
                    </span>
                  ))}
                  <em style={{ left: `${((lo + hi) / 2 / MAX) * 100}%` }}>편안한 범위</em>
                </div>
              </div>
            )}
          </div>

          <div className="fx">
            <div>
              <h3>
                눈 맞춤 <Tag c={face.gaze.chip} />
              </h3>
              <p className="what">한 번 볼 때 얼마나 오래 바라봤는지</p>
              {both ? (
                <p className="big cmp">
                  <small>평균</small> {sec(stage2!.gaze.avg_fixation_sec)} <span className="ar">→</span>{' '}
                  <span className="now">{sec(stage3!.gaze.avg_fixation_sec)}</span>
                </p>
              ) : (
                face.gaze.big && <p className="big">{face.gaze.big}</p>
              )}
              {(both?.gaze ?? face.gaze.line) && <p className="d">{both?.gaze ?? face.gaze.line}</p>}
            </div>
            {gazeRuns.length > 0 && (
              <div>
                <p className="what">대답하는 동안의 시선 흐름</p>
                <Pair rows={gazeRuns.map(({ name, r }) => ({ name, value: sec(r.gaze.avg_fixation_sec), graph: <FlowBar segs={r.gaze.segments} /> }))} />
                <div className="leg">
                  <span>바라본 시간</span>
                  <span className="a">다른 곳을 본 시간</span>
                </div>
              </div>
            )}
          </div>

          <div className="fx">
            <div>
              <h3>
                표정 <Tag c={face.expr.chip} />
              </h3>
              <p className="what">미소 지은 순간과 굳은(긴장한) 순간</p>
              {(both?.expr ?? face.expr.line) && <p className="d">{both?.expr ?? face.expr.line}</p>}
            </div>
            {exprRuns.length > 0 && (
              <div>
                <p className="what">대답하는 동안의 표정 흐름</p>
                <Pair
                  rows={exprRuns.map(({ name, r }) => ({
                    name,
                    value: `미소 ${Math.round(r.expression.smile_ratio * 100)}% · 굳음 ${Math.round(r.expression.tension_ratio * 100)}%`,
                    graph: <FlowBar segs={r.expression.segments} />,
                  }))}
                />
                <div className="leg">
                  <span className="s">미소</span>
                  <span className="t">굳은 순간</span>
                  <span className="n">평소 표정</span>
                </div>
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

/** 대답이 이어지는 묶음: 본 질문 하나 + 뒤따른 이어서 묻는 질문들 */
function groupTurns(turns: InterviewTranscriptTurn[]): InterviewTranscriptTurn[][] {
  return turns.reduce<InterviewTranscriptTurn[][]>((g, t) => {
    if (t.kind === 'main' || g.length === 0) g.push([t]);
    else g[g.length - 1].push(t);
    return g;
  }, []);
}

/** 3 실전 면접 돌아보기 — 질문을 하나씩 넘겨 보며 내 대답(말버릇·긴 멈춤 표시)을 다시 본다 */
function InterviewSection({
  interview,
  marks,
  marksStatus,
}: {
  interview: InterviewResult | null | undefined;
  marks: { question: string; script: string }[] | null;
  marksStatus: 'pending' | 'failed' | null;
}) {
  const [at, setAt] = useState(0);
  const [deleted, setDeleted] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(false);
  const groups = interview ? groupTurns(interview.turns) : [];
  const group = groups[Math.min(at, groups.length - 1)];
  const scriptOf = (t: InterviewTranscriptTurn) => marks?.find((m) => m.question === t.question)?.script;

  const handleDelete = async () => {
    if (!interview?.sessionId) return;
    if (!window.confirm('이 면접의 질문과 답변 기록을 삭제할까요?\n되돌릴 수 없어요.')) return;
    setDeleting(true);
    setDeleteError(false);
    try {
      await api.deleteInterviewSession(interview.sessionId);
      setDeleted(true);
    } catch {
      setDeleteError(true);
    }
    setDeleting(false);
  };

  return (
    <section className="sec">
      <div className="sh">
        <span className="no">3</span>
        <h2>실전 면접 돌아보기</h2>
      </div>
      <p className="sub">면접관의 질문과 내 대답을 하나씩 넘겨 보며 다시 봐요. 대답 내용은 평가하지 않아요.</p>
      {interview === undefined ? (
        <div className="empty">
          <span>3단계 기록을 불러오는 중이에요…</span>
        </div>
      ) : interview === null ? (
        <div className="empty">
          <span>끝까지 마친 3단계 면접 기록이 아직 없어요.</span>
          <Link to="/interview">3단계 하러 가기 →</Link>
        </div>
      ) : deleted ? (
        <p className="d">면접 기록을 삭제했어요. 질문과 답변이 서버에서 지워졌어요.</p>
      ) : (
        <div className="qv">
          {groups.length > 1 && (
            <div className="tabs" role="tablist">
              {groups.map((_, i) => (
                <button key={i} type="button" role="tab" aria-selected={i === at} className={i === at ? 'on' : ''} onClick={() => setAt(i)}>
                  질문 {i + 1}
                </button>
              ))}
            </div>
          )}
          {group && (
            <div className="qcard">
              {group.map((t, i) => {
                const script = scriptOf(t);
                return (
                  <div key={i} className={i ? 'fu' : undefined}>
                    <p className={i ? 'q2' : 'q1'}>{i ? `이어서 묻는 질문 · ${t.question}` : t.question}</p>
                    {script ? (
                      <Script t={script} />
                    ) : t.answer.trim() ? (
                      <div className="script">{t.answer}</div>
                    ) : (
                      <p className="d">이 질문은 대답을 남기지 않았어요.</p>
                    )}
                  </div>
                );
              })}
              {group.some((t) => scriptOf(t)) && (
                <div className="keys">
                  <span className="k1">말버릇</span>
                  <span className="k3">긴 멈춤</span>
                </div>
              )}
              {marksStatus === 'pending' && <p className="note">대답 목소리를 정리하고 있어요. 조금 뒤에 말버릇 표시가 나타나요.</p>}
              {marksStatus === 'failed' && <p className="note">이번엔 대답 목소리를 정리하지 못해서 말버릇 표시 없이 보여 드려요.</p>}
            </div>
          )}
          <div className="nav">
            <p className="foot">
              받아쓴 글이라 실제 말과 조금 다를 수 있어요 ·{' '}
              {interview.sessionId !== null ? (
                <>
                  기록은 내 계정에만 저장돼요{' '}
                  <button type="button" className="del" disabled={deleting} onClick={handleDelete}>
                    {deleting ? '삭제하는 중…' : '기록 삭제'}
                  </button>
                </>
              ) : (
                '이번 면접은 기록이 저장되지 않았어요'
              )}
              {deleteError && ' · 삭제하지 못했어요. 잠시 후 다시 해 주세요.'}
            </p>
            {at < groups.length - 1 && (
              <button type="button" className="next" onClick={() => setAt(at + 1)}>
                다음 질문 →
              </button>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

/** 4 다음 연습 계획 — 이번 기록에서 효과가 클 두 가지 */
function PlanSection({ plan }: { plan: PlanItem[] }) {
  return (
    <section className="sec">
      <div className="sh">
        <span className="no">4</span>
        <h2>다음 연습 계획</h2>
      </div>
      {plan.length ? (
        <>
          <p className="sub">이번 기록에서 효과가 가장 클 {plan.length === 1 ? '한 가지' : '두 가지'}를 골랐어요.</p>
          <div className="acts">
            {plan.map((p, i) => (
              <article key={p.title} className="act">
                <span className="ord">{i ? '둘' : '하나'}</span>
                <h3>{p.title}</h3>
                <p className="ev">{p.why}</p>
                <p className="how">{p.how}</p>
              </article>
            ))}
          </div>
        </>
      ) : (
        <p className="sub">이번엔 따로 고른 연습이 없어요. 지금처럼 해 봐요.</p>
      )}
    </section>
  );
}
