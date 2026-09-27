import { useEffect, useRef, useState } from 'react';

/**
 * Phase 0 스파이크 — 점수 계산 로직 없이 @mediapipe/tasks-vision이 이 프로젝트
 * (Vite 8/rolldown, 자체 호스팅 WASM)에서 실제로 로딩·동작하는지만 확인하는
 * 용도. dev/build 둘 다에서 확인 후, 확인 끝나면 이 파일과 라우트는 지운다
 * (계획 문서 compressed-cuddling-firefly.md의 "Phase 0" 참고).
 *
 * 확인 항목:
 * - WASM(public/mediapipe/wasm/)이 dev/build 양쪽에서 로딩되는가
 * - 웹캠 프레임에서 landmark(478점) + blendshape + 변환 행렬이 나오는가
 *   (변환 행렬 존재 여부는 머리 자세 추정 방식(solvePnP vs MediaPipe 자체
 *   변환 행렬) 선택에 필요한 정보라 같이 확인)
 * - 실기기에서 체감 FPS가 쓸만한가
 */

type Status = 'idle' | 'loading-model' | 'requesting-camera' | 'ready' | 'error';

export function LiveFaceSpike() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [status, setStatus] = useState<Status>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [fps, setFps] = useState(0);
  const [faceDetected, setFaceDetected] = useState(false);
  const [blendshapeCount, setBlendshapeCount] = useState(0);
  const [hasTransformMatrix, setHasTransformMatrix] = useState(false);

  useEffect(() => {
    let cancelled = false;
    // FaceLandmarker 인스턴스는 렌더와 무관하게 이펙트 스코프에서만 필요해서
    // ref/state로 안 두고 클로저 변수로 들고 있음.
    let landmarker: import('@mediapipe/tasks-vision').FaceLandmarker | null = null;

    async function setup() {
      try {
        setStatus('loading-model');
        const { FaceLandmarker, FilesetResolver } = await import('@mediapipe/tasks-vision');
        const filesetResolver = await FilesetResolver.forVisionTasks('/mediapipe/wasm');
        landmarker = await FaceLandmarker.createFromOptions(filesetResolver, {
          baseOptions: {
            modelAssetPath: '/mediapipe/face_landmarker.task',
            delegate: 'GPU',
          },
          runningMode: 'VIDEO',
          numFaces: 1,
          outputFaceBlendshapes: true,
          outputFacialTransformationMatrixes: true,
        });
        if (cancelled) return;

        setStatus('requesting-camera');
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        await video.play();

        setStatus('ready');

        let frameCount = 0;
        let fpsWindowStart = performance.now();

        const tick = () => {
          if (cancelled || !landmarker || !videoRef.current || !canvasRef.current) return;
          const now = performance.now();
          const result = landmarker.detectForVideo(videoRef.current, now);

          const canvas = canvasRef.current;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            canvas.width = videoRef.current.videoWidth;
            canvas.height = videoRef.current.videoHeight;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            const landmarks = result.faceLandmarks?.[0];
            if (landmarks) {
              ctx.fillStyle = '#4c8a64';
              for (const p of landmarks) {
                ctx.beginPath();
                ctx.arc(p.x * canvas.width, p.y * canvas.height, 1.5, 0, Math.PI * 2);
                ctx.fill();
              }
            }
          }

          setFaceDetected(!!result.faceLandmarks?.[0]);
          setBlendshapeCount(result.faceBlendshapes?.[0]?.categories?.length ?? 0);
          setHasTransformMatrix(!!result.facialTransformationMatrixes?.[0]);

          frameCount += 1;
          if (now - fpsWindowStart >= 1000) {
            setFps(Math.round((frameCount * 1000) / (now - fpsWindowStart)));
            frameCount = 0;
            fpsWindowStart = now;
          }

          rafRef.current = requestAnimationFrame(tick);
        };
        rafRef.current = requestAnimationFrame(tick);
      } catch (err) {
        if (cancelled) return;
        setStatus('error');
        setErrorMessage(err instanceof Error ? err.message : String(err));
      }
    }

    setup();

    return () => {
      cancelled = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      landmarker?.close();
    };
  }, []);

  return (
    <div style={{ padding: 24, fontFamily: 'sans-serif' }}>
      <h1>실시간 얼굴 분석 스파이크 (Phase 0)</h1>
      <p>상태: {status}</p>
      {status === 'error' && <p style={{ color: 'red' }}>에러: {errorMessage}</p>}
      <p>
        얼굴 검출: {faceDetected ? '✓' : '✗'} · blendshape {blendshapeCount}개 · 변환 행렬:{' '}
        {hasTransformMatrix ? '✓' : '✗'} · FPS: {fps}
      </p>
      <div style={{ position: 'relative', width: 640 }}>
        <video ref={videoRef} muted playsInline style={{ width: 640, transform: 'scaleX(-1)' }} />
        <canvas
          ref={canvasRef}
          style={{ position: 'absolute', top: 0, left: 0, width: 640, transform: 'scaleX(-1)' }}
        />
      </div>
    </div>
  );
}

export default LiveFaceSpike;
