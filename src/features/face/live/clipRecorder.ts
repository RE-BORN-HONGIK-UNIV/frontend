/**
 * 실시간 촬영 중 웹캠 영상을 브라우저 메모리에만 녹화한다(MediaRecorder).
 * 서버로는 안 보낸다 — 결과 화면의 하이라이트 재생(HighlightPlayer) 전용이고,
 * 화면을 벗어나면 blob URL이 해제돼 사라진다. 녹화는 부가 기능이라 미지원
 * 브라우저·오류에서는 조용히 null을 돌려 하이라이트만 빠지게 한다(분석 자체는 무관).
 */

/** 우선순위 순 — webm(VP9/VP8)은 Chrome·Firefox, mp4는 Safari. */
const CANDIDATE_MIME_TYPES = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm', 'video/mp4'];

/** 3분 촬영 기준 약 20MB — 하이라이트 확인용이라 화질보다 메모리를 아낀다. */
const VIDEO_BITS_PER_SECOND = 900_000;

export function pickRecorderMimeType(isTypeSupported: (type: string) => boolean): string | null {
  return CANDIDATE_MIME_TYPES.find((t) => isTypeSupported(t)) ?? null;
}

export interface ClipRecorder {
  /** 녹화가 실제로 시작된 시각(performance.now 기준 ms) — 세션 시각과 맞출 때 쓴다. */
  readonly startedAtMs: number;
  /** 녹화를 멈추고 영상 blob을 돌려준다. 데이터가 없거나 실패하면 null. */
  stop(): Promise<Blob | null>;
}

export function startClipRecorder(stream: MediaStream): ClipRecorder | null {
  try {
    if (typeof MediaRecorder === 'undefined') return null;
    const mimeType = pickRecorderMimeType((t) => MediaRecorder.isTypeSupported(t));
    if (!mimeType) return null;

    const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: VIDEO_BITS_PER_SECOND });
    const chunks: Blob[] = [];
    let startedAtMs = performance.now();
    recorder.onstart = () => {
      startedAtMs = performance.now();
    };
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };
    recorder.start(1000);

    return {
      get startedAtMs() {
        return startedAtMs;
      },
      stop: () =>
        new Promise<Blob | null>((resolve) => {
          if (recorder.state === 'inactive') {
            resolve(chunks.length > 0 ? new Blob(chunks, { type: mimeType }) : null);
            return;
          }
          recorder.onstop = () => resolve(chunks.length > 0 ? new Blob(chunks, { type: mimeType }) : null);
          recorder.onerror = () => resolve(null);
          try {
            recorder.stop();
          } catch {
            resolve(null);
          }
        }),
    };
  } catch {
    return null;
  }
}
