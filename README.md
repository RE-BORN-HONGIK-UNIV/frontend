# Re-born · frontend

발화 불안·사회불안을 가진 고립·은둔 청년을 위한 AI 기반 디지털 재활 웹앱의 프론트엔드.

## 스택

| 영역 | 기술 |
|---|---|
| 빌드 | Vite 8 + TypeScript |
| UI | Tailwind CSS 4 + 자체 경량 컴포넌트(`src/components/ui/`) — 2026-09-14 Mantine 전면 교체 |
| 서버 상태 | TanStack Query 5 |
| 라우팅 | react-router-dom 7 (`createBrowserRouter`, `PrivateRoute`) |
| 디자인 토큰 | `src/index.css` `:root`의 `--rb-*` 변수 + `@theme` 블록(Tailwind 유틸리티로 매핑), 다크모드는 `[data-theme='dark']` 오버라이드(`src/lib/theme.ts`/`useTheme.ts`) |
| 2단계 실시간 분석 | `@mediapipe/tasks-vision`(브라우저 WASM) — 얼굴 영상이 서버로 안 나가게 클라이언트에서 직접 추론, WASM/모델은 `public/mediapipe/`에 자체 호스팅(CDN 안 씀) |

## 개발

```bash
npm install
npm run dev        # http://localhost:3000 (백엔드로 /api·/analyze·/health 프록시)
```

백엔드(`../backend`, Flask :5000)를 함께 띄워야 로그인·분석이 동작합니다.
백엔드는 `backend/.env.example`을 참고해 `.env`를 만들어야 실행됩니다 (DB 접속정보·SECRET_KEY 필수, 없으면 서버가 바로 종료됨).

백엔드 없이 프론트만 확인하고 싶으면 `.env.example`을 `.env`로 복사한 뒤 `VITE_USE_MOCK_API=true`로 바꾸세요.
로그인·1단계 음성 분석·2단계 표정/시선 분석이 전부 가짜 응답(`lib/api/mock.ts`)으로 동작합니다
(3단계 면접의 추천 면접관은 1·2단계 최신 점수(`/analyze/stage1/latest`, `/analyze/stage2/latest`)로 정해지고, mock 모드에선 `mock.ts`의 가짜 점수(합산 55 → 표준 난이도)를 씀. 질문은 `features/interview/difficulty.ts`의 `QUESTION_BANK` 폴백 참고).

```bash
npm run build      # tsc --noEmit + vite build
npm run lint
npm run typecheck
npm run test       # vitest — 순수 로직 유닛테스트 (difficulty.ts, scoreColor.ts 등)
```

push/PR 시 GitHub Actions에서 위 네 개(lint·typecheck·test·build)를 자동으로 확인합니다 (`.github/workflows/ci.yml`).

### 테스트 하네스

지금은 **순수 로직 유닛테스트**가 대부분 (`src/**/*.test.ts`, `vitest.config.ts`, 14개 파일 89개 테스트) — `combineAnxietyScore`/`getTier`/`scoreColor`처럼 입력→출력이 결정적인 함수, 그리고 `features/face/live/*.test.ts`(눈 깜빡임/시선/표정 판정 로직)가 대부분을 차지함. 후자는 대응하는 backend pytest 픽스처를 그대로 옮겨서 수치가 bit-for-bit 일치하는지 검증하는 방식 — 아래 "2단계 실시간 웹캠 분석" 참고. 컴포넌트 테스트(`@testing-library/react`)는 `NeedStagesView.test.tsx`, `Dashboard.test.tsx` 두 개뿐 — 필요해지면 `*.test.tsx`로 추가하면 됨 (`src/test/setup.ts`에 jest-dom matcher와 테스트 간 DOM cleanup이 이미 설정됨).

`vitest.config.ts`를 `vite.config.ts`와 분리해둔 이유: vitest가 내부적으로 물고 있는 vite(rollup 기반)와 이 프로젝트의 vite(rolldown 기반, v8)의 Plugin 타입이 서로 안 맞아서 한 파일에 합치면 `tsc`가 타입 에러를 냄. 백엔드 쪽 계층별 테스트 설계(정확도 검증 하네스 포함)는 `backend/docs/TESTING.md` 참고.

### UI 컴포넌트 (Mantine → Tailwind 전면 교체, 2026-09-14)

`src/components/ui/`가 예전 `@mantine/core` 자리를 대체함 — Box/Stack/Group/Text/Button/TextInput 등
이름과 자주 쓰던 props(fz/c/fw/mt/mb/p/gap/radius/color 등)를 그대로 유지해서, 기존 23개 파일의
JSX를 거의 안 바꾸고 import만 교체하는 식으로 마이그레이션함. 그래서:

- **UI를 고칠 때** 두 가지 방법이 있음: (1) `src/components/ui/*.tsx`를 고치면 전체 화면에 한 번에 반영됨(공통 스타일), (2) 각 페이지 파일에서 Tailwind 클래스를 직접 추가/수정하면 그 화면만 바뀜. 전면적인 톤 변경(색상/라운드 등)은 (1), 특정 화면만 손볼 땐 (2).
- **기능 재구현한 것**: `@mantine/form` → `src/lib/useForm.ts`, `@mantine/notifications` → `src/components/ui/Toaster.tsx`(+ `lib/toast.ts`는 API 그대로), `@mantine/dropzone` → `src/components/ui/Dropzone.tsx`(HTML5 drag&drop), `@mantine/hooks`의 `useMediaQuery` → `src/lib/useMediaQuery.ts`.
- **디자인 토큰**: `src/index.css`의 `@theme` 블록이 `--rb-*` 변수를 Tailwind 유틸리티(`bg-primary`, `text-ink` 등)로 노출함 — 새 컴포넌트 짤 때 Tailwind 클래스로 바로 쓸 수 있음.
- Grid/SimpleGrid의 반응형 컬럼 수는 Tailwind가 클래스명을 소스 텍스트에서 정적으로 찾기 때문에, `col-span-8`처럼 리터럴 문자열로 미리 맵을 만들어둠(`Grid.tsx`/`SimpleGrid.tsx`) — 동적 템플릿 문자열(`col-span-${n}`)로 바꾸면 빌드에서 빠지니 주의.

## 구조

```
src/
  app/         router.tsx, RootLayout.tsx
  components/  PageHeader, PrivateRoute, RebornWordmark, Reveal, SectionBadge, SiteNavLinks, ThemeToggle, AuthShell
  features/
    auth/      로그인·회원가입 mutation
    voice/     1단계 음성 분석 — 상수, 폴백 피드백, 쿼리, 레이더 차트, Step1 LLM 코칭
    face/      2단계 표정·시선 분석 — 상수, 지표 비교 텍스트, 쿼리, 결과 시각화(ScoreTrack/GazeTimeline/ExpressionPlayback)
      live/    실시간 웹캠 분석(업로드 없이 바로 분석) — 아래 "2단계 실시간 웹캠 분석" 참고
    interview/ 3단계 모의 면접 — 면접관 아바타, TTS/STT 연동, 난이도(tier) 로직, 카메라·마이크 녹화
    community/ "이야기" 자유 게시판 — 목록/글쓰기/댓글
    progress/  1단계 진행 상태 (localStorage). 2단계는 백엔드 DB(Stage2Result)로 이전됨 — backend/DB_DESIGN.md 참고
  lib/         api/{client,types}, auth.ts, theme.ts/useTheme.ts(다크모드), toast.ts, useForm.ts, useMediaQuery.ts
  pages/       Landing, Login, Signup, Dashboard, VoiceStage, FaceStage, InterviewStage, CommunityPage, CommunityPostPage
  components/ui/  Mantine 대체 경량 컴포넌트 (Box, Stack, Button, TextInput, Dropzone, Toaster 등)
  index.css
```

### 2단계 실시간 웹캠 분석 (`features/face/live/`)

기존엔 영상 파일을 업로드해야만 분석됐는데, `FaceStage`에 "영상 업로드"/"실시간 촬영" 모드 토글을 추가해서 웹캠으로 바로 분석할 수 있음. 얼굴 영상은 서버로 안 나가고 브라우저에서 `@mediapipe/tasks-vision`으로 직접 추론함(프라이버시 + 백엔드 메모리 부담 회피).

- `blink.ts`/`gaze.ts`/`expression.ts`/`scoring.ts`/`calibration.ts` — backend `step2/*.py`의 판정 로직(임계값·공식)을 그대로 포팅. 대응하는 backend pytest 픽스처를 Vitest로 옮겨서 수치가 정확히 일치하는지 검증함(느낌으로 재구현 금지 — `backend/step2/ACCURACY_NOTES.md`에 근거 있는 값들이라).
- `headPose.ts` — 시선 판정에 필요한 머리 자세는 backend가 `cv2.solvePnP`로 계산하지만, 여기선 MediaPipe가 자체 제공하는 얼굴 변환 행렬을 씀(추가 WASM 불필요) — 알고리즘이 달라 임계값을 실기기로 재검증함.
- `segmentBuffer.ts` — backend의 구간 병합(`_merge_short_segments`)은 "구간이 끝나야 짧았는지 안다"는 회고적 로직이라 실시간에 그대로 못 씀 — 상태 변화 후 0.3초 보류했다가 확정/흡수하는 지연 버퍼로 재설계(시선·표정 공용).
- `useLiveFaceSession.ts`/`LiveCaptureView.tsx` — 위 로직들을 한 MediaPipe 세션으로 묶어서 5초 캘리브레이션 → 캘리브레이션 확인 → 실제 촬영(최대 3분) → 파일 업로드와 동일한 형태의 결과 객체 생성까지 담당.
- 하이라이트 클립(영상에서 특정 순간만 잘라 보여주는 기능)은 실시간 모드에선 녹화본이 없어서 생성 못 함 — 항상 `null`, 결과 화면은 원래 이 경우를 "짚어줄 순간 없음"으로 처리하게 돼 있어서 그대로 재사용됨. 촬영이 끝나면 숫자 요약만 서버(`POST /analyze/gaze-blink/live`, 영상은 안 보냄)에 저장하고, 업로드 모드와 **같은 이력**(`Stage2Result`)에서 "직전 기록"을 받아 비교함 — 기기를 바꿔도 이어지고 3단계 난이도(추천 면접관)에도 반영됨. 저장 실패·시간초과·미로그인 시엔 브라우저 `localProgress`(로컬스토리지) 이력으로 폴백.

## 화면

- **Landing** `/` · **Login** `/login` · **Signup** `/signup`
- **Dashboard** `/dashboard` — 3단계 진행 현황 (인증 필요)
- **VoiceStage** `/voice` — 1단계 음성 정밀 진단: 업로드 → `/analyze` → 오각형 레이더 + AI 코칭 (인증 필요)
- **FaceStage** `/face` — 2단계 표정·시선 분석: "영상 업로드"(`/analyze/gaze-blink`) 또는 "실시간 촬영"(브라우저에서 바로 분석) 중 선택 → 깜빡임·시선·표정 지표 + 지난 세션 대비 비교, 업로드 모드만 하이라이트 클립 제공 (인증 필요)
- **InterviewStage** `/interview` — 3단계 모의 면접: 아바타 인사 → 카메라/마이크 예열 → 난이도별 질문(TTS) → 답변(STT) → 꼬리질문 → 대화 기록
- **CommunityPage** `/community`, **CommunityPostPage** `/community/:id` — "이야기" 자유 게시판: 목록/글쓰기/댓글 (인증 필요)

## 환경변수

- `VITE_API_BASE_URL` — 배포 빌드에서 백엔드 주소. 개발 시엔 비워두면 Vite 프록시가 처리.
- `VITE_USE_MOCK_API` — `true`면 백엔드 없이 프론트만 실행 (위 "개발" 섹션 참고).
