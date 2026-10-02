import { beforeEach, describe, expect, it } from 'vitest';
import { localProgress } from './localProgress';

describe('localProgress.stage3', () => {
  beforeEach(() => localStorage.clear());

  it('기록이 없으면 미완료 상태다', () => {
    expect(localProgress.stage3()).toEqual({ done: false, tier: null, at: null });
  });

  it('면접 완료를 기록하면 tier와 완료 시각이 남는다', () => {
    localProgress.markStage3Done('practice');
    const s3 = localProgress.stage3();
    expect(s3.done).toBe(true);
    expect(s3.tier).toBe('practice');
    expect(Number.isNaN(Date.parse(s3.at ?? ''))).toBe(false);
  });

  it('다시 완료하면 가장 최근 면접으로 덮어쓴다', () => {
    localProgress.markStage3Done('warmup');
    localProgress.markStage3Done('standard');
    expect(localProgress.stage3().tier).toBe('standard');
  });

  it('reset하면 미완료로 돌아간다', () => {
    localProgress.markStage3Done('standard');
    localProgress.resetStage3();
    expect(localProgress.stage3()).toEqual({ done: false, tier: null, at: null });
  });

  it('1단계 기록과 서로 영향을 주지 않는다', () => {
    localProgress.markStage1Done(80);
    localProgress.markStage3Done('standard');
    localProgress.resetStage3();
    expect(localProgress.stage1().done).toBe(true);
  });
});
