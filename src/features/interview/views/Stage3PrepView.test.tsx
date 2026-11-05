import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Stage3PrepView } from './Stage3PrepView';
import type { useMediaPreview } from '../useMediaPreview';

// 1·2단계 기록이 모두 있는 상태(둘 다 55점 → 추천 면접관 standard)
vi.mock('@/lib/api/client', () => ({
  api: {
    latestStage1: vi.fn(async () => ({ result: { at: '2026-10-02T00:00:00', overallScore: 55 } })),
    latestGazeBlink: vi.fn(async () => ({ result: { at: '2026-10-02T00:00:00', overallScore: 55 } })),
  },
}));

const media = (tracks: { audio: boolean; video: boolean }) =>
  ({
    status: 'ready',
    stream: {
      getAudioTracks: () => (tracks.audio ? [{}] : []),
      getVideoTracks: () => (tracks.video ? [{}] : []),
    },
  }) as unknown as ReturnType<typeof useMediaPreview>;

const renderPrep = (m: ReturnType<typeof useMediaPreview>, onStart = vi.fn()) =>
  render(
    <MemoryRouter>
      <Stage3PrepView media={m} onStart={onStart} />
    </MemoryRouter>,
  );

describe('3단계 시작 화면(이제 실전 면접이에요)', () => {
  it('동의 체크박스 없이, 무엇이 저장·전송되는지만 알린다 (영상·음성은 저장 안 함, 삭제 가능)', async () => {
    renderPrep(media({ audio: true, video: true }));
    expect(await screen.findByText(/내 계정에 저장되고/)).toBeTruthy();
    expect(screen.getByText(/AI\(Anthropic\)에 전송돼요/)).toBeTruthy();
    expect(screen.getByText(/영상과 음성은 저장하지 않아요/)).toBeTruthy();
    expect(screen.queryByRole('checkbox')).toBeNull();
  });

  it('면접관을 고르지 않고, 1·2단계 점수로 정한 난이도를 넘기며 바로 시작한다', async () => {
    const onStart = vi.fn();
    renderPrep(media({ audio: true, video: false }), onStart);
    expect(screen.getByText('카메라 없이도 계속할 수 있어요')).toBeTruthy();
    fireEvent.click(await screen.findByText('면접실 입장하기'));
    expect(onStart).toHaveBeenCalledWith('standard');
  });

  it('마이크가 없으면 시작할 수 없다', async () => {
    renderPrep(media({ audio: false, video: true }));
    const start = await screen.findByText('면접실 입장하기');
    expect((start as HTMLButtonElement).disabled).toBe(true);
  });
});
