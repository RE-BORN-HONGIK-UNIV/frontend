# Re-born · frontend

발화 불안·사회불안을 가진 고립·은둔 청년을 위한 AI 기반 디지털 재활 웹앱의 프론트엔드.

## 스택

| 영역 | 기술 |
|---|---|
| 빌드 | Vite 8 + TypeScript |
| UI | Mantine 8 (`theme.ts` — 그린 brand 스케일, Spectral / Noto Sans KR) |
| 서버 상태 | TanStack Query 5 |
| 라우팅 | react-router-dom 7 (`createBrowserRouter`, `PrivateRoute`) |
| 디자인 토큰 | `src/index.css` `:root` 의 `--rb-*` 변수 |

## 개발

```bash
npm install
npm run dev        # http://localhost:3000 (백엔드로 /api·/analyze·/health 프록시)
```

백엔드(`../backend`, Flask :5000)를 함께 띄워야 로그인·분석이 동작합니다.
백엔드는 `backend/.env.example`을 참고해 `.env`를 만들어야 실행됩니다 (DB 접속정보·SECRET_KEY 필수, 없으면 서버가 바로 종료됨).

백엔드 없이 프론트만 확인하고 싶으면 `.env.example`을 `.env`로 복사한 뒤 `VITE_USE_MOCK_API=true`로 바꾸세요.
로그인·1단계 음성 분석·2단계 표정/시선 분석이 전부 가짜 응답(`lib/api/mock.ts`)으로 동작합니다
(3단계 면접은 애초에 백엔드 없이도 화면 흐름을 확인할 수 있게 만들어져 있어요 — `features/interview/difficulty.ts`의 `getAnxietyScore`/`QUESTION_BANK` 참고).

```bash
npm run build      # tsc --noEmit + vite build
npm run lint
npm run typecheck
npm run test       # vitest — 순수 로직 유닛테스트 (difficulty.ts, scoreColor.ts 등)
```

push/PR 시 GitHub Actions에서 위 네 개(lint·typecheck·test·build)를 자동으로 확인합니다 (`.github/workflows/ci.yml`).

### 테스트 하네스

지금은 **순수 로직 유닛테스트**만 있음 (`src/**/*.test.ts`, `vitest.config.ts`) — `combineAnxietyScore`/`getTier`/`scoreColor`처럼 입력→출력이 결정적인 함수 위주. 컴포넌트 테스트(`@testing-library/react`)는 의존성만 깔아뒀고 아직 작성된 건 없음 — 필요해지면 `*.test.tsx`로 추가하면 됨 (`src/test/setup.ts`에 jest-dom matcher 이미 로드됨).

`vitest.config.ts`를 `vite.config.ts`와 분리해둔 이유: vitest가 내부적으로 물고 있는 vite(rollup 기반)와 이 프로젝트의 vite(rolldown 기반, v8)의 Plugin 타입이 서로 안 맞아서 한 파일에 합치면 `tsc`가 타입 에러를 냄. 백엔드 쪽 계층별 테스트 설계(정확도 검증 하네스 포함)는 `backend/docs/TESTING.md` 참고.

## 구조

```
src/
  app/         router.tsx, RootLayout.tsx
  components/  PageHeader, PrivateRoute, RebornMark, RebornWordmark, SectionBadge, AuthShell
  features/
    auth/      로그인·회원가입 mutation
    voice/     1단계 음성 분석 — 상수, 폴백 피드백, 쿼리, 레이더 차트, Step1 LLM 코칭
    face/      2단계 표정·시선 분석 — 상수, 지표 비교 텍스트, 쿼리
    interview/ 3단계 모의 면접 — 면접관 아바타, TTS/STT 연동, 난이도(tier) 로직, 카메라·마이크 녹화
    progress/  1단계 진행 상태 (localStorage). 2단계는 백엔드 DB(Stage2Result)로 이전됨 — backend/DB_DESIGN.md 참고
  lib/         api/{client,types}, auth.ts
  pages/       Landing, Login, Signup, Dashboard, VoiceStage, FaceStage, InterviewStage
  theme.ts, index.css
```

## 화면

- **Landing** `/` · **Login** `/login` · **Signup** `/signup`
- **Dashboard** `/dashboard` — 3단계 진행 현황 (인증 필요)
- **VoiceStage** `/voice` — 1단계 음성 정밀 진단: 업로드 → `/analyze` → 오각형 레이더 + AI 코칭 (인증 필요)
- **FaceStage** `/face` — 2단계 표정·시선 분석: 영상 업로드 → `/analyze/gaze-blink` → 깜빡임·시선·표정 지표 + 하이라이트 클립 + 지난 세션 대비 비교 (인증 필요)
- **InterviewStage** `/interview` — 3단계 모의 면접: 아바타 인사 → 카메라/마이크 예열 → 난이도별 질문(TTS) → 답변(STT) → 꼬리질문 → 대화 기록

## 환경변수

- `VITE_API_BASE_URL` — 배포 빌드에서 백엔드 주소. 개발 시엔 비워두면 Vite 프록시가 처리.
- `VITE_USE_MOCK_API` — `true`면 백엔드 없이 프론트만 실행 (위 "개발" 섹션 참고).
