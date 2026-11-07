import { useCallback, useRef, useState, type RefObject } from 'react';
import type { DebugFrame } from './useLiveFaceSession';

/**
 * 2단계 정확도 검증용 기록(주소 뒤 ?debug=1일 때만 켜짐 — HaruCallView).
 *
 * 통화 동안 ① 카메라 영상(webm)과 ② 장면마다 MediaPipe가 잰 값(CSV, useLiveFaceSession onDebugFrame)을 모았다가
 * 통화를 끝낼 때 **이 컴퓨터에 내려받는다.** 서버로는 아무것도 보내지 않는다. 얼굴 영상은 민감정보라 검증이 끝나면
 * 지우도록 안내할 것.
 *
 * 내려받은 두 파일은 backend tests/labeling/extract_live_session.py로 대답 구간 사진을 뽑아 사람이 라벨링하고,
 * evaluate_live.py로 판정 정확도(시선·미소·긴장·깜빡임)를 계산한다. CSV의 video_t는 영상 안의 시각(초) —
 * 영상 녹화를 시작한 뒤 첫 장면의 세션 시각을 0으로 맞춘 값이다(한 장면, 30ms 안쪽 오차).
 */
const COLUMNS: (keyof DebugFrame)[] = [
  't',
  'calibrating',
  'answering',
  'face',
  'yaw',
  'pitch',
  'irisX',
  'irisY',
  'baseYaw',
  'basePitch',
  'baseIrisX',
  'baseIrisY',
  'smileRaw',
  'jawOpen',
  'smileApp',
  'tensionApp',
  'blinkScore',
  'calibStep',
  'bodyYaw',
  'bodyPitch',
  'bodyIrisX',
  'bodyIrisY',
  'lookDown',
  'lookUp',
  'lookH',
  'cheekSquint',
  'eyeSquint',
  'browDown',
  'browInnerUp',
  'baseTension',
];
// CSV 머리줄은 backend 스크립트가 읽기 쉽게 snake_case로
const HEADER = [
  't',
  'video_t',
  'calibrating',
  'answering',
  'face',
  'yaw',
  'pitch',
  'iris_x',
  'iris_y',
  'base_yaw',
  'base_pitch',
  'base_iris_x',
  'base_iris_y',
  'smile_raw',
  'jaw_open',
  'smile_app',
  'tension_app',
  'blink_score',
  // 2026-11 두 단계 캘리브레이션·판정 방식 변경용으로 추가 — 앞 칸 순서는 그대로(예전 CSV와 같은 스크립트로 읽힘)
  'calib_step',
  'body_yaw',
  'body_pitch',
  'body_iris_x',
  'body_iris_y',
  'look_down',
  'look_up',
  'look_h',
  'cheek_squint',
  'eye_squint',
  'brow_down',
  'brow_inner_up',
  'base_tension',
];

const cell = (v: unknown) => (v === null || v === undefined ? '' : typeof v === 'boolean' ? (v ? '1' : '0') : typeof v === 'number' ? String(Math.round(v * 10000) / 10000) : String(v));

function save(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export function useDebugRecorder(enabled: boolean, videoRef: RefObject<HTMLVideoElement | null>) {
  const rowsRef = useRef<string[]>([]);
  const recRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const videoStartRef = useRef<number | null>(null);
  const startedRef = useRef(false);
  const [count, setCount] = useState(0);
  const [recording, setRecording] = useState(false);
  const downloadedRef = useRef(false);
  const summarySavedRef = useRef(false);
  // 세 파일(영상·장면 값·요약)이 같은 이름으로 묶이게 시각을 한 번만 정한다
  const stampRef = useRef<string | null>(null);
  const stamp = () => (stampRef.current ??= new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-'));

  const onFrame = useCallback((f: DebugFrame) => {
    if (!enabled) return;
    if (startedRef.current && videoStartRef.current === null) videoStartRef.current = f.t;
    const videoT = videoStartRef.current === null ? null : f.t - videoStartRef.current;
    rowsRef.current.push([cell(f.t), cell(videoT), ...COLUMNS.slice(1).map((k) => cell(f[k]))].join(','));
    if (rowsRef.current.length % 30 === 0) setCount(rowsRef.current.length);
  }, [enabled]);

  /** 카메라가 켜지면 부른다 — 화면에 보이는 그 카메라 스트림을 그대로 녹화 */
  const start = useCallback(() => {
    if (!enabled || recRef.current || typeof MediaRecorder === 'undefined') return;
    const stream = videoRef.current?.srcObject;
    if (!(stream instanceof MediaStream)) return;
    const mime = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'].find((m) => MediaRecorder.isTypeSupported(m));
    const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
    rec.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    rec.start(1000);
    recRef.current = rec;
    startedRef.current = true;
    setRecording(true);
  }, [enabled, videoRef]);

  /** 녹화를 멈추고 영상(webm)과 장면 값(CSV)을 내려받는다. 한 번만 */
  const download = useCallback(
    () =>
      new Promise<void>((resolve) => {
        if (!enabled || downloadedRef.current) return resolve();
        downloadedRef.current = true;
        const finish = () => {
          const csv = [HEADER.join(','), ...rowsRef.current].join('\n');
          save(new Blob([csv], { type: 'text/csv' }), `reborn-stage2-${stamp()}.csv`);
          if (chunksRef.current.length) save(new Blob(chunksRef.current, { type: 'video/webm' }), `reborn-stage2-${stamp()}.webm`);
          setRecording(false);
          resolve();
        };
        const rec = recRef.current;
        if (rec && rec.state !== 'inactive') {
          rec.onstop = finish;
          rec.stop();
        } else finish();
      }),
    [enabled],
  );

  /**
   * 2단계 결과 요약(서버 Stage2Result에 저장되는 것과 같은 값) — 3단계 불안도 기준값(backend step3/anxiety.py)을
   * 사람별로 맞춰 보는 데 쓴다. 결과가 나오면 한 번 내려받는다(얼굴이 없는 숫자만).
   */
  const saveSummary = useCallback(
    (v: { avgFixationSec: number; blinkRatePerMin: number; tensionRatio: number; smileRatio: number }) => {
      if (!enabled || summarySavedRef.current) return;
      summarySavedRef.current = true;
      const csv = [
        'avg_fixation_sec,blink_rate_per_min,tension_ratio,smile_ratio',
        [v.avgFixationSec, v.blinkRatePerMin, v.tensionRatio, v.smileRatio].map(cell).join(','),
      ].join('\n');
      save(new Blob([csv], { type: 'text/csv' }), `reborn-stage2-${stamp()}-summary.csv`);
    },
    [enabled],
  );

  return { onFrame, start, download, saveSummary, count, recording };
}
