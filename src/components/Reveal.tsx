import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';

const prefersReducedMotion =
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Fades + slides children up into place whenever they scroll into view —
 * replays every time (scroll away and back), not just on first mount.
 * Wrap any section/card with this instead of rendering it directly.
 */
export function Reveal({
  children,
  delay = 0,
  y = 20,
}: {
  children: ReactNode;
  /** stagger delay in ms, e.g. index * 80 for a list of cards */
  delay?: number;
  /** starting offset in px */
  y?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(prefersReducedMotion);

  useEffect(() => {
    if (prefersReducedMotion) return;
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      { threshold: 0.15, rootMargin: '0px 0px -10% 0px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const style: CSSProperties = {
    opacity: visible ? 1 : 0,
    transform: visible ? 'translateY(0)' : `translateY(${y}px)`,
    transition: `opacity 0.6s ease ${delay}ms, transform 0.6s ease ${delay}ms`,
  };

  return (
    <div ref={ref} style={style}>
      {children}
    </div>
  );
}
