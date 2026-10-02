/**
 * 면접 기록 저장·AI 코치 노트 사용 동의 (이 기기에 마지막 선택을 기억).
 *
 * 면접 답변은 민감할 수 있는 개인정보라, 동의한 경우에만 서버에 저장하고 AI(Anthropic)로 보낸다.
 * 기본값은 "동의 안 함" — 체크하기 전에는 아무것도 저장·전송하지 않는다.
 * 서버는 동의 여부를 따로 저장하지 않는다: 동의하지 않으면 프론트가 면접 세션 자체를 만들지 않으므로
 * "면접 기록이 서버에 존재한다 = 동의했다"가 성립한다.
 */
const KEY = 'rb.consent.interview';

export function getInterviewConsent(): boolean {
  try {
    return localStorage.getItem(KEY) === 'true';
  } catch {
    return false;
  }
}

export function setInterviewConsent(value: boolean): void {
  try {
    localStorage.setItem(KEY, String(value));
  } catch {
    /* 저장 못 해도 이번 선택은 화면 상태로 유지됨 */
  }
}
