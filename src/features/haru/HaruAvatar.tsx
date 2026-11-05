import type { CSSProperties, ReactNode } from 'react';
import type { TalkPhase } from './useHaruTalk';

/**
 * 하루 그림 — 상태마다 정지 그림을 바꿔 끼운다(경량 웹과 같은 방식). 입을 움직이는 그림은 시선을 흔들어서 쓰지 않는다.
 * 말할 때 talk, 사용자가 말할 때 listen(가장 오래 보이는 그림), 반응을 준비할 때 think(끄덕이는 표정 — 눈을 피하지 않음),
 * 그 밖에는 기본 그림. 그림 원본과 만든 프롬프트는 경량 웹 넘김본 images/original/prompts.md 참고.
 */
const IMAGE: Record<TalkPhase, string> = {
  speak: '/haru/haru-talk.jpg',
  listen: '/haru/haru-listen.jpg',
  think: '/haru/haru-think.jpg',
  ready: '/haru/haru.jpg',
  done: '/haru/haru.jpg',
};

// 네 장을 미리 불러 둬서 상태가 바뀔 때 빈 화면이 깜빡이지 않게
if (typeof window !== 'undefined') {
  Object.values(IMAGE).forEach((src) => {
    const img = new Image();
    img.src = src;
  });
}

export function HaruAvatar({
  phase,
  style,
  children,
  glow = phase === 'speak' || phase === 'listen',
}: {
  phase: TalkPhase;
  style?: CSSProperties;
  children?: ReactNode;
  glow?: boolean;
}) {
  return (
    <div
      role="img"
      aria-label="하루"
      style={{
        position: 'relative',
        aspectRatio: '4 / 3',
        borderRadius: 16,
        overflow: 'hidden',
        background: `#ece8f8 url(${IMAGE[phase]}) center / cover no-repeat`,
        // 말하는 중(하루 또는 나)은 테두리 빛으로만 보여 준다 — 그림은 움직이지 않는다
        boxShadow: glow ? '0 0 0 3px var(--rb-primary)' : '0 0 0 1px var(--rb-line)',
        transition: 'box-shadow .2s',
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/** 그림 위에 얹는 작은 이름표·상태 표시 */
export function TileTag({ children, top }: { children: ReactNode; top?: boolean }) {
  return (
    <span
      style={{
        position: 'absolute',
        left: 12,
        [top ? 'top' : 'bottom']: 12,
        background: 'rgba(21,24,28,.55)',
        color: '#fff',
        fontSize: 13,
        fontWeight: 600,
        borderRadius: 9,
        padding: '4px 10px',
      }}
    >
      {children}
    </span>
  );
}
