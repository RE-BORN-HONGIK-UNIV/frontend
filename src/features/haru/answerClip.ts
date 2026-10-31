/**
 * 대답 하나를 따로 녹음해 두는 짧은 클립 — 브라우저 받아쓰기가 비었을 때(사파리·파이어폭스처럼 지원하지
 * 않거나, 인식 서버 오류) 서버 Whisper(/interview/transcribe)로 대신 받아쓰려고 쓴다. 3단계 면접과 같은 방식
 * (브라우저 인식 먼저, 비면 Whisper). 받아쓰기에만 쓰고 저장하지 않는다.
 */
export interface AnswerClip {
  /** 녹음을 멈추고 클립을 돌려준다. 녹음된 게 없으면 null */
  stop(): Promise<Blob | null>;
}

export function startClip(stream: MediaStream): AnswerClip | null {
  if (typeof MediaRecorder === 'undefined') return null;
  let rec: MediaRecorder;
  try {
    rec = new MediaRecorder(stream);
  } catch {
    return null;
  }
  const chunks: Blob[] = [];
  rec.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };
  rec.start();
  return {
    stop: () =>
      new Promise((resolve) => {
        if (rec.state === 'inactive') return resolve(null);
        rec.onstop = () => {
          const blob = new Blob(chunks, { type: rec.mimeType || 'audio/webm' });
          resolve(blob.size ? blob : null);
        };
        rec.stop();
      }),
  };
}
