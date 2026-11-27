import { useEffect, useRef, useState } from 'react';
import { auth } from '@/lib/auth';
import { getSpeechAudioUrl } from '../api';

/**
 * 3단계 호명 — 대기실에서 면접실로 넘어가는 짧은 장면(버튼 없이 자동으로 넘어간다).
 * 닫힌 면접실 문 앞에서 하루 배웅(말풍선) → 노크 → 문 너머 면접관 "네, 들어오세요." → 문을 열고 들어가는 영상(public/interviewer/door.mp4) → 면접실.
 * 영상을 못 틀거나 움직임 줄이기를 켠 사람에게는 예전처럼 가운데 빛이 열리며 넘어간다.
 * 실제 면접 대기실에서 가장 흔한 순간이라 실전 느낌을 주고, 면접관 목소리를 문 너머로 먼저 들어서
 * 갑자기 얼굴을 마주하는 부담을 줄인다. 이름은 미리 녹음할 수 없어서 글로만 부른다.
 */
export const SENDOFF = '천천히 해도 괜찮아요. 끝나고 다시 만나요!';
export const COME_IN = '네, 들어오세요.';

type Beat = 'sendoff' | 'knock' | 'reply' | 'open' | 'enter';

export function CallView({ onDone, onQuit }: { onDone: () => void; onQuit: () => void }) {
  const [beat, setBeat] = useState<Beat>('sendoff');
  const name = auth.name;
  const doorRef = useRef<HTMLVideoElement>(null);
  const [lit, setLit] = useState(false); // 문 영상 대신 빛으로 넘어가는 중

  useEffect(() => {
    let alive = true;
    void (async () => {
      await wait(2400); // 하루 배웅은 말풍선으로만 — 읽을 만큼 기다린다(노크·면접관 목소리와 겹치지 않게)
      if (!alive) return;
      setBeat('knock');
      await knock();
      await wait(350);
      if (!alive) return;
      setBeat('reply');
      const url = await getSpeechAudioUrl(COME_IN, 'standard');
      if (url) await playOnce(url);
      else await wait(1200);
      if (!alive) return;
      setBeat('open');
      if (!(await playDoor(doorRef.current))) {
        setLit(true);
        void doorOpen();
        await wait(1000);
      }
      if (!alive) return;
      setBeat('enter');
      await wait(500);
      if (alive) onDone();
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 화면이 뜰 때 한 번
  }, []);

  return (
    <div className="rb-call3" data-beat={beat} data-lit={lit || undefined}>
      {/* 닫힌 문 앞에 서 있다가, 열리는 순간 문 영상이 재생된다 — 글이 잘 읽히게 그동안은 어둡게 덮는다 */}
      <video ref={doorRef} className="rb-call3__door" src="/interviewer/door.mp4" poster="/interviewer/door-poster.jpg" playsInline preload="auto" aria-hidden />
      <span className="rb-call3__shade" aria-hidden />
      <span className="rb-call3__glow" aria-hidden />
      <button type="button" className="rb-s3__quit rb-call3__quit" onClick={onQuit}>
        그만하기
      </button>

      <span className="rb-call3__light" aria-hidden />

      <div className="rb-call3__text" aria-live="polite">
        <h1>{name ? `${name} 님, ` : ''}들어갈 차례예요</h1>
        {/* 문 너머 소리 자막 — 몰입을 깨지 않게 화면에는 안 보이고 화면 읽기 프로그램만 읽는다 */}
        <p className="rb-call3__cc" data-voice={beat === 'reply' || undefined}>
          {beat === 'reply' ? `“${COME_IN}”` : beat === 'knock' ? '(똑똑)' : '면접관이 기다리고 있어요'}
        </p>
      </div>

      <div className="rb-call3__haru">
        <i aria-hidden />
        <p>
          <small>하루</small>
          {SENDOFF}
        </p>
      </div>
    </div>
  );
}

const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** 소리 하나를 끝까지(못 틀면 바로) */
function playOnce(url: string) {
  return new Promise<void>((resolve) => {
    const a = new Audio(url);
    a.onended = a.onerror = () => resolve();
    a.play().catch(() => resolve());
  });
}

/** 문 영상을 끝까지 튼다. 못 틀거나 움직임 줄이기를 켰으면 false(빛으로 대신) */
function playDoor(v: HTMLVideoElement | null) {
  return new Promise<boolean>((resolve) => {
    if (!v || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return resolve(false);
    v.onended = () => resolve(true);
    v.onerror = () => resolve(false);
    const p = v.play?.();
    if (p) p.catch(() => resolve(false));
    else resolve(false);
  });
}

/** 노크 두 번 — 효과음 파일 없이 짧고 낮은 소리를 만들어 낸다 */
async function knock() {
  try {
    const ctx = new AudioContext();
    for (const at of [0, 0.22]) {
      const t = ctx.currentTime + at;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(140, t);
      osc.frequency.exponentialRampToValueAtTime(60, t + 0.09);
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.8, t + 0.005);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.13);
    }
    await wait(450);
    void ctx.close();
  } catch {
    await wait(450);
  }
}

/** 문 여는 소리 — 낮게 깔리는 짧은 바람 소리(파일 없이 만든다) */
function doorOpen() {
  try {
    const ctx = new AudioContext();
    const len = Math.floor(ctx.sampleRate * 0.9);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(300, ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.5);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + 0.25);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.9);
    src.connect(filter).connect(gain).connect(ctx.destination);
    src.start();
    src.onended = () => void ctx.close();
  } catch {
    // 소리를 못 내도 빛으로 넘어간다
  }
}
