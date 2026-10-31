import { useEffect, useRef } from 'react';
import { Button, Group, Text } from '@/components/ui';
import { HaruAvatar } from './HaruAvatar';
import { linkStyle } from './styles';
import type { useHaruTalk } from './useHaruTalk';

type Talk = ReturnType<typeof useHaruTalk>;

const STATUS = { speak: '말하고 있어요', ready: '기다리고 있어요', listen: '듣고 있어요', think: '생각하고 있어요', done: '대화를 마쳤어요' };

function Bubble({ ai, label, children, live }: { ai: boolean; label: string; children: React.ReactNode; live?: boolean }) {
  return (
    <div
      style={{
        alignSelf: ai ? 'flex-start' : 'flex-end',
        maxWidth: '82%',
        background: ai ? 'var(--rb-surface)' : 'var(--rb-primary-tint)',
        border: `1px ${live ? 'dashed' : 'solid'} ${ai ? 'var(--rb-line)' : 'var(--rb-primary-light)'}`,
        borderRadius: ai ? '4px 14px 14px 14px' : '14px 4px 14px 14px',
        padding: '10px 14px',
        fontSize: 15,
        lineHeight: 1.6,
      }}
    >
      <small style={{ display: 'block', fontSize: 11, color: 'var(--rb-ink-faint)', marginBottom: 2 }}>{label}</small>
      {children}
    </div>
  );
}

/**
 * 1단계 하루와 목소리 대화 — 경량 웹 Talk1(채팅 모양 + 목소리로 대답)을 팀 UI 컴포넌트로 옮긴 것.
 * 대답은 글이 아니라 목소리로 한다. 받아쓴 글은 하루가 반응할 거리로만 쓰고 화면에 함께 보여 준다.
 */
export function HaruChat({ talk: t }: { talk: Talk }) {
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    box.current?.scrollTo({ top: box.current.scrollHeight });
  }, [t.log, t.phase, t.live]);

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <Group gap={12} wrap="nowrap" align="center">
        <HaruAvatar phase={t.phase} style={{ width: 96, flex: '0 0 96px', borderRadius: 12 }} />
        <div>
          <Text fz={16} fw={700}>
            하루
          </Text>
          <Text fz={13} c="var(--rb-ink-soft)" aria-live="polite">
            {STATUS[t.phase]}
          </Text>
          <Text fz={12} c="var(--rb-ink-faint)">
            대답은 글이 아니라 목소리로 해요 · 질문 {Math.min(t.index + 1, t.total)} / {t.total}
          </Text>
        </div>
      </Group>

      <div
        ref={box}
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          maxHeight: 380,
          minHeight: 220,
          overflowY: 'auto',
          padding: 14,
          background: 'var(--rb-bg)',
          border: '1px solid var(--rb-line)',
          borderRadius: 14,
        }}
      >
        {t.log.map((l, k) => (
          <Bubble key={k} ai={l.ai} label={l.ai ? '하루' : '내 대답'}>
            {l.text}
          </Bubble>
        ))}
        {t.phase === 'listen' && (
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
        <div style={{ display: 'grid', gap: 8 }}>
          {t.phase === 'listen' ? (
            <>
              <Button fullWidth radius="md" onClick={() => void t.finish()}>
                ✓ 답변 마치기
              </Button>
              <Group justify="center" gap={16}>
                <button type="button" onClick={t.again} style={linkStyle}>
                  처음부터 다시 말할게요
                </button>
              </Group>
            </>
          ) : (
            <>
              <Button fullWidth radius="md" disabled={t.phase !== 'ready'} onClick={t.start}>
                {t.phase === 'ready' ? '🎙 말하기 시작' : t.phase === 'think' ? '하루가 생각하고 있어요…' : '하루 말이 끝나면 말할 수 있어요'}
              </Button>
              {t.phase === 'ready' && (
                <Group justify="center" gap={16}>
                  <button type="button" onClick={t.replay} style={linkStyle}>
                    다시 들려주세요
                  </button>
                  <button type="button" onClick={() => void t.finish(true)} style={linkStyle}>
                    이 질문은 대답하지 않고 넘어갈게요
                  </button>
                </Group>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
