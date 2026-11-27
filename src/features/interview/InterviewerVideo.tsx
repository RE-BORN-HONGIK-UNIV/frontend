import { useEffect, useRef, useState } from 'react';
import { ALL_CLIPS, isLipsync, type Clip } from './interviewerClips';

/**
 * 면접관 영상(public/interviewer/clips) — 대사마다 입 모양을 맞춘 영상과, 듣기·생각하기·말하기 반복 영상.
 * 입 모양 영상에는 원래 대사 mp3를 입 모양에 맞춰 밀어 넣어 두었다 — 영상이 소리까지 내서 어긋나지 않고, 목소리도 다른 대사와 같다
 * (영상과 mp3를 따로 틀면 0.3~0.5초 어긋남).
 * 바꿀 때는 새 영상을 앞 영상 위에 겹쳐 서서히 드러내고, 다 드러난 뒤 앞 영상을 치운다 — 사이에 배경이 비치지 않게.
 */

// 면접실에 들어오면 영상을 모두 미리 받아 둔다(합쳐 2~3MB) — 바뀔 때 불러오느라 멈칫하지 않게
const cache = new Map<Clip, string>();
function preloadAll() {
  for (const c of ALL_CLIPS) {
    if (cache.has(c)) continue;
    cache.set(c, `/interviewer/clips/${c}.mp4`);
    void fetch(`/interviewer/clips/${c}.mp4`)
      .then((r) => (r.ok ? r.blob() : null))
      .then((b) => b && cache.set(c, URL.createObjectURL(b)))
      .catch(() => {});
  }
}

/**
 * clip이 바뀌거나 playKey가 오르면 그 영상을 처음부터 튼다.
 * 입 모양 영상이 끝나면 onEnded, 소리 내 재생을 못 하면(자동재생 막힘·파일 없음) onBlocked를 부른다.
 */
export function InterviewerVideo({
  clip,
  playKey,
  onEnded,
  onBlocked,
}: {
  clip: Clip;
  playKey: number;
  onEnded?: (clip: Clip) => void;
  onBlocked?: (clip: Clip) => void;
}) {
  const refs = [useRef<HTMLVideoElement>(null), useRef<HTMLVideoElement>(null)];
  const clips = useRef<(Clip | null)[]>([null, null]);
  const [front, setFront] = useState(0);
  const [prev, setPrev] = useState<number | null>(null);
  const [slow, setSlow] = useState(false);
  const frontRef = useRef(0);
  const cb = useRef({ onEnded, onBlocked });
  cb.current = { onEnded, onBlocked };

  useEffect(preloadAll, []);

  useEffect(() => {
    const back = 1 - frontRef.current;
    const next = refs[back].current;
    if (!next) return;
    const lip = isLipsync(clip);
    clips.current[back] = clip;
    next.src = cache.get(clip) ?? `/interviewer/clips/${clip}.mp4`;
    next.loop = !lip;
    next.muted = !lip;
    let alive = true;
    let t: ReturnType<typeof setTimeout>;
    const show = () => {
      if (!alive) return;
      // 소리와 안 맞는 말하기 영상에서 넘어갈 때는 조금 더 천천히 — 입이 벌어진 채 툭 끊겨 보이지 않게
      setSlow(clips.current[frontRef.current] === 'loop-talk');
      setPrev(frontRef.current);
      frontRef.current = back;
      setFront(back);
      t = setTimeout(() => {
        refs[1 - back].current?.pause();
        setPrev(null);
      }, 600);
    };
    const p = next.play?.();
    if (p) {
      p.then(show).catch(() => alive && lip && cb.current.onBlocked?.(clip));
    } else if (lip) {
      cb.current.onBlocked?.(clip); // 영상을 못 트는 환경(테스트 등)
    }
    return () => {
      alive = false;
      clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 영상이 바뀌거나 다시 틀 때만
  }, [clip, playKey]);

  return (
    <>
      {refs.map((r, i) => (
        <video
          key={i}
          ref={r}
          className="rb-s3__talk"
          data-front={front === i || undefined}
          data-prev={prev === i || undefined}
          style={front === i && slow ? { animationDuration: '0.2s' } : undefined}
          playsInline
          preload="auto"
          aria-hidden
          onEnded={() => {
            const c = clips.current[i];
            if (c && isLipsync(c)) cb.current.onEnded?.(c);
          }}
          onError={() => {
            const c = clips.current[i];
            if (c && isLipsync(c)) cb.current.onBlocked?.(c);
          }}
        />
      ))}
    </>
  );
}
