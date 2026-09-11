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

```bash
npm run build      # tsc --noEmit + vite build
npm run lint
npm run typecheck
```

push/PR 시 GitHub Actions에서 위 세 개(lint·typecheck·build)를 자동으로 확인합니다 (`.github/workflows/ci.yml`).

## 구조

```
src/
  app/         router.tsx, RootLayout.tsx
  components/  PageHeader, PrivateRoute, RebornMark, RebornWordmark, SectionBadge, AuthShell
  features/
    auth/      로그인·회원가입 mutation
    voice/     1단계 음성 분석 — 상수, 폴백 피드백, 쿼리, 레이더 차트, Step1 LLM 코칭
    face/      2단계 표정·시선 분석 — 상수, 지표 비교 텍스트, 쿼리
    progress/  1단계 진행 상태 (localStorage). 2단계는 백엔드 DB(Stage2Result)로 이전됨 — backend/DB_DESIGN.md 참고
  lib/         api/{client,types}, auth.ts
  pages/       Landing, Login, Signup, Dashboard, VoiceStage, FaceStage
  theme.ts, index.css
```

## 화면

- **Landing** `/` · **Login** `/login` · **Signup** `/signup`
- **Dashboard** `/dashboard` — 3단계 진행 현황 (인증 필요)
- **VoiceStage** `/voice` — 1단계 음성 정밀 진단: 업로드 → `/analyze` → 오각형 레이더 + AI 코칭 (인증 필요)
- **FaceStage** `/face` — 2단계 표정·시선 분석: 영상 업로드 → `/analyze/gaze-blink` → 깜빡임·시선·표정 지표 + 하이라이트 클립 + 지난 세션 대비 비교 (인증 필요)
- 3단계(모의 면접)는 미구현 — 설계 논의 중

## 환경변수

- `VITE_API_BASE_URL` — 배포 빌드에서 백엔드 주소. 개발 시엔 비워두면 Vite 프록시가 처리.
