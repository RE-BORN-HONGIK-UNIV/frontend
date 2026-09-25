/**
 * 실시간(웹캠) 얼굴 분석 모듈 공용 타입.
 *
 * backend/step2/*.py 포팅 원칙: MediaPipe FaceLandmarker(JS)가 주는 landmark는
 * 이미 0~1 정규화 좌표(x,y,z)라, 백엔드처럼 픽셀 단위로 재환산하지 않고 그대로
 * 쓴다 — EAR·iris offset 계산은 상대적 비율이라 정규화 좌표에서도 결과가 같고,
 * 머리 자세(estimate_head_pose)만 카메라 내부 파라미터 때문에 픽셀 크기(frame
 * width/height)가 실제로 필요해서 그쪽 모듈에서 frameSize를 따로 받는다.
 */

export interface Landmark3D {
  x: number;
  y: number;
  z: number;
}

export type FaceLandmarks = Landmark3D[] | null;

export interface Point2D {
  x: number;
  y: number;
}
