import { useEffect, useRef, useState, type ReactNode } from 'react';
import { HaruAvatar } from './HaruAvatar';
import { linkStyle } from './styles';
import type { useHaruTalk } from './useHaruTalk';

type Talk = ReturnType<typeof useHaruTalk>;

const STATUS = { speak: '말하고 있어요', ready: '기다리고 있어요', listen: '듣고 있어요', think: '생각하고 있어요', done: '대화를 마쳤어요' };

/** 카톡처럼 "오후 3:12" */
const fmtTime = (d: Date) =>
  `${d.getHours() < 12 ? '오전' : '오후'} ${d.getHours() % 12 || 12}:${String(d.getMinutes()).padStart(2, '0')}`;

/**
 * 말풍선 한 줄 — 카카오톡처럼: 하루 메시지는 왼쪽에 프로필 사진·이름, 내 대답은 오른쪽.
 * first: 같은 사람이 연달아 보낸 메시지 중 첫 번째 — 사진·이름·말풍선 꼬리는 첫 번째에만 붙는다.
 * time: 연달아 보낸 메시지 중 마지막에만 말풍선 옆 아래에 작게(카톡처럼). unread: 내 말풍선 옆 노란 "1"(아직 안 읽음).
 * 새 줄은 아래에서 살짝 올라오며 나타난다(index.css .rb-chat__row 애니메이션 — 움직임 줄이기 설정이면 없음).
 */
function Bubble({
  ai,
  first,
  children,
  live,
  time,
  unread,
}: {
  ai: boolean;
  first: boolean;
  children: ReactNode;
  live?: boolean;
  time?: string;
  unread?: boolean;
}) {
  const bubble = (
    <div
      className={`rb-chat__bubble${ai ? '' : ' rb-chat__bubble--me'}${first ? ' rb-chat__bubble--tail' : ''}`}
      data-live={live || undefined}
    >
      {children}
    </div>
  );
  const meta =
    time || unread ? (
      <span className="rb-chat__meta" aria-hidden>
        {unread && <span className="rb-chat__unread">1</span>}
        {time && <span className="rb-chat__time">{time}</span>}
      </span>
    ) : null;
  if (!ai)
    return (
      <div className={`rb-chat__row rb-chat__row--me${first ? ' rb-chat__row--first' : ''}`}>
        {meta}
        {bubble}
      </div>
    );
  return (
    <div className={`rb-chat__row${first ? ' rb-chat__row--first' : ''}`}>
      {/* 연달아 보낸 메시지는 사진 자리만 비워 두고 말풍선을 나란히 */}
      {first ? <span className="rb-chat__avatar" role="img" aria-label="하루" /> : <span className="rb-chat__avatar-gap" aria-hidden />}
      <div className="rb-chat__col">
        {first && <span className="rb-chat__name">하루</span>}
        <div className="rb-chat__line">
          {bubble}
          {meta}
        </div>
      </div>
    </div>
  );
}

/** 카톡 "입력 중" — 말풍선 안 점 세 개가 차례로 통통 튄다 */
function Typing() {
  return (
    <span className="rb-chat__typing" role="status" aria-label="하루가 입력하고 있어요">
      <i />
      <i />
      <i />
    </span>
  );
}

function MicIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
    </svg>
  );
}

/** 듣는 중 표시 — 경량 웹처럼 소리 막대 5개가 파동처럼 오르내린다(index.css .rb-wave, 움직임 줄이기 설정이면 멈춤) */
function Wave() {
  return (
    <span className="rb-wave" aria-hidden>
      <i />
      <i />
      <i />
      <i />
      <i />
    </span>
  );
}

/**
 * 1단계 하루와 목소리 대화 — 경량 웹 Talk1 배치: 왼쪽 하루 칸(그림·이름·상태), 오른쪽 대화 칸(말풍선 + 하단 마이크 바).
 * 대답은 글이 아니라 목소리로 한다. 받아쓴 글은 하루가 반응할 거리로만 쓰고 화면에 함께 보여 준다.
 * 좁은 화면 배치(위아래로 쌓기)는 index.css의 .rb-haru-talk.
 */
/** 대화가 끝났을 때 하단 바에 보여 줄 것 — 1단계: 화면을 넘기지 않고 대화를 둔 채 "2단계 시작하기" */
export interface DoneBar {
  title: string;
  sub: string;
  actions: ReactNode;
}

export function HaruChat({ talk: t, doneBar }: { talk: Talk; doneBar?: DoneBar }) {
  const box = useRef<HTMLDivElement>(null);
  // 메시지마다 처음 화면에 나온 시각 — 대화 기록(useHaruTalk)에는 시각이 없어서 여기서 적어 둔다
  const timesRef = useRef<string[]>([]);
  while (timesRef.current.length < t.log.length) timesRef.current.push(fmtTime(new Date()));

  // 읽음 표시: 내가 보낸 마지막 말은 잠깐 "1"이 떠 있다가 하루가 읽으면(0.8초 뒤) 사라지고 "입력 중"이 나온다
  // 화면을 열었을 때 이미 있던 메시지(다시 그려진 경우 등)는 읽은 것으로 시작한다
  const [readCount, setReadCount] = useState(() => t.log.length);
  useEffect(() => {
    if (readCount >= t.log.length) return;
    const id = setTimeout(() => setReadCount(t.log.length), 800);
    return () => clearTimeout(id);
  }, [t.log.length, readCount]);

  // 새 메시지가 오면 카톡처럼 아래로 부드럽게 따라 내려간다(처음 한 번은 바로)
  const scrolledOnce = useRef(false);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: scrolledOnce.current ? 'smooth' : 'auto' });
    scrolledOnce.current = true;
  }, [t.log, t.phase, t.live, readCount]);

  const listening = t.phase === 'listen';
  // 마지막 줄을 누가 보냈는지 — 말하는 중·생각하는 중 말풍선도 같은 사람이 이어 보내면 사진·꼬리를 다시 붙이지 않는다
  const lastIsMine = t.log.length > 0 && !t.log[t.log.length - 1].ai;
  const canStart = t.phase === 'ready';
  const bar: Record<Exclude<typeof t.phase, 'done'>, { title: string; sub: string }> = {
    ready: { title: '버튼을 누르고 말해요', sub: '천천히 말해도 괜찮아요' },
    listen: { title: '다 말했으면 버튼을 눌러요', sub: '듣고 있어요' },
    speak: { title: '하루가 말하고 있어요', sub: '하루 말이 끝나면 말할 수 있어요' },
    think: { title: '하루가 생각하고 있어요', sub: '잠시만 기다려 주세요' },
  };

  return (
    <div className="rb-haru-talk">
      {/* 왼쪽: 하루 칸 */}
      <aside className="rb-haru-talk__haru">
        <HaruAvatar phase={t.phase} style={{ width: '100%', aspectRatio: '1 / 1', borderRadius: '50%' }} />
        <div className="rb-haru-talk__who">
          <strong style={{ fontSize: 22, color: 'var(--rb-ink)' }}>하루</strong>
          <span aria-live="polite" style={{ fontSize: 15, color: 'var(--rb-ink-soft)' }}>
            {STATUS[t.phase]}
          </span>
          <span className="rb-haru-talk__hint">대답은 글이 아니라 목소리로 해요</span>
        </div>
      </aside>

      {/* 오른쪽: 대화 칸 */}
      <section className="rb-haru-talk__chat" aria-label="하루와 나눈 대화">
        {/* 카톡 채팅방처럼 위에 대화 상대 이름 줄 */}
        <header className="rb-chat__head">
          <span className="rb-chat__head-avatar" aria-hidden />
          <strong>하루</strong>
          <span className="rb-chat__head-st">{STATUS[t.phase]}</span>
        </header>
        <div ref={box} className="rb-haru-talk__log">
          {t.log.map((l, k) => {
            const lastOfGroup = k === t.log.length - 1 || t.log[k + 1].ai !== l.ai;
            return (
              <Bubble
                key={k}
                ai={l.ai}
                first={k === 0 || t.log[k - 1].ai !== l.ai}
                time={lastOfGroup ? timesRef.current[k] : undefined}
                unread={!l.ai && k >= readCount}
              >
                {l.text}
              </Bubble>
            );
          })}
          {listening && (
            <Bubble ai={false} first={!lastIsMine} live>
              {t.live || '말하는 중…'}
            </Bubble>
          )}
          {/* 하루가 읽은 뒤에 "입력 중" 점 세 개 — 카톡에서 답장이 오기 직전처럼 */}
          {t.phase === 'think' && readCount >= t.log.length && (
            <Bubble ai first={lastIsMine}>
              <Typing />
            </Bubble>
          )}
        </div>

        {t.phase === 'done' && doneBar && (
          <div className="rb-haru-talk__bar">
            <span className="rb-haru-talk__mic" data-done aria-hidden>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6 9 17l-5-5" />
              </svg>
            </span>
            <div style={{ flex: '1 1 160px', minWidth: 0 }} aria-live="polite">
              <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--rb-ink)' }}>{doneBar.title}</div>
              <div style={{ fontSize: 14, color: 'var(--rb-ink-soft)', marginTop: 2 }}>{doneBar.sub}</div>
            </div>
            <div className="rb-haru-talk__aside">{doneBar.actions}</div>
          </div>
        )}

        {t.phase !== 'done' && (
          <div className="rb-haru-talk__bar">
            <button
              type="button"
              className="rb-haru-talk__mic"
              data-listening={listening || undefined}
              disabled={!canStart && !listening}
              aria-label={listening ? '답변 마치기' : '말하기 시작'}
              onClick={() => (listening ? void t.finish() : t.start())}
            >
              {listening ? <Wave /> : <MicIcon />}
            </button>
            <div style={{ flex: '1 1 160px', minWidth: 0 }}>
              <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--rb-ink)' }}>{bar[t.phase].title}</div>
              <div style={{ fontSize: 14, color: 'var(--rb-ink-soft)', marginTop: 2 }}>{bar[t.phase].sub}</div>
            </div>
            <div className="rb-haru-talk__aside">
              <span style={{ fontSize: 14, color: 'var(--rb-ink-soft)', whiteSpace: 'nowrap' }}>
                질문 {Math.min(t.index + 1, t.total)} / {t.total}
              </span>
              {canStart && (
                <>
                  <button type="button" onClick={t.replay} style={linkStyle}>
                    다시 들려주세요
                  </button>
                  <button type="button" onClick={() => void t.finish(true)} style={linkStyle}>
                    이 질문은 대답하지 않고 넘어갈게요
                  </button>
                </>
              )}
              {listening && (
                <button type="button" onClick={t.again} style={linkStyle}>
                  처음부터 다시 말할게요
                </button>
              )}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
