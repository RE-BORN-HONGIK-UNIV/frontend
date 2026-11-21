import { useEffect, useState } from 'react';
import { auth } from '@/lib/auth';
import { speak, stopSpeak } from '@/features/haru/speech';
import { getSpeechAudioUrl } from '../api';

/**
 * 3단계 호명 — 대기실에서 면접실로 넘어가는 짧은 장면(버튼 없이 자동으로 넘어간다).
 * 하루 배웅 → 노크 → 방 안에서 면접관 "네, 들어오세요." → 문이 열리며 면접실.
 * 실제 면접 대기실에서 가장 흔한 순간이라 실전 느낌을 주고, 면접관 목소리를 문 너머로 먼저 들어서
 * 갑자기 얼굴을 마주하는 부담을 줄인다. 이름은 미리 녹음할 수 없어서 글로만 부른다.
 */
export const SENDOFF = '천천히 해도 괜찮아요. 끝나고 다시 만나요!';
export const COME_IN = '네, 들어오세요.';

type Beat = 'sendoff' | 'knock' | 'reply' | 'open';

export function CallView({ onDone, onQuit }: { onDone: () => void; onQuit: () => void }) {
  const [beat, setBeat] = useState<Beat>('sendoff');
  const name = auth.name;

  useEffect(() => {
    let alive = true;
    void (async () => {
      await speak(SENDOFF);
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
      await wait(1100);
      if (alive) onDone();
    })();
    return () => {
      alive = false;
      stopSpeak();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 화면이 뜰 때 한 번
  }, []);

  return (
    <div className="rb-call3" data-beat={beat}>
      <button type="button" className="rb-s3__quit rb-call3__quit" onClick={onQuit}>
        그만하기
      </button>

      <div className="rb-call3__door" aria-hidden>
        <span className="rb-call3__light" />
        <span className="rb-call3__panel">
          <span className="rb-call3__plate">면접실</span>
          <i className="rb-call3__knob" />
        </span>
      </div>

      <div className="rb-call3__text" aria-live="polite">
        <h1>{name ? `${name} 님, ` : ''}들어가실 차례예요</h1>
        {/* 문 너머 면접관 목소리 — 소리를 못 듣는 사람도 알게 글로 */}
        <p>{beat === 'reply' || beat === 'open' ? `“${COME_IN}”` : beat === 'knock' ? '똑똑' : '면접관이 기다리고 있어요'}</p>
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
