import { useMutation, useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import type { AnalyzeResult } from '@/lib/api/types';

export function useAnalyze() {
  return useMutation({
    mutationFn: (file: File) => api.analyze(file),
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
