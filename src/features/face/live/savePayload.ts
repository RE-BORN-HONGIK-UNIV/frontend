import type { GazeBlinkResult, LiveSavePayload } from '@/lib/api/types';

/**
 * 실시간 촬영 결과(GazeBlinkResult)에서 서버 저장용 숫자 요약만 뽑는다.
 * 영상·프레임·구간(segments)은 보내지 않는다 — 얼굴 영상이 서버로 안 나가는 게
 * 실시간 모드의 설계 원칙이고, 서버(Stage2Result)도 이 요약 컬럼만 쓴다.
 */
export function buildLiveSavePayload(result: GazeBlinkResult): LiveSavePayload {
  return {
    blinkRatePerMin: result.blink.rate_per_min,
    blinkStatus: result.blink.status,
    blinkScore: result.blink.score,
    avgFixationSec: result.gaze.avg_fixation_sec,
    gazeScore: result.gaze.score,
    smileRatio: result.expression.smile_ratio,
    tensionRatio: result.expression.tension_ratio,
    expressionScore: result.expression.score,
    expressionStatus: result.expression.status,
  };
}
