/** 로그아웃해도 남겨 두는 이 기기 설정 — 사람이 아니라 기기에 붙은 화면 설정이라 */
const KEEP_KEYS = new Set(['rb.theme', 'rb.community.sidebarOpen']);

/**
 * 로그아웃하면 이 기기에 남은 사람별 기록을 모두 지운다 — 이름·토큰, 1~3단계 진행 표시, 최종 리포트 세부값,
 * 하루와 나눈 이야기. 그래야 다음에 "무료로 시작하기"를 누르면 새 게스트로, 새 닉네임부터 시작한다
 * (PrivateRoute가 게스트를 새로 만들고 NicknameGate가 이름을 묻는다). 회원 기록은 서버에 있어 지워지지 않는다.
 */
export function clearLocalUserData() {
  try {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('rb.') && !KEEP_KEYS.has(k)) keys.push(k);
    }
    keys.forEach((k) => localStorage.removeItem(k));
  } catch {
    /* 저장소를 못 쓰는 브라우저 — 지울 것도 없음 */
  }
}
