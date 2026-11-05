import type { CSSProperties, ReactNode } from 'react';
import type { TalkPhase } from './useHaruTalk';

/**
 * 하루 그림 — 상태마다 정지 그림을 바꿔 끼운다(경량 웹과 같은 방식).
 * 하루가 말할 때(speak)만 입이 움직인다(2026-11 추가): 기본 그림 위에 말하는 그림의 입 부분만 부드럽게 겹쳐서
 * 켰다 껐다 한다(.rb-haru-mouth, 입 자리 마스크는 /haru/haru-mouth-mask.png). 말하는 그림을 통째로 바꿔 끼우면
 * 두 그림의 눈 크기가 조금 달라서 눈까지 깜빡거리므로 입만 바꾼다. 예전엔 "입이 움직이면 시선을 흔든다"고 정지 그림만
 * 썼는데, 2단계 시선은 이제 사용자가 대답하는 동안만 재므로(useLiveFaceSession measureOnlyWhenAnswering) 하루가 말하는
 * 동안의 움직임은 측정에 들어가지 않는다. 사용자가 대답할 때는 그림이 움직이지 않는다(끄덕임은 넣지 않기로 함).
 * 말할 때 talk, 사용자가 말할 때 listen(가장 오래 보이는 그림), 반응을 준비할 때 think(끄덕이는 표정 — 눈을 피하지 않음),
 * 그 밖에는 기본 그림. 그림 원본과 만든 프롬프트는 경량 웹 넘김본 images/original/prompts.md 참고.
 */
const IMAGE: Record<TalkPhase, string> = {
  // 말할 때는 기본 그림 위에 입만 겹친다(아래 MOUTH)
  speak: '/haru/haru.jpg',
  listen: '/haru/haru-listen.jpg',
  think: '/haru/haru-think.jpg',
  ready: '/haru/haru.jpg',
  done: '/haru/haru.jpg',
};

const MOUTH = '/haru/haru-talk.jpg';
const MOUTH_MASK = '/haru/haru-mouth-mask.png';

// 네 장을 미리 불러 둬서 상태가 바뀔 때 빈 화면이 깜빡이지 않게
if (typeof window !== 'undefined') {
  [...Object.values(IMAGE), MOUTH, MOUTH_MASK].forEach((src) => {
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
      {phase === 'speak' && (
        <span
          className="rb-haru-mouth"
          aria-hidden
          style={{
            backgroundImage: `url(${MOUTH})`,
            // 배경과 똑같이 cover·center로 맞춰서, 마스크(같은 크기 그림)가 어떤 칸 비율에서도 입 자리에 겹친다
            maskImage: `url(${MOUTH_MASK})`,
            WebkitMaskImage: `url(${MOUTH_MASK})`,
          }}
        />
      )}
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
