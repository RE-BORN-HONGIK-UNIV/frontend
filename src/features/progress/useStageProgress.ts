import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { localProgress } from './localProgress';
import { resolveStage1Progress, resolveStage2Progress } from './stageProgress';

/**
 * 대시보드용 1·2단계 진행 상태 — 서버에 저장된 최신 분석 결과 기준.
 * 3단계의 난이도 산정(difficulty.ts getAnxietyScore)과 같은 API를 읽는다.
 * retry: 0 — 실패하면 바로 브라우저 기록으로 대신 보여주고, 대시보드가 재시도로 늦어지지 않게.
 */
export function useStageProgress() {
  const s1 = useQuery({ queryKey: ['progress', 'stage1'], queryFn: () => api.latestStage1(), retry: 0 });
  const s2 = useQuery({ queryKey: ['progress', 'stage2'], queryFn: () => api.latestGazeBlink(), retry: 0 });

  return {
    stage1: resolveStage1Progress(s1.status, s1.data?.result, localProgress.stage1()),
    stage2: resolveStage2Progress(s2.status, s2.data?.result, localProgress.stage2()),
  };
}
