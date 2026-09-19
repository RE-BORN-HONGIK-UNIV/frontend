import { useMutation, useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import type { AnalyzeResult, CalibrationResult } from '@/lib/api/types';

/** 캘리브레이션(5초 무음+10초 낭독+자유발화) 녹음 업로드.
 * 결과는 오각형 차트/점수엔 안 들어가고, useAnalyze()에 넘겨서 filler 임계값 보정에만 쓰임. */
export function useCalibrate() {
  return useMutation({
    mutationFn: (file: File) => api.calibrate(file),
  });
}

export function useAnalyze() {
  return useMutation({
    // calibration은 선택 — 캘리브레이션을 건너뛰거나 실패해도 본 분석은 계속 진행되게
    mutationFn: ({ file, calibration }: { file: File; calibration?: CalibrationResult | null }) =>
      api.analyze(file, calibration),
  });
}

/** LLM coaching paragraph. retry:0 so a missing key / error falls back fast. */
export function useFeedback(result: AnalyzeResult | null) {
  return useQuery({
    queryKey: ['feedback', result?.scores ?? null],
    queryFn: () => api.feedback(result!),
    enabled: !!result,
    retry: 0,
    staleTime: Infinity,
  });
}