import type { CSSProperties } from 'react';

/** 하루 화면의 작은 글씨 버튼(다시 듣기·넘어가기 등) — 주 버튼보다 눈에 덜 띄게 */
export const linkStyle: CSSProperties = {
  border: 'none',
  background: 'none',
  padding: 4,
  cursor: 'pointer',
  fontSize: 13,
  color: 'var(--rb-ink-faint)',
  textDecoration: 'underline',
};
