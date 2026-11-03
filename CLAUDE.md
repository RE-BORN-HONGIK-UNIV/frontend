# Re-born · frontend

발화 불안·사회불안을 가진 고립·은둔 청년을 위한 AI 기반 디지털 재활 웹앱의 프론트엔드.
자세한 스택·화면·환경변수는 `README.md` 참고 — 이 파일은 Claude Code로 작업할 때
바로 필요한 것만 정리.

## 스택 / 구조

Vite 8(rolldown 기반) + React 19 + TypeScript + Tailwind CSS 4 + TanStack Query 5 +
react-router-dom 7. 구조는 `README.md`의 "구조" 섹션 참고 (`src/features/*`가 단계별
도메인 로직, `src/lib/api`가 백엔드 연동).

**UI는 Mantine이 아니라 `src/components/ui/`의 자체 컴포넌트**(2026-09-14 전면
교체). Box/Stack/Button/TextInput 등 이름과 props(fz/c/mt/gap/radius/color 등)는
Mantine과 최대한 비슷하게 유지해서 마이그레이션 당시 JSX를 거의 안 바꿨음 — 새
코드 짤 때도 이 이름/prop 관례를 따르면 일관성 유지됨. 자세한 내용과 기능
재구현 목록(form/dropzone/toast/useMediaQuery)은 `README.md`의 "UI 컴포넌트"
섹션 참고.

## 명령어

```bash
npm install
npm run dev        # :3000, 백엔드(:5000)로 /api·/analyze·/health 프록시
npm run lint
npm run typecheck
npm run test        # vitest
npm run build       # tsc --noEmit && vite build
```

백엔드 없이 프론트만 볼 땐 `.env`에 `VITE_USE_MOCK_API=true` (README 참고).

## 테스트 하네스 — 중요 gotcha

`vitest.config.ts`를 `vite.config.ts`와 **의도적으로 분리**해뒀다. 합치면 안 되는
이유: 이 프로젝트의 vite(v8, rolldown 기반)와 vitest가 내부적으로 물고 있는
vite(rollup 기반)의 `Plugin` 타입이 서로 안 맞아서, 한 파일에서
`defineConfig`를 합치면 `tsc --noEmit`이 `vite.config.ts`에서 타입 에러를 낸다.
**둘 다 건드릴 일이 있으면 이 구조를 유지할 것** — vitest 업그레이드로 이 문제가
해결됐는지 먼저 확인 후에만 합치기를 시도.

1·2단계 대화 상대 "하루"(`src/features/haru/`)와 3단계 뒤 최종 통합 리포트(`src/features/report/`)는 2026-10-31
판넬용 경량 웹에서 가져온 것 — README "하루" 섹션 참고. 1·2단계는 단계별 결과 화면이 없고 최종 리포트에서 한 번에 보여 준다.

지금은 순수 로직 유닛테스트만 있음(`src/**/*.test.ts` — `combineAnxietyScore`,
`getTier`, `scoreColor` 등 결정적 함수). `@testing-library/react` + jsdom은
설치·설정(`src/test/setup.ts`)까지 끝났고 컴포넌트 테스트는 `NeedStagesView`·`Dashboard`·`ResultView`·`IntroView`·`QuestionView.record`·`PracticePage`·`HaruProfileView` 뿐 —
필요해지면 `*.test.tsx`로 추가.

백엔드 쪽 계층별(순수 로직/정확도 검증/API 통합) 테스트 설계는
`backend/docs/TESTING.md` 참고 (레포가 다르므로 로컬에 함께 클론돼 있을 때만 참조 가능).

## 알려진 이슈 / 확인 필요

- ~~`/interview` 라우트에 `PrivateRoute` 누락~~ → 수정 완료 (`src/app/router.tsx`,
  다른 라우트와 동일하게 `PrivateRoute`로 감쌈). `VITE_USE_MOCK_API=true`로 백엔드
  없이 화면만 확인하는 흐름(README "개발" 섹션)은 인증 상태와 무관하게 그대로 동작.
- 로그인 없이 시작: 메인 "무료로 시작하기"는 `/dashboard`로 가고, `PrivateRoute`는 로그인하지 않았으면 로그인 화면 대신
  게스트 계정을 자동으로 만들어 들여보낸다(backend `POST /api/guest`, 30일 토큰). 이어서 `NicknameGate`가 뒤 화면을 흐리게
  두고 "어떻게 불러 드릴까요?" 창을 가운데 띄운다 — 이름은 `PUT /api/me/nickname`으로 계정(User.nickname)에 저장돼 훈련
  끝까지 유지된다. 게스트 헤더는 "<이름>님 · 로그인"(로그아웃하면 기록을 잃어서 로그아웃 버튼이 없음), 게스트로 남긴 기록은
  로그인·회원가입해도 옮겨지지 않는다. 401을 받으면 `client.ts`가 토큰을 지운다.
- 2단계 하루 영상 통화(내 얼굴이 안 보임): 표정·시선·깜빡임은 **사용자가 대답하는 동안(listen)만** 잰다
  (`useLiveFaceSession`의 `isMeasuring`, `measure.ts`) — 화면 안내 "그 밖에는 편하게 봐도 돼요"와 맞춤. 대답한 시간이 5초
  미만이면 통화 전체로 대신. 통화 중 얼굴이 2초 넘게 안 잡히면 "얼굴이 카메라에서 벗어났어요"(얼굴 미검출 = 시선 회피로
  계산되므로). 판정이 맞는지 확인은 `/face?debug=1`(실시간 판정값 + 정답 표시 키보드 + 숫자만 CSV) — 시선·미소 임계값을
  바꾸기 전에 이 기록을 여러 사람으로 모아 근거를 남길 것(backend CLAUDE.md 규칙). 눈동자(iris)는 아직 기준값 보정 없이
  절대값 ±0.15로 판정한다(카메라가 화면 위에 있으면 눈만 내려 하루를 보는 사람이 회피로 잡힐 수 있음 — 검증 후 결정).
- 과거 버그·트러블슈팅 기록은 별도 레포 `re-born-hongik-univ/trouble-shooting`의
  `frontend/`에 있음 — 비슷한 증상(크래시, 프록시 누락 등) 다룰 땐 먼저 검색.

## 컨벤션

- 백엔드 연동 전 임시 로직(mock 값, 고정 질문 리스트 등)은 코드에 왜 임시인지와
  실제 연동 시 뭘 바꾸면 되는지를 주석으로 남긴다 (`src/features/interview/difficulty.ts`
  의 `QUESTION_BANK` 패턴 참고).
- 면접 답변 텍스트는 민감정보다. 면접 시작 화면(`IntroView`)에는 동의 체크박스 없이 "저장되고 AI로 전송된다"는 안내만
  둔다(팀 결정: 동의율이 낮을 것). 이 안내와 결과 화면의 기록 삭제는 유지하고, 동의 방식은 약관/개인정보 처리방침
  쪽에서 팀이 확인할 것. 결과 화면에는 점수·등급·비교 같은 평가 표현을 넣지 않는다(사회불안 사용자가 평가받는
  느낌을 받으면 다시 오지 않음). 최종 통합 리포트(경량 웹 화면)도 0~100 점수 숫자는 보이지 않고 상태 칩과 실제로 센
  횟수·초만 보여 준다 — 다만 2단계 "지난번과 비교" 문장은 경량 웹 리포트를 따라 넣었으니 팀이 이 원칙과 맞는지 확인할 것.
- 커밋 메시지는 한국어로, "무엇을"보다 "왜" 위주로 쓴다.
