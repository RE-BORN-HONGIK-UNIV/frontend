import { useCallback, useRef, useState } from 'react';

// 이미 켜져 있는 스트림을 받아서 녹화만 담당하는 훅.
// 카메라/마이크 자체는 useMediaPreview가 이미 켜둔 것을 재사용함.
export function useRecorder(stream: MediaStream | null) {
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const [isRecording, setIsRecording] = useState(false);

  const start = useCallback(() => {
    if (!stream) return;
    chunksRef.current = [];

    const recorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    recorder.start();
    recorderRef.current = recorder;
    setIsRecording(true);
  }, [stream]);

  // 녹화 종료 -> 결과 Blob을 Promise로 돌려줌
  const stop = useCallback((): Promise<Blob | null> => {
    return new Promise((resolve) => {
      const recorder = recorderRef.current;
      if (!recorder) {
        resolve(null);
        return;
      }
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
        setIsRecording(false);
        resolve(blob);
      };
      recorder.stop();
    });
  }, []);

  return { isRecording, start, stop };
}