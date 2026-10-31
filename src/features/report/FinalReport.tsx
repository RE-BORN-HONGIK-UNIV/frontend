import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { api } from '@/lib/api/client';
import { auth } from '@/lib/auth';
import type { GazeBlinkLatest, Stage1Latest } from '@/lib/api/types';
import {
  BLINK_NORMAL,
  buildFaceReport,
  buildSummary,
  buildVoiceReport,
  VOICE_AXIS_LABELS,
  type Chip,
  type FaceReport,
  type VoiceReport,
} from './buildReport';
import { Pentagon } from './Pentagon';
import { loadStageDetails } from './stageDetails';
import './report.css';

/** 글 안의 **굵게**를 굵은 글씨로 (경량 웹과 같은 표기) */
const rich = (t: string) => t.split(/\*\*(.+?)\*\*/).map((s, i) => (i % 2 ? <b key={i}>{s}</b> : s));
const Tag = ({ c }: { c: Chip }) => <span className={`chip ${c.tone}`}>{c.text}</span>;

/** 이 기기에 남긴 1·2단계 세부값 → 없으면 서버의 최신 요약 점수로 대신 (기기를 바꾼 경우) */
function useStageReports() {
  const local = useMemo(() => loadStageDetails(), []);
  const [s1, setS1] = useState<Stage1Latest | null>(null);
  const [s2, setS2] = useState<GazeBlinkLatest | null>(null);
  const [loading, setLoading] = useState(!local.stage1 || !local.stage2);

  useEffect(() => {
    if (local.stage1 && local.stage2) return;
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
  }, [local]);

  const voice: VoiceReport | null = local.stage1
    ? buildVoiceReport(local.stage1)
    : s1
      ? buildVoiceReport({ at: s1.at, latest: s1 })
      : null;
  const face: FaceReport | null = local.stage2 ? buildFaceReport(local.stage2) : s2 ? buildFaceReport({ at: s2.at, latest: s2 }) : null;
  return { voice, face, loading };
}

/**
 * 최종 통합 리포트 — 3단계 면접을 마친 뒤 1·2·3단계를 한 장에 모은다(경량 웹 Result.tsx에서 가져옴).
 * 1·2단계는 단계마다 따로 결과를 보여 주지 않고 여기서 처음 보여 준다.
 *
 *   이번 연습 정리 → 1 말하기 습관(1단계) → 2 시선과 표정(2단계) → 3 실전 면접 돌아보기(기존 3단계 결과 화면)
 *
 * 값은 전부 실제 분석 결과다(경량 웹은 고정 예시였음). 없는 값은 칸을 만들지 않고, 단계 기록이 없으면 하러 가는 링크를 둔다.
 */
export function FinalReport({ answeredCount, interview }: { answeredCount: number; interview: ReactNode }) {
  const { voice, face, loading } = useStageReports();
  const summary = buildSummary(voice, face);
  const [today] = useState(() => new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' }));
  const name = auth.name;

  return (
    <main className="rb-report">
      <header>
        <h1>
          {name ? `${name} 님의` : '나의'} <em>연습 리포트</em>
        </h1>
        <div className="meta">
          <span className="t">3단계 완료</span>
          <span>{today}</span>
          <span>실전 면접 질문 {answeredCount}개에 대답</span>
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
      <FaceSection face={face} loading={loading} />

      <section className="sec">
        <div className="sh">
          <span className="no">3</span>
          <h2>실전 면접 돌아보기</h2>
        </div>
        <p className="sub">면접관과 나눈 질문과 대답을 다시 보고, 다음 한 걸음을 골라요. 대답 내용은 평가하지 않아요.</p>
        <div style={{ marginTop: 18 }}>{interview}</div>
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
                  <Tag c={h.chip} />
                </li>
              ))}
            </ul>
          </div>

          {(voice.fillers || voice.pauses) && (
            <div className="five">
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

function FaceSection({ face, loading }: { face: FaceReport | null; loading: boolean }) {
  const [lo, hi] = BLINK_NORMAL;
  const MAX = 50; // 막대 오른쪽 끝(1분 50번) — 화면 눈금용
  return (
    <section className="sec">
      <div className="sh">
        <span className="no">2</span>
        <h2>시선과 표정</h2>
      </div>
      <p className="sub">2단계에서 하루와 영상 통화하는 동안 카메라로 살펴봤어요. 영상은 저장하지 않았어요.</p>
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
            </div>
            {face.gaze.segments && face.gaze.segments.length > 0 && (
              <div>
                <p className="what">통화 동안의 시선 흐름</p>
                <div className="bar" style={{ marginTop: 10 }}>
                  {face.gaze.segments.map((g, i) => (
                    <i key={i} className={g.type} style={{ flex: Math.max(0.05, g.end - g.start) }} />
                  ))}
                </div>
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
              {face.expr.smilePct !== null && face.expr.tensionPct !== null && (
                <div className="vs">
                  <div>
                    <small>미소 지은 시간</small>
                    <b>{face.expr.smilePct}%</b>
                  </div>
                  <div>
                    <small>굳은 시간</small>
                    <b>{face.expr.tensionPct}%</b>
                  </div>
                </div>
              )}
              {face.expr.line && <p className="d">{face.expr.line}</p>}
            </div>
            {face.expr.segments && face.expr.segments.length > 0 && (
              <div>
                <p className="what">통화 동안의 표정 흐름</p>
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
