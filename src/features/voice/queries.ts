import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import type { CalibrationResult } from '@/lib/api/types';
import { localProgress } from '@/features/progress/localProgress';
import { saveStage1Detail } from '@/features/report/stageDetails';
import { overallScore } from './feedback';
import { toast } from '@/lib/toast';

/** 캘리브레이션(5초 무음+10초 낭독+자유발화) 녹음 업로드.
 * 결과는 오각형 차트/점수엔 안 들어가고, useAnalyze()에 넘겨서 filler 임계값 보정에만 쓰임. */
export function useCalibrate() {
  return useMutation({
    mutationFn: (file: File) => api.calibrate(file),
  });
}

/**
 * 1단계 목소리 분석. 결과 저장(대시보드 완료 메모 + 최종 리포트용 세부값)을 컴포넌트가 아니라 여기서 한다 —
 * 1단계가 끝나면 분석이 끝나길 기다리지 않고 바로 "2단계 시작하기"로 넘어갈 수 있게 해서, 화면이 바뀐 뒤에
 * 분석이 끝나도 저장돼야 하기 때문(useMutation 옵션의 콜백은 화면이 사라져도 불린다. mutate()에 넘기는 콜백은 안 불림).
 * 실패하면 어느 화면에 있든 알림으로 알린다.
 */
export function useAnalyze() {
  return useMutation({
    // calibration은 선택 — 캘리브레이션을 건너뛰거나 실패해도 본 분석은 계속 진행되게
    mutationFn: ({ file, calibration }: { file: File; calibration?: CalibrationResult | null; turnStarts?: number[] }) =>
      api.analyze(file, calibration),
    onSuccess: (result, { turnStarts }) => {
      localProgress.markStage1Done(overallScore(result.scores));
      saveStage1Detail(result, turnStarts ?? []);
    },
    onError: () => {
      toast.error('1단계 목소리를 정리하지 못했어요. 1단계 화면에서 다시 보내거나 다시 이야기해 주세요.');
    },
  });
}
