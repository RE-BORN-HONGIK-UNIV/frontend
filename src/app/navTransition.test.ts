import { describe, expect, it } from 'vitest';
import { navKind, stageIndex } from './navTransition';

describe('화면 전환 방식', () => {
  it('훈련 단계 순서', () => {
    expect(stageIndex('/voice')).toBe(0);
    expect(stageIndex('/report?session=3')).toBe(3);
    expect(stageIndex('/dashboard')).toBe(-1);
  });

  it('훈련 단계끼리는 진행 방향으로 슬라이드, 나머지는 크로스페이드', () => {
    expect(navKind('/voice', '/face')).toBe('forward');
    expect(navKind('/face', '/interview')).toBe('forward');
    expect(navKind('/interview', '/voice')).toBe('back');
    expect(navKind('/', '/voice')).toBe('fade');
    expect(navKind('/voice', '/dashboard')).toBe('fade');
    expect(navKind('/face', '/face')).toBe('fade');
  });
});
