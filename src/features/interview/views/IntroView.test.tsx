import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { IntroView } from './IntroView';

// 1·2단계 기록이 모두 있는 상태 → 추천 면접관이 정해져 시작 버튼이 나오는 화면까지 간다
vi.mock('@/lib/api/client', () => ({
  api: {
    latestStage1: vi.fn(async () => ({ result: { at: '2026-10-02T00:00:00', overallScore: 55 } })),
    latestGazeBlink: vi.fn(async () => ({ result: { at: '2026-10-02T00:00:00', overallScore: 55 } })),
  },
}));

describe('IntroView 안내', () => {
  it('동의 체크박스 없이, 무엇이 저장·전송되는지만 알린다 (영상·음성은 저장 안 함, 삭제 가능)', async () => {
    render(<IntroView onStart={vi.fn()} />);
    expect(await screen.findByText(/내 계정에 저장되고/)).toBeTruthy();
    expect(screen.getByText(/AI\(Anthropic\)에 전송돼요/)).toBeTruthy();
    expect(screen.getByText(/영상과 음성은 저장하지 않아요/)).toBeTruthy();
    expect(screen.getByText(/언제든 삭제할 수 있어요/)).toBeTruthy();
    expect(screen.queryByRole('checkbox')).toBeNull();
  });

  it('시작 버튼은 추가 확인 없이 선택한 면접관(tier)만 넘기고 바로 시작한다', async () => {
    const onStart = vi.fn();
    render(<IntroView onStart={onStart} />);
    fireEvent.click(await screen.findByText('면접 준비 시작하기'));
    expect(onStart).toHaveBeenCalledTimes(1);
    expect(onStart).toHaveBeenCalledWith('standard');
  });
});
