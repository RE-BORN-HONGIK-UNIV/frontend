import { dayKey } from './localProgress';

/**
 * 마이페이지 '연습 발자국' 카드 — '🔥 1일 연속 방문 중' 글자 대신, 꾸준히 올수록 자라는 식물과 최근 7일 발자국으로 보여 준다.
 * 불꽃(연속 기록 끊기면 사라짐)은 압박이 될 수 있어서, 하루 빠져도 지난 발자국은 남는 식물·점으로 바꿨다.
 */
export const PLANT_STAGES = [
  { min: 1, icon: '🌱', name: '새싹' },
  { min: 3, icon: '🌿', name: '어린잎' },
  { min: 5, icon: '🪴', name: '화분' },
  { min: 7, icon: '🌳', name: '나무' },
] as const;

/** 지금까지 방문한 날 수로 식물 단계와 다음 단계까지 남은 날 */
export function plantFor(totalDays: number): { icon: string; name: string; next: { name: string; left: number } | null } {
  const n = Math.max(1, totalDays);
  let i = 0;
  PLANT_STAGES.forEach((s, k) => {
    if (n >= s.min) i = k;
  });
  const next = PLANT_STAGES[i + 1];
  return { icon: PLANT_STAGES[i].icon, name: PLANT_STAGES[i].name, next: next ? { name: next.name, left: next.min - n } : null };
}

const WEEKDAY = ['일', '월', '화', '수', '목', '금', '토'];

/** 오늘까지 최근 7일 — 왼쪽이 6일 전, 오른쪽이 오늘 */
export function lastSevenDays(visits: string[], today = new Date()): { label: string; visited: boolean; today: boolean }[] {
  const set = new Set(visits);
  return Array.from({ length: 7 }, (_, k) => {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - (6 - k));
    return { label: WEEKDAY[d.getDay()], visited: set.has(dayKey(d)), today: k === 6 };
  });
}
