import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { StageHeader } from './StageHeader';
import { localProgress } from '@/features/progress/localProgress';

const renderAt = (current: 1 | 2 | 3 | 4) =>
  render(
    <MemoryRouter>
      <StageHeader current={current} />
    </MemoryRouter>,
  );

describe('StageHeader — 경량 웹 단계 표시 상단바', () => {
  beforeEach(() => localStorage.clear());

  it('지금 단계를 표시하고, 마친 단계는 번호 대신 체크 + (마침)으로 읽힌다', () => {
    localProgress.markStage1Done(70);
    renderAt(2);
    const steps = within(screen.getByRole('navigation', { name: '훈련 단계' })).getAllByRole('listitem');
    const labeled = steps.filter((li) => li.textContent);
    expect(labeled.map((li) => li.textContent)).toEqual(['목소리 대화 (마침)', '2영상 통화', '3실전 면접', '4결과']);
    expect(labeled[1]).toHaveAttribute('aria-current', 'step');
    expect(labeled[0]).not.toHaveAttribute('aria-current');
  });

  it('"그만하기"는 대시보드로, 로고는 메인으로 간다', () => {
    renderAt(1);
    expect(screen.getByRole('link', { name: '그만하기' })).toHaveAttribute('href', '/dashboard');
    expect(screen.getByRole('link', { name: '메인 화면으로' })).toHaveAttribute('href', '/');
  });
});
