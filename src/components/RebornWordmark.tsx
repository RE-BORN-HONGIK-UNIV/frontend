import type { CSSProperties } from 'react';

/**
 * "REBORN" 워드마크 — 에이투지체(A2z) 900(Black) 텍스트.
 * 이전엔 필기체 로고 PNG(public/logo/reborn-wordmark-{light,dark}.png)였는데, 팀이 본문 폰트와
 * 맞춰 "그냥 REBORN"을 900 굵기로 쓰기로 해서 텍스트로 교체. 이미지가 아니라서 라이트/다크 전환은
 * 색 토큰(--rb-primary-strong)이 알아서 처리하고, onGradient(색이 있는 브랜드 배경 위)일 땐 흰색.
 * PNG 파일은 지우지 않고 남겨뒀다(되돌릴 때 이 파일만 git에서 이전 버전으로 복원하면 됨).
 */
export function RebornWordmark({
  size = 96,
  animate = true,
  onGradient = false,
}: {
  size?: number;
  animate?: boolean;
  /** true when placed on a filled brand background — renders in solid white */
  onGradient?: boolean;
}) {
  const style: CSSProperties = {
    display: 'inline-block',
    // 기존 이미지 높이(size*1.1)와 비슷한 시각적 크기가 되도록 글자 크기를 잡음
    fontSize: size * 0.62,
    lineHeight: 1,
    fontWeight: 900,
    letterSpacing: '0.04em',
    whiteSpace: 'nowrap',
    color: onGradient ? '#fff' : 'var(--rb-primary-strong)',
  };

  return (
    <span className={animate ? 'rb-logo-anim' : undefined} style={style} role="img" aria-label="ReBorn">
      REBORN
    </span>
  );
}
