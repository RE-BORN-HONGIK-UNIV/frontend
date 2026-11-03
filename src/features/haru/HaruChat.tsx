import { useEffect, useRef, type ReactNode } from 'react';
import { HaruAvatar } from './HaruAvatar';
import { linkStyle } from './styles';
import type { useHaruTalk } from './useHaruTalk';

type Talk = ReturnType<typeof useHaruTalk>;

const STATUS = { speak: '말하고 있어요', ready: '기다리고 있어요', listen: '듣고 있어요', think: '생각하고 있어요', done: '대화를 마쳤어요' };

function Bubble({ ai, label, children, live }: { ai: boolean; label: string; children: ReactNode; live?: boolean }) {
  return (
    <div
      style={{
        alignSelf: ai ? 'flex-start' : 'flex-end',
        maxWidth: '78%',
        background: ai ? 'var(--rb-surface-tint)' : 'var(--rb-primary-tint)',
        border: live ? '1px dashed var(--rb-primary-light)' : '1px solid transparent',
        borderRadius: 16,
        padding: '14px 20px',
        fontSize: 16,
        lineHeight: 1.65,
        color: 'var(--rb-ink)',
      }}
    >
      <small style={{ display: 'block', fontSize: 12, color: 'var(--rb-ink-faint)', marginBottom: 4 }}>{label}</small>
      {children}
    </div>
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
export function HaruChat({ talk: t }: { talk: Talk }) {
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    box.current?.scrollTo({ top: box.current.scrollHeight });
  }, [t.log, t.phase, t.live]);

  const listening = t.phase === 'listen';
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
        <div ref={box} className="rb-haru-talk__log">
          {t.log.map((l, k) => (
            <Bubble key={k} ai={l.ai} label={l.ai ? '하루' : '내 대답'}>
              {l.text}
            </Bubble>
          ))}
          {listening && (
            <Bubble ai={false} label="말하는 중" live>
              {t.live || '…'}
            </Bubble>
          )}
          {t.phase === 'think' && (
            <Bubble ai label="하루">
              …
            </Bubble>
          )}
        </div>

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
