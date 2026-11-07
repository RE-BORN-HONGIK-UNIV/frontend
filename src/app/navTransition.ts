/**
 * 화면 전환 효과 — 2026-11.
 *
 * - 기본: 크로스페이드(이전 화면이 사라지며 새 화면이 나타남). 브라우저의 View Transitions 기능을 쓴다
 *   (react-router 7의 viewTransition 옵션). 지원하지 않는 브라우저는 index.css의 .rb-page-enter(새 화면 페이드인)로 대신.
 * - 훈련 단계(목소리 대화 → 영상 통화 → 실전 면접 → 결과) 사이만 슬라이드: 앞으로 가면 오른쪽에서, 뒤로 가면 왼쪽에서.
 *   <html data-nav="forward|back|fade">로 방향을 넘기고, 애니메이션은 index.css ::view-transition-*에 있다.
 * - 기기 설정 "동작 줄이기"면 효과 없음(index.css).
 *
 * 모든 Link·navigate()에 viewTransition을 하나하나 붙이지 않으려고 router.navigate를 한 번 감싼다
 * (Link 클릭과 useNavigate 모두 data router에서는 router.navigate를 거친다).
 */
const STAGE_PATHS = ['/voice', '/face', '/interview', '/report'];

const pathOf = (to: string) => to.split(/[?#]/)[0].replace(/\/+$/, '') || '/';

/** 훈련 단계 순서 — 단계 화면이 아니면 -1 */
export function stageIndex(path: string): number {
  return STAGE_PATHS.indexOf(pathOf(path));
}

/** 두 화면 사이 전환 방식 — 둘 다 훈련 단계면 진행 방향으로 슬라이드, 아니면 크로스페이드 */
export function navKind(from: string, to: string): 'forward' | 'back' | 'fade' {
  const a = stageIndex(from);
  const b = stageIndex(to);
  if (a < 0 || b < 0 || a === b) return 'fade';
  return b > a ? 'forward' : 'back';
}

type NavigateFn = (to: unknown, opts?: Record<string, unknown>) => Promise<void>;

export function enableViewTransitions(router: { navigate: unknown; state: { location: { pathname: string } } }) {
  const original = (router.navigate as NavigateFn).bind(router);
  router.navigate = ((to: unknown, opts?: Record<string, unknown>) => {
    // 숫자(앞·뒤로 가기)와 상대 경로는 그대로
    if (typeof to === 'number') return original(to, opts);
    const target = typeof to === 'string' ? to : ((to as { pathname?: string } | null)?.pathname ?? '');
    if (!target.startsWith('/')) return original(to, opts);
    document.documentElement.dataset.nav = navKind(router.state.location.pathname, target);
    // Link는 viewTransition: undefined를 직접 넘기므로(펼치면 덮어씀) ??로 기본값을 준다
    return original(to, { ...opts, viewTransition: opts?.viewTransition ?? true });
  }) as NavigateFn;
}
