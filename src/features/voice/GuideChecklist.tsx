import { useState } from 'react';
import { SimpleGrid, Text } from '@/components/ui';

interface GuideItem {
  title: string;
  desc: string;
}

/** 확인 표시 — 누르기 전엔 빈 동그라미, 누르면 채워진 동그라미 안에 체크 */
function Mark({ on }: { on: boolean }) {
  return (
    <span
      aria-hidden
      style={{
        width: 22,
        height: 22,
        borderRadius: '100%',
        display: 'grid',
        placeItems: 'center',
        border: `2px solid ${on ? 'var(--rb-primary)' : 'var(--rb-line-strong)'}`,
        background: on ? 'var(--rb-primary)' : 'transparent',
        transition: 'background-color 150ms ease, border-color 150ms ease',
      }}
    >
      {on && (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 6 9 17l-5-5" />
        </svg>
      )}
    </span>
  );
}

/**
 * 1단계 시작 전 체크리스트 — 하나씩 눌러 "확인했어요"를 표시하면 연한 초록으로 바뀐다(다시 누르면 해제).
 * 스스로 준비를 확인하는 용도라 시작 버튼을 막지는 않는다(다 누르지 않아도 1단계를 시작할 수 있음).
 */
export function GuideChecklist({ items }: { items: GuideItem[] }) {
  const [checked, setChecked] = useState<Set<string>>(() => new Set());
  const toggle = (title: string) =>
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(title)) next.delete(title);
      else next.add(title);
      return next;
    });

  return (
    <SimpleGrid cols={{ base: 1, sm: 3 }} spacing={10}>
      {items.map((g) => {
        const on = checked.has(g.title);
        return (
          <button
            key={g.title}
            type="button"
            aria-pressed={on}
            onClick={() => toggle(g.title)}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              gap: 6,
              textAlign: 'left',
              cursor: 'pointer',
              font: 'inherit',
              background: on ? 'var(--rb-primary-tint)' : 'var(--rb-surface)',
              border: `1px solid ${on ? 'var(--rb-primary-light)' : 'var(--rb-line)'}`,
              borderRadius: 12,
              padding: '14px 14px',
              transition: 'background-color 150ms ease, border-color 150ms ease',
            }}
          >
            <Mark on={on} />
            <Text fz={14} fw={700} c="var(--rb-primary-strong)">
              {g.title}
            </Text>
            <Text fz={12} c="var(--rb-ink-soft)" style={{ lineHeight: 1.5 }}>
              {g.desc}
            </Text>
          </button>
        );
      })}
    </SimpleGrid>
  );
}
