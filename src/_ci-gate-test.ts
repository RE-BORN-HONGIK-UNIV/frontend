// 일부러 타입 에러를 낸 파일 — branch protection(status check 게이팅)이
// 실제로 Merge 버튼을 막는지 검증하기 위한 테스트용. 확인 끝나면 PR과 함께 정리함.
const intentionalTypeError: number = 'this should fail tsc --noEmit';
