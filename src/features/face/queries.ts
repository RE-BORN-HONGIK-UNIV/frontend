import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api/client';

export function useAnalyzeGazeBlink() {
  return useMutation({
    mutationFn: (file: File) => api.analyzeGazeBlink(file),
  });
}
