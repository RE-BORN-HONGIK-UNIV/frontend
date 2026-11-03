import { useEffect, useState } from 'react';

/**
 * 마이크 소리 크기(0~1)를 실시간으로 — 마이크 확인 줄의 막대 표시용.
 * 화면에 "소리가 들어오고 있다"는 것만 보여 주는 값이라 판정(크다/작다)에는 쓰지 않는다
 * (너무 큰지는 캘리브레이션 서버 결과 is_clipping으로 판단한다).
 */
export function useMicLevel(stream: MediaStream | null): number {
  const [level, setLevel] = useState(0);

  useEffect(() => {
    if (!stream || typeof AudioContext === 'undefined') {
      setLevel(0);
      return;
    }
    const ctx = new AudioContext();
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 512;
    ctx.createMediaStreamSource(stream).connect(analyser);
    const buf = new Float32Array(analyser.fftSize);
    let raf = 0;
    const tick = () => {
      analyser.getFloatTimeDomainData(buf);
      let sum = 0;
      for (const v of buf) sum += v * v;
      // 말소리 RMS는 대략 0.01~0.2 — 막대가 보기 좋게 차도록 키워서 0~1로 자른다(표시용 배율)
      setLevel(Math.min(1, Math.sqrt(sum / buf.length) * 6));
      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => {
      cancelAnimationFrame(raf);
      void ctx.close();
    };
  }, [stream]);

  return level;
}
