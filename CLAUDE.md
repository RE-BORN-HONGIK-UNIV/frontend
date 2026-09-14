# Re-born · frontend

발화 불안·사회불안을 가진 고립·은둔 청년을 위한 AI 기반 디지털 재활 웹앱의 프론트엔드.
자세한 스택·화면·환경변수는 `README.md` 참고 — 이 파일은 Claude Code로 작업할 때
바로 필요한 것만 정리.

## 스택 / 구조

Vite 8(rolldown 기반) + React 19 + TypeScript + Mantine 8 + TanStack Query 5 +
react-router-dom 7. 구조는 `README.md`의 "구조" 섹션 참고 (`src/features/*`가 단계별
도메인 로직, `src/lib/api`가 백엔드 연동).

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

지금은 순수 로직 유닛테스트만 있음(`src/**/*.test.ts` — `combineAnxietyScore`,
`getTier`, `scoreColor` 등 결정적 함수). `@testing-library/react` + jsdom은
설치·설정(`src/test/setup.ts`)까지 끝났지만 컴포넌트 테스트는 아직 없음 —
필요해지면 `*.test.tsx`로 추가.

백엔드 쪽 계층별(순수 로직/정확도 검증/API 통합) 테스트 설계는
`backend/docs/TESTING.md` 참고 (레포가 다르므로 로컬에 함께 클론돼 있을 때만 참조 가능).

## 알려진 이슈 / 확인 필요

- ~~`/interview` 라우트에 `PrivateRoute` 누락~~ → 수정 완료 (`src/app/router.tsx`,
  다른 라우트와 동일하게 `PrivateRoute`로 감쌈). `VITE_USE_MOCK_API=true`로 백엔드
  없이 화면만 확인하는 흐름(README "개발" 섹션)은 인증 상태와 무관하게 그대로 동작.
- 과거 버그·트러블슈팅 기록은 별도 레포 `re-born-hongik-univ/trouble-shooting`의
  `frontend/`에 있음 — 비슷한 증상(크래시, 프록시 누락 등) 다룰 땐 먼저 검색.

## 컨벤션

- 백엔드 연동 전 임시 로직(mock 값, 고정 질문 리스트 등)은 코드에 왜 임시인지와
  실제 연동 시 뭘 바꾸면 되는지를 주석으로 남긴다 (`src/features/interview/difficulty.ts`
  의 `getAnxietyScore`/`QUESTION_BANK` 패턴 참고).
- 커밋 메시지는 한국어로, "무엇을"보다 "왜" 위주로 쓴다.
