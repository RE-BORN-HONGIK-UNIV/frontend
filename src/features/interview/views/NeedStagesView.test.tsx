import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { NeedStagesView } from './NeedStagesView';

function renderView(props: Parameters<typeof NeedStagesView>[0]) {
  return render(
    <MemoryRouter initialEntries={['/interview']}>
      <Routes>
        <Route path="/interview" element={<NeedStagesView {...props} />} />
        <Route path="/voice" element={<div>VOICE_PAGE</div>} />
        <Route path="/face" element={<div>FACE_PAGE</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('NeedStagesView', () => {
  it('1단계만 없으면 1단계 안내와 이동 버튼만 보여주고, 누르면 /voice로 이동한다', () => {
    renderView({ missing: ['stage1'], failed: false, onRetry: vi.fn() });
    expect(screen.getByText('1단계 음성 분석이 먼저 필요해요')).toBeTruthy();
    expect(screen.queryByText('2단계 하러 가기')).toBeNull();
    fireEvent.click(screen.getByText('1단계 하러 가기'));
    expect(screen.getByText('VOICE_PAGE')).toBeTruthy();
  });

  it('2단계만 없으면 2단계 안내와 이동 버튼만 보여주고, 누르면 /face로 이동한다', () => {
    renderView({ missing: ['stage2'], failed: false, onRetry: vi.fn() });
    expect(screen.getByText('2단계 표정·시선 분석이 먼저 필요해요')).toBeTruthy();
    expect(screen.queryByText('1단계 하러 가기')).toBeNull();
    fireEvent.click(screen.getByText('2단계 하러 가기'));
    expect(screen.getByText('FACE_PAGE')).toBeTruthy();
  });

  it('둘 다 없으면 1·2단계를 먼저 하고 오라고 안내하고 두 버튼을 모두 보여준다', () => {
    renderView({ missing: ['stage1', 'stage2'], failed: false, onRetry: vi.fn() });
    expect(screen.getByText('먼저 1·2단계를 진행하고 와주세요')).toBeTruthy();
    expect(screen.getByText('1단계 하러 가기')).toBeTruthy();
    expect(screen.getByText('2단계 하러 가기')).toBeTruthy();
    expect(screen.queryByText('다시 불러오기')).toBeNull();
  });

  it('조회 실패면 다시 불러오기 버튼을 보여주고 누르면 onRetry를 호출한다', () => {
    const onRetry = vi.fn();
    renderView({ missing: ['stage1', 'stage2'], failed: true, onRetry });
    fireEvent.click(screen.getByText('다시 불러오기'));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
