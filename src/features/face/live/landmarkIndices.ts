/**
 * backend/step2/landmark_face_points.py 1:1 포팅 — MediaPipe 478점 얼굴 메시
 * 인덱스. iris/blendshape가 활성화된 FaceLandmarker(JS)도 같은 478점 메시를
 * 쓰기 때문에 인덱스 값을 그대로 재사용한다.
 */

export const LEFT_EYE_EAR_IDX = [33, 160, 158, 133, 153, 144];
export const RIGHT_EYE_EAR_IDX = [362, 385, 387, 263, 373, 380];

export const POSE_LANDMARK_IDX = {
  noseTip: 1,
  chin: 152,
  leftEyeCorner: 33,
  rightEyeCorner: 263,
  leftMouth: 61,
  rightMouth: 291,
} as const;

export const LEFT_IRIS_IDX = [468, 469, 470, 471, 472];
export const RIGHT_IRIS_IDX = [473, 474, 475, 476, 477];
