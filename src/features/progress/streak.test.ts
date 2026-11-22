import { describe, expect, it } from 'vitest';
import { lastSevenDays, plantFor } from './streak';

describe('연습 발자국', () => {
  it('방문한 날 수만큼 식물이 자란다', () => {
    expect(plantFor(1)).toMatchObject({ icon: '🌱', next: { name: '어린잎', left: 2 } });
    expect(plantFor(4)).toMatchObject({ icon: '🌿', next: { name: '화분', left: 1 } });
    expect(plantFor(9)).toMatchObject({ icon: '🌳', next: null });
  });

  it('최근 7일: 오른쪽 끝이 오늘, 방문한 날 표시', () => {
    const days = lastSevenDays(['2026-11-05', '2026-11-07'], new Date(2026, 10, 7));
    expect(days.map((d) => d.label)).toEqual(['일', '월', '화', '수', '목', '금', '토']);
    expect(days.map((d) => d.visited)).toEqual([false, false, false, false, true, false, true]);
    expect(days[6].today).toBe(true);
  });
});
