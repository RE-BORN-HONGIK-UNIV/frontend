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

// 카메라·얼굴 분석·하루 목소리는 가짜로 — face.phase로 상황을 바꾼다
const face = { phase: 'camera', faceDetected: true, calibrationSummary: null, calibrationStep: null, calibrationSec: 7, calibrationElapsedSec: 0, startCalibration: vi.fn(), getExpressionThresholds: () => ({ tension: 0.1, smile: 0.3 }) };
vi.mock('@/features/face/live/useLiveFaceSession', () => ({ useLiveFaceSession: () => face }));
vi.mock('@/features/haru/speech', () => ({ speak: vi.fn(async () => {}), stopSpeak: vi.fn() }));

const media = (tracks: { audio: boolean; video: boolean }) =>
  ({
    status: 'ready',
    stream: {
      getAudioTracks: () => (tracks.audio ? [{}] : []),
      getVideoTracks: () => (tracks.video ? [{}] : []),
    },
  }) as unknown as ReturnType<typeof useMediaPreview>;

const renderPrep = (m: ReturnType<typeof useMediaPreview>, onStart = vi.fn(), carried: { tension: number; smile: number } | null = null) =>
  render(
    <MemoryRouter>
      <Stage3PrepView media={m} onStart={onStart} carried={carried} />
    </MemoryRouter>,
  );

describe('3단계 면접 대기실', () => {
  it('동의 체크박스 없이, 무엇이 저장·전송되는지만 알린다 (영상·음성은 저장 안 함, 삭제 가능)', async () => {
    renderPrep(media({ audio: true, video: true }));
    expect(await screen.findByText(/내 계정에 저장되고/)).toBeTruthy();
    expect(screen.getByText(/AI로 보내요/)).toBeTruthy();
    expect(screen.getByText(/영상·음성은 저장하지 않고/)).toBeTruthy();
    expect(screen.queryByRole('checkbox')).toBeNull();
  });

  it('표정을 맞추기 전에는 들어갈 수 없고, 하루와 표정 맞추기를 시작할 수 있다', async () => {
    face.phase = 'camera';
    renderPrep(media({ audio: true, video: true }));
    expect(((await screen.findByText('준비됐어요')) as HTMLButtonElement).disabled).toBe(true);
    // 바로 시작하지 않고 3단계를 먼저 보여 준 뒤 "시작"으로
    fireEvent.click(screen.getByText('좋아요, 같이 풀어요'));
    expect(face.startCalibration).not.toHaveBeenCalled();
    expect(screen.getByText('살짝 찡그리기')).toBeTruthy();
    fireEvent.click(screen.getByText('시작'));
    expect(face.startCalibration).toHaveBeenCalled();
  });

  it('얼굴이 안 보이면 표정 맞추기를 시작할 수 없다', async () => {
    face.phase = 'camera';
    face.faceDetected = false;
    renderPrep(media({ audio: true, video: true }));
    expect(((await screen.findByText('얼굴이 보이면 시작할 수 있어요')) as HTMLButtonElement).disabled).toBe(true);
    face.faceDetected = true;
  });

  it('2단계에서 바로 이어 오면 맞춘 기준을 그대로 쓰고, 난이도와 함께 넘긴다', async () => {
    const onStart = vi.fn();
    renderPrep(media({ audio: true, video: true }), onStart, { tension: 0.2, smile: 0.4 });
    expect(screen.getByText(/방금 2단계에서 푼 표정/)).toBeTruthy();
    fireEvent.click(await screen.findByText('준비됐어요'));
    expect(onStart).toHaveBeenCalledWith('standard', { tension: 0.2, smile: 0.4 });
  });

  it('카메라가 없으면 표정 맞추기 없이 들어간다', async () => {
    face.phase = 'error';
    const onStart = vi.fn();
    renderPrep(media({ audio: true, video: false }), onStart);
    expect(screen.getByText('카메라 없이도 계속할 수 있어요')).toBeTruthy();
    fireEvent.click(await screen.findByText('준비됐어요'));
    expect(onStart).toHaveBeenCalledWith('standard', null);
  });

  it('마이크가 없으면 시작할 수 없다', async () => {
    face.phase = 'error';
    renderPrep(media({ audio: false, video: true }));
    const start = await screen.findByText('준비됐어요');
    expect((start as HTMLButtonElement).disabled).toBe(true);
  });
});
