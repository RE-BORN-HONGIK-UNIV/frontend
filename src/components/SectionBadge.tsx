import type { ReactNode } from 'react';

/** Pill badge used above section headings and in the hero. */
export function SectionBadge({ children }: { children: ReactNode }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        padding: '7px 15px',
        border: '1px solid var(--rb-line-strong)',
        borderRadius: 999,
        background: 'var(--rb-surface)',
        fontSize: 13,
        fontWeight: 600,
        letterSpacing: '0.02em',
        color: 'var(--rb-ink-soft)',
      }}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M12 3l1.7 5.1 5.3 1.9-5.3 1.9L12 17l-1.7-5.1L5 10l5.3-1.9z"
          fill="var(--rb-primary)"
        />
      </svg>
      {children}
    </span>
  );
}
