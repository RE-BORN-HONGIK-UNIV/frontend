import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Dashboard from './Dashboard';
import { localProgress } from '@/features/progress/localProgress';

function renderDashboard() {
  return render(
    <MemoryRouter>
      <Dashboard />
    </MemoryRouter>,
  );
}

describe('Dashboard 3단계 카드', () => {
  beforeEach(() => localStorage.clear());

  it('면접 전에는 안내 문구가 보이고 완료 배지는 없다', () => {
    renderDashboard();
    expect(screen.getByText(/맞춤형 난이도의 모의 면접을 진행합니다/)).toBeTruthy();
    expect(screen.queryByText(/모의 면접 완료/)).toBeNull();
    expect(screen.queryByText('준비 중')).toBeNull(); // 잠금 해제됨
  });

  it('면접을 마치면 면접관 이름과 함께 완료로 표시된다', () => {
    localProgress.markStage3Done('practice');
    renderDashboard();
    expect(screen.getByText('모의 면접 완료 · 서진 면접관')).toBeTruthy();
    expect(screen.getAllByText('완료 ✓').length).toBe(1);
  });

  it('1단계와 3단계를 모두 마치면 완료 배지가 두 개다', () => {
    localProgress.markStage1Done(80);
    localProgress.markStage3Done('warmup');
    renderDashboard();
    expect(screen.getAllByText('완료 ✓').length).toBe(2);
  });
});
