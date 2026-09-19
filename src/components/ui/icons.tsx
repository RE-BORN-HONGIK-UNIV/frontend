/** 입력창 아이콘 + 소셜 로그인 버튼용 간단한 인라인 SVG 아이콘.
 * 새 아이콘 라이브러리(lucide-react 등) 의존성 추가 대신 직접 그림 —
 * 프로젝트 전체가 이 방식(자체 UI 컴포넌트)을 따르고 있어서 일관성 유지. */

type IconProps = React.SVGProps<SVGSVGElement>;

const strokeProps = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

export function IconUser(props: IconProps) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" {...strokeProps} {...props}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
    </svg>
  );
}

export function IconMail(props: IconProps) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" {...strokeProps} {...props}>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 7 9 6 9-6" />
    </svg>
  );
}

export function IconLock(props: IconProps) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" {...strokeProps} {...props}>
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  );
}

export function IconAt(props: IconProps) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" {...strokeProps} {...props}>
      <circle cx="12" cy="12" r="4" />
      <path d="M16 12v1.5a2.5 2.5 0 0 0 5 0V12a9 9 0 1 0-4.1 7.55" />
    </svg>
  );
}

export function IconCalendar(props: IconProps) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" {...strokeProps} {...props}>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M16 3v4M8 3v4M3 10h18" />
    </svg>
  );
}

export function IconEye(props: IconProps) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" {...strokeProps} {...props}>
      <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

export function IconEyeOff(props: IconProps) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" {...strokeProps} {...props}>
      <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
      <path d="M6.6 6.6C4 8.3 2 12 2 12s3.6 7 10 7a10.6 10.6 0 0 0 4.4-.9M10.6 5.1A10.6 10.6 0 0 1 12 5c6.4 0 10 7 10 7a17 17 0 0 1-3.2 4.1" />
      <path d="M3 3l18 18" />
    </svg>
  );
}

export function IconSun(props: IconProps) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" {...strokeProps} {...props}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  );
}

export function IconMoon(props: IconProps) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" {...strokeProps} {...props}>
      <path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5Z" />
    </svg>
  );
}

export function IconChatBubble(props: IconProps) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" {...strokeProps} {...props}>
      <path d="M21 11.5a8.38 8.38 0 0 1-8.5 8.5 8.5 8.5 0 0 1-3.6-.8L4 20l1-4.9a8.38 8.38 0 0 1-.8-3.6A8.38 8.38 0 0 1 12.7 3a8.5 8.5 0 0 1 8.3 8.5Z" />
    </svg>
  );
}

export function IconBriefcase(props: IconProps) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" {...strokeProps} {...props}>
      <rect x="3" y="7.5" width="18" height="12" rx="2.5" />
      <path d="M8.5 7.5V6a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v1.5" />
      <path d="M3 12.5h18" />
    </svg>
  );
}

export function IconMegaphone(props: IconProps) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" {...strokeProps} {...props}>
      <path d="M3 10.5v3a1 1 0 0 0 1 1h1.6l5.4 3.4V6.1L5.6 9.5H4a1 1 0 0 0-1 1Z" />
      <path d="M14.5 9a3 3 0 0 1 0 6" />
      <path d="M17.5 7a6 6 0 0 1 0 10" />
    </svg>
  );
}

export function IconUsers(props: IconProps) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" {...strokeProps} {...props}>
      <circle cx="9" cy="8.5" r="3" />
      <path d="M3.5 19.5c0-3.3 2.5-5.5 5.5-5.5s5.5 2.2 5.5 5.5" />
      <circle cx="17" cy="9.5" r="2.3" />
      <path d="M15.8 14.2c2.2.4 4 2.3 4 5.3" />
    </svg>
  );
}

export function IconPanelLeft(props: IconProps) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" {...strokeProps} {...props}>
      <rect x="3" y="4" width="18" height="16" rx="2.5" />
      <path d="M9.5 4v16" />
    </svg>
  );
}

/** 구글 4색 "G" 로고 — 웹에서 흔히 쓰는 표준 형태를 그대로 재현. */
export function IconGoogle(props: IconProps) {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" {...props}>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.9 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.5 29.6 4.5 24 4.5 13.2 4.5 4.5 13.2 4.5 24S13.2 43.5 24 43.5 43.5 34.8 43.5 24c0-1.2-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 15.9 18.9 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.5 29.6 4.5 24 4.5c-7.6 0-14.1 4.3-17.4 10.6z" />
      <path fill="#4CAF50" d="M24 43.5c5.5 0 10.4-1.9 14.1-5.1l-6.5-5.5C29.5 34.6 26.9 35.5 24 35.5c-5.3 0-9.7-3.4-11.3-8.1l-6.6 5.1C9.7 39 16.3 43.5 24 43.5z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4 5.4l6.5 5.5C41.9 36.6 43.5 30.7 43.5 24c0-1.2-.1-2.4-.4-3.5z" />
    </svg>
  );
}

/** 카카오톡 말풍선 실루엣(브랜드 색만 참고, 공식 에셋 아님) — 소셜 로그인 버튼용. */
export function IconKakao(props: IconProps) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="#191600" {...props}>
      <path d="M12 3.6C6.6 3.6 2.2 7 2.2 11.2c0 2.7 1.8 5.1 4.5 6.4-.2.7-.7 2.6-.8 3-.1.5.2.5.4.3.2-.1 2.5-1.7 3.5-2.4.7.1 1.4.15 2.2.15 5.4 0 9.8-3.4 9.8-7.5S17.4 3.6 12 3.6Z" />
    </svg>
  );
}
