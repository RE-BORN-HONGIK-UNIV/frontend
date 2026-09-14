import { useEffect } from 'react';
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

  return (
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
    </div>
  );
}
