import { useEffect, useState } from 'react';

interface ToastItem {
  id: number;
  title?: string;
  message: string;
  color: 'brand' | 'red' | 'gray';
}

type Listener = (items: ToastItem[]) => void;

let items: ToastItem[] = [];
let nextId = 1;
const listeners = new Set<Listener>();

function emit() {
  for (const l of listeners) l([...items]);
}

const LIMIT = 3;
const AUTO_CLOSE_MS = 4000;

export function showToast(message: string, color: ToastItem['color'], title?: string) {
  const id = nextId++;
  items = [...items, { id, title, message, color }].slice(-LIMIT);
  emit();
  setTimeout(() => {
    items = items.filter((t) => t.id !== id);
    emit();
  }, AUTO_CLOSE_MS);
}

const TINT: Record<ToastItem['color'], { bg: string; fg: string }> = {
  brand: { bg: 'var(--rb-primary-deep)', fg: '#fff' },
  red: { bg: '#a32d2d', fg: '#fff' },
  gray: { bg: 'var(--rb-ink)', fg: '#fff' },
};

/** main.tsx에 한 번만 마운트. 어디서든 lib/toast의 toast.success(...) 등으로 띄움. */
export function Toaster() {
  const [list, setList] = useState<ToastItem[]>([]);
  useEffect(() => {
    listeners.add(setList);
    return () => { listeners.delete(setList); };
  }, []);

  return (
    <div
      style={{
        position: 'fixed', top: 16, left: '50%', transform: 'translateX(-50%)',
        zIndex: 200, display: 'flex', flexDirection: 'column', gap: 8,
        pointerEvents: 'none', width: 'min(90vw, 380px)',
      }}
    >
      {list.map((t) => {
        const tint = TINT[t.color];
        return (
          <div
            key={t.id}
            style={{
              background: tint.bg, color: tint.fg,
              borderRadius: 10, padding: '10px 14px',
              fontSize: 13, boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
              pointerEvents: 'auto',
            }}
          >
            {t.title && <div style={{ fontWeight: 700, marginBottom: 2 }}>{t.title}</div>}
            {t.message}
          </div>
        );
      })}
    </div>
  );
}
