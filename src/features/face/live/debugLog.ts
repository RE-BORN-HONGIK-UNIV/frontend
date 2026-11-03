/**
 * 2단계 확인용 디버그(/face?debug=1) — 프레임마다 판정값을 모아 CSV로 내려받는다.
 * 하루 영상 통화(내 얼굴이 안 보임)에서 시선·미소 판정이 맞는지 팀이 직접 확인하고, 임계값을 바꿀 근거
 * (사람이 표시한 정답 대비 정확도)를 모으는 용도. 영상·얼굴 그림은 저장하지 않고 숫자만 남긴다.
 * 다음 단계(눈동자 기준값 보정, 말하면서 웃는 미소 기준)를 정하려면 이 기록을 여러 사람으로 모아야 한다 —
 * backend CLAUDE.md "임계값 숫자를 바꾸는 근거는 반드시 검증하고 나서" 규칙.
 */
export interface DebugSnapshot {
  /** 촬영 시작부터 초 */
  t: number;
  /** 지금 결과에 넣고 있는지(사용자가 대답하는 중) */
  measuring: boolean;
  detected: boolean;
  /** 캘리브레이션 기준 대비 고개 각도 차이(도) — 판정 기준 ±10도 */
  yawDev: number | null;
  pitchDev: number | null;
  /** 눈동자 치우침(눈 너비 대비) — 판정 기준 ±0.15, 기준값 보정 없음 */
  irisX: number | null;
  irisY: number | null;
  /** 지금 "하루를 보는 중"으로 판정되는지 */
  looking: boolean;
  smileRaw: number | null;
  jawOpen: number | null;
  /** jawOpen 게이트를 거친 미소 값 — 0.35 이상이면 미소 */
  smile: number | null;
  tension: number | null;
}

/** 확인하는 사람이 지금 실제로 하고 있는 것(정답) — 판정과 비교하려고 함께 적는다 */
export interface DebugLabels {
  gaze: '' | 'haru' | 'away';
  smile: '' | 'smile' | 'none';
}

const COLUMNS = [
  't', 'measuring', 'detected', 'yaw_dev', 'pitch_dev', 'iris_x', 'iris_y', 'looking',
  'smile_raw', 'jaw_open', 'smile', 'tension', 'label_gaze', 'label_smile',
] as const;

/** 3분 × 60fps 정도면 충분 — 너무 오래 켜 두어도 메모리가 끝없이 늘지 않게 */
const MAX_ROWS = 12_000;

const num = (v: number | null) => (v === null ? '' : String(Math.round(v * 1000) / 1000));

export function createFrameLog() {
  const rows: string[] = [];
  return {
    push(s: DebugSnapshot, labels: DebugLabels) {
      if (rows.length >= MAX_ROWS) return;
      rows.push(
        [
          num(s.t), s.measuring ? 1 : 0, s.detected ? 1 : 0, num(s.yawDev), num(s.pitchDev), num(s.irisX), num(s.irisY),
          s.looking ? 1 : 0, num(s.smileRaw), num(s.jawOpen), num(s.smile), num(s.tension), labels.gaze, labels.smile,
        ].join(','),
      );
    },
    count: () => rows.length,
    toCsv: () => [COLUMNS.join(','), ...rows].join('\n'),
  };
}
