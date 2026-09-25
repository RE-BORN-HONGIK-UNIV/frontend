import type { CSSProperties } from 'react';

const ASPECT_RATIO = 1146 / 338;

/**
 * "ReBorn" 워드마크 — 필기체 로고(2026-09-25, 디자인 레퍼런스 그대로 적용).
 * 이전엔 폰트(Caveat/Playball)로 텍스트를 그리고 리본은 별도 SVG
 * (RebornMark)로 옆에 붙이는 코드 조합이었는데, 정확히 이 모양대로
 * 써달라는 요청이라 레퍼런스 이미지에서 직접 잘라낸 래스터 이미지로
 * 교체함 — public/logo/reborn-wordmark-{light,dark}.png(배경 투명,
 * 라이트/다크 테마용 두 색상 버전, 원본 로고 색상 토큰과 동일한
 * #1d5c3a/#8fd6ac로 추출). 텍스트+리본이 하나의 그림이라 RebornMark(리본만
 * 따로 애니메이션하던 SVG)는 더 이상 안 쓰여서 삭제함.
 *
 * 라이트/다크 전환은 index.html의 인라인 스크립트가 페인트 전에 미리
 * 세팅하는 :root[data-theme] 속성 기준 CSS로 처리(index.css의
 * .rb-logo-light/.rb-logo-dark) — React state를 안 거치니 테마 전환 시
 * 리렌더 없이 즉시 바뀜.
 *
 * onGradient(색이 있는 브랜드 배경 위)일 땐 별도 흰색 자산을 또 만드는 대신
 * CSS filter(brightness(0) invert(1))로 알파 채널은 그대로 두고 색만 순백으로
 * 바꿈 — 단색 실루엣 로고라 이 트릭이 그대로 먹힘.
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
  const height = size * 1.1; // 워드마크 이미지 자체에 상하 여백이 있어서 폰트 size 대비 살짝 키움
  const imgStyle: CSSProperties = {
    height,
    width: height * ASPECT_RATIO,
    filter: onGradient ? 'brightness(0) invert(1)' : undefined,
  };

  return (
    <span className={animate ? 'rb-logo-anim' : undefined} style={{ display: 'inline-block' }}>
      <img
        src="/logo/reborn-wordmark-light.png"
        alt="ReBorn"
        className="rb-logo-light"
        style={imgStyle}
      />
      <img
        src="/logo/reborn-wordmark-dark.png"
        alt="ReBorn"
        className="rb-logo-dark"
        style={imgStyle}
      />
    </span>
  );
}
