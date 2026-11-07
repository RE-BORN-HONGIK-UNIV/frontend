import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { ReactNode } from 'react';
import { RADIUS } from './styleProps';

interface ModalProps {
  opened: boolean;
  onClose: () => void;
  title?: string;
  radius?: keyof typeof RADIUS;
  centered?: boolean;
  children?: ReactNode;
}

export function Modal({ opened, onClose, title, radius = 'md', children }: ModalProps) {
  useEffect(() => {
    if (!opened) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [opened, onClose]);

  if (!opened) return null;

  // body 바로 아래에 띄운다 — 머리줄(.rb-siteheader, position: relative + z-index 5) 안에서 그리면 그 층에 갇혀,
  // 화면에 따라 z-index가 더 큰 요소(사이드바·떠 있는 카드 등) 아래로 깔려 안 보일 수 있었다(로그아웃 확인 창)
  return createPortal(
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        background: 'rgba(35,40,38,0.45)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 480,
          maxHeight: '90dvh', overflowY: 'auto',
          background: 'var(--rb-surface)',
          borderRadius: RADIUS[radius] ?? RADIUS.md,
          padding: 24,
        }}
      >
        {title && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>{title}</h2>
            <button
              onClick={onClose}
              aria-label="닫기"
              style={{ border: 'none', background: 'transparent', fontSize: 18, cursor: 'pointer', color: 'var(--rb-ink-faint)' }}
            >
              ✕
            </button>
          </div>
        )}
        {children}
      </div>
    </div>,
    document.body,
  );
}
