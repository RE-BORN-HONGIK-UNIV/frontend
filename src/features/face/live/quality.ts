/**
 * 실시간 촬영 결과를 저장·표시해도 되는지 판단하는 품질 게이트 (순수 함수).
 *
 * 얼굴이 거의 안 잡힌 촬영을 그대로 점수화하면 표정은 "미소 0·긴장 0 → 보통 50점",
 * 시선은 0점처럼 그럴듯한 숫자가 나와 이력에 저장되고 3단계 난이도에까지 반영된다 —
 * 그래서 저장 전에 막고 다시 촬영하게 한다. backend `step2/quality.py`와 같은 값·같은 기준.
 */

/**
 * 촬영 중 얼굴이 검출된 프레임 비율의 최소값. 0.5는 캘리브레이션 확인 UI
 * (LiveCaptureView의 "얼굴이 잘 인식됐어요" 기준)와 맞춘 값이다 — 실측으로
 * 최적화한 숫자가 아니라 "절반 이상 안 보이면 판정 근거가 부족하다"는 보수적
 * 기준이므로, 팀 촬영 데이터가 쌓이면 검출률 분포를 보고 조정할 것.
 */
export const MIN_FACE_DETECTED_RATIO = 0.5;

export type CaptureRejection =
  | { reason: 'no-frames'; detectedRatio: 0 }
  | { reason: 'low-face-ratio'; detectedRatio: number };

/** 통과면 null, 분석할 수 없으면 사유. */
export function checkCaptureQuality(
  totalFrames: number,
  detectedFrames: number,
  durationSec: number,
): CaptureRejection | null {
  if (totalFrames <= 0 || durationSec <= 0) return { reason: 'no-frames', detectedRatio: 0 };
  const ratio = detectedFrames / totalFrames;
  if (ratio < MIN_FACE_DETECTED_RATIO) return { reason: 'low-face-ratio', detectedRatio: ratio };
  return null;
}

/** 사용자에게 보여줄 안내 문구 — 원인 추정이 아니라 다음에 할 행동 중심으로. */
export function rejectionMessage(r: CaptureRejection): string {
  if (r.reason === 'no-frames') {
    return '촬영된 장면이 없어서 분석할 수 없어요. 촬영 시작 후 잠시 기다렸다가 종료해 주세요.';
  }
  return `촬영 중 얼굴이 ${Math.round(r.detectedRatio * 100)}%만 인식돼서 정확한 분석이 어려워요. 얼굴이 화면 안에 들어오고 조명이 밝은지 확인한 뒤 다시 촬영해 주세요.`;
}
