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
로그인·1단계 음성 분석·2단계 결과 저장이 전부 가짜 응답(`lib/api/mock.ts`)으로 동작합니다 (2단계 분석 자체는 원래 브라우저에서 돌아서 mock과 무관)
(3단계 면접의 추천 면접관은 1·2단계 최신 점수(`/analyze/stage1/latest`, `/analyze/stage2/latest`)로 정해지고, mock 모드에선 `mock.ts`의 가짜 점수(합산 55 → 표준 난이도)를 씀. 질문은 `features/interview/difficulty.ts`의 `QUESTION_BANK` 폴백 참고).

```bash
npm run build      # tsc --noEmit + vite build
npm run lint
npm run typecheck
npm run test       # vitest — 순수 로직 유닛테스트 (difficulty.ts, scoreColor.ts 등)
```

push/PR 시 GitHub Actions에서 위 네 개(lint·typecheck·test·build)를 자동으로 확인합니다 (`.github/workflows/ci.yml`).

### 테스트 하네스

지금은 **순수 로직 유닛테스트**가 대부분 (`src/**/*.test.ts`, `vitest.config.ts`, 22개 파일 176개 테스트) — `combineAnxietyScore`/`getTier`/`scoreColor`처럼 입력→출력이 결정적인 함수, 그리고 `features/face/live/*.test.ts`(눈 깜빡임/시선/표정 판정 로직)가 대부분을 차지함. 후자는 대응하는 backend pytest 픽스처를 그대로 옮겨서 수치가 bit-for-bit 일치하는지 검증하는 방식 — 아래 "2단계 실시간 웹캠 분석" 참고. 컴포넌트 테스트(`@testing-library/react`)는 `NeedStagesView`·`Dashboard`·`ResultView`·`Stage3PrepView`(저장·AI 전송 안내)·`QuestionView.record`(면접 기록 저장)·`PracticePage`(맞춤 연습) — 필요해지면 `*.test.tsx`로 추가하면 됨 (`src/test/setup.ts`에 jest-dom matcher와 테스트 간 DOM cleanup이 이미 설정됨).

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
    interview/ 3단계 모의 면접 — 면접관 아바타, TTS/STT 연동, 난이도(tier) 로직, 카메라·마이크 녹화, 면접 기록(질문·답변 텍스트) 서버 저장(`recorder.ts`)
    community/ "이야기" 자유 게시판 — 목록/글쓰기/댓글
    progress/  대시보드 진행 상태. 1·2·3단계 모두 서버 기록(Stage1Result·Stage2Result·InterviewSession, `useStageProgress`) 기준, 서버 조회 실패 시에만 localStorage 메모로 대신 표시 — backend/docs/DB_DESIGN.md 참고
  lib/         api/{client,types}, auth.ts, theme.ts/useTheme.ts(다크모드), toast.ts, useForm.ts, useMediaQuery.ts
  pages/       Landing, Login, Signup, Dashboard, VoiceStage, FaceStage, InterviewStage, CommunityPage, CommunityPostPage
  components/ui/  Mantine 대체 경량 컴포넌트 (Box, Stack, Button, TextInput, Dropzone, Toaster 등)
  index.css
```

### 2단계 실시간 웹캠 분석 (`features/face/live/`)

2단계는 **하루와 영상 통화하면서 실시간 촬영**하는 방식만 지원함(`HaruCallView` — 아래 "하루" 참고). 처음엔 영상 파일 업로드(`POST /analyze/gaze-blink`)로만 분석했고, 이후 "영상 업로드"/"실시간 촬영" 토글을 뒀다가 2026-10-31에 업로드 모드를 폐기함 — 얼굴 영상이 서버로 안 나가는 실시간 모드 하나로 통일. 얼굴 영상은 서버로 안 나가고 브라우저에서 `@mediapipe/tasks-vision`으로 직접 추론함(프라이버시 + 백엔드 메모리 부담 회피).

- `blink.ts`/`gaze.ts`/`expression.ts`/`scoring.ts`/`calibration.ts` — backend `step2/*.py`의 판정 로직(임계값·공식)을 그대로 포팅. 대응하는 backend pytest 픽스처를 Vitest로 옮겨서 수치가 정확히 일치하는지 검증함(느낌으로 재구현 금지 — `backend/step2/ACCURACY_NOTES.md`에 근거 있는 값들이라).
- `headPose.ts` — 시선 판정에 필요한 머리 자세는 backend가 `cv2.solvePnP`로 계산하지만, 여기선 MediaPipe가 자체 제공하는 얼굴 변환 행렬을 씀(추가 WASM 불필요) — 알고리즘이 달라 임계값을 실기기로 재검증함.
- `segmentBuffer.ts` — backend의 구간 병합(`_merge_short_segments`)은 "구간이 끝나야 짧았는지 안다"는 회고적 로직이라 실시간에 그대로 못 씀 — 상태 변화 후 0.3초 보류했다가 확정/흡수하는 지연 버퍼로 재설계(시선·표정 공용).
- `useLiveFaceSession.ts`/`HaruCallView.tsx` — 위 로직들을 한 MediaPipe 세션으로 묶어서 5초 캘리브레이션 → 캘리브레이션 확인 → 실제 촬영(최대 3분) → 결과 객체(`GazeBlinkResult`, 예전 업로드 분석 응답과 같은 형태라 결과 화면을 그대로 씀) 생성까지 담당.
- 하이라이트 클립(영상에서 특정 순간만 잘라 보여주는 기능)은 실시간 모드에선 녹화본이 없어서 생성 못 함 — 항상 `null`이고 결과 화면은 "짚어줄 순간 없음"으로 표시함. 촬영이 끝나면 숫자 요약만 서버(`POST /analyze/gaze-blink/live`, 영상은 안 보냄)에 저장하고, 서버 이력(`Stage2Result`)에서 "직전 기록"을 받아 비교함 — 기기를 바꿔도 이어지고 3단계 난이도(추천 면접관)에도 반영됨. 저장 실패·시간초과·미로그인 시엔 브라우저 `localProgress`(로컬스토리지) 이력으로 폴백.

### 하루 — 1·2단계 대화 상대 (`features/haru/`, 2026-10-31 경량 웹에서 이식)

판넬 OVERVIEW용으로 따로 만든 경량 웹(reborn-lite)의 대화 화면을 가져왔다. 큰 틀(로그인·대시보드·단계별 결과·3단계 면접)은 그대로고, 1·2단계의 "녹음/촬영하는 방식"만 하루와 대화하는 방식으로 바뀜. 2026-11에는 3단계 화면도 경량 웹("이제 실전 면접이에요" 시작 화면 → 어두운 면접실 화면)으로 바꿨다 — 면접관 고르기는 없애고 난이도는 1·2단계 점수로 자동(질문 수준·꼬리질문 수는 그대로), 받아쓴 답변 고치기 단계도 뺌(`Stage3PrepView`, `QuestionView`).

- **1단계** (`VoiceStage`): 마이크 캘리브레이션 → 하루와 채팅 모양 목소리 대화(질문 4개) → "1단계를 마쳤어요"(결과는 최종 리포트에서). 사용자가 말하는 구간만 이어 녹음해서(`useAnswerRecorder` — 하루 목소리·기다림은 빠짐) 기존 `/analyze`로 분석. 파일 업로드는 없앰.
- **2단계** (`FaceStage` → `HaruCallView`): 대기실(캘리브레이션, 통화 중 하루가 보일 자리에 내 얼굴) → 하루와 영상 통화(질문 4개, 내 얼굴은 2초 뒤 사라짐) → "2단계를 마쳤어요"(결과는 최종 리포트에서). 분석은 기존 실시간 촬영 그대로.
- **2→3 연결** (`HaruProfileView`, 3단계 첫 화면): "하루가 이렇게 이해했어요" 카드 — 1·2단계 대답을 항목별로 정리(`POST /haru/profile`)하고 사용자가 고친 내용을 3단계 기본 질문의 소재로 넘김(`/interview/next-question`의 `about_me`). 대답이 없으면 카드 없이 바로 면접관 선택.
- **최종 통합 리포트** (`features/report/`, 3단계 결과 자리): 1·2단계는 단계마다 결과를 따로 보여 주지 않고, 3단계를 마치면 한 장에 모은다 — 이번 연습 정리 → 1 말하기 습관(오각형·채움말 위치·긴 멈춤) → 2 시선과 표정(깜빡임 범위·시선/표정 흐름) → 3 실전 면접 돌아보기(기존 3단계 결과 화면 그대로). 화면은 경량 웹 리포트를 옮겼고 **값은 전부 실제 분석 결과**(경량 웹은 고정 예시였음). 점수 숫자(0~100)는 보이지 않고 상태 칩의 세 구간(`scoreTier`, `scoreColor`와 같은 75/55 경계)에만 쓴다. 값이 없는 칸(문장 끝 에너지 막대·떨림 곡선·질문별 음성 표시)은 만들지 않음. 1·2단계 세부값은 분석 직후 이 기기에 남기고(`stageDetails.ts`), 없으면 서버 요약 점수로 칩만 그림.
- **리포트의 "준비 중" 칸** — 경량 웹 리포트에 있던 칸은 값이 없어도 자리를 잡아 두고 "준비 중"으로 보인다(예시 값을 채우지 않음). 아래 이름으로 값이 들어오면 코드 수정 없이 바로 그려진다 (`lib/api/types.ts`, `features/report/stageDetails.ts` 주석 참고):
  - 1단계 `/analyze` 응답: `prolong_detail.events`(소리 늘이기), `energy_detail.sentence_bars`(문장 끝 에너지 막대), `tremor_detail.curve`(떨림 곡선)
  - ~~2단계 결과: `per_question`(질문별 깜빡임·눈 맞춤)~~ → 채움: 하루와 통화 중 질문이 바뀐 시각으로 기존 깜빡임·시선을 나눔(`face/live/perQuestion.ts`)
  - 리포트 저장값: `stage2Voice`(아직 없음) / ~~`stage3Voice`, `stage3Marks`~~ → 채움(2026-11): 3단계 면접 대답만 이어 녹음해 `/analyze`(`stage=3`, 1단계 점수는 안 덮음)로 보내고, Whisper 단어 시각으로 질문별 `[f:음] [l:저어] [p:3초 멈춤]` 표시를 만듦(`report/stage3Marks.ts`). `[k:…]`(바라보며 말한 부분)은 아직 없음
  - 3단계 얼굴: 면접 중 대답하는 동안 2단계와 같은 실시간 분석을 돌려 `stage3Face`로 남기고, 시선과 표정 칸에 "실전 면접에서는 …(2단계 …)" 줄로 보여 줌(2단계 이력에는 안 남김)
  - `/report/sample`에는 이 값들까지 예시로 넣어 두어서, 다 채워졌을 때의 모습을 볼 수 있다.
- 하루의 반응 한마디는 `POST /haru/reply`(Claude, 실패하면 정해 둔 공감 문장), 목소리는 `/interview/tts`의 `tier: 'haru'`(Typecast, 실패하면 브라우저 목소리), 대답 받아쓰기는 브라우저 음성 인식(크롬·엣지)이 먼저고 비면 그 대답 녹음을 서버 Whisper(`/interview/transcribe`)로 — 3단계와 같은 방식.
- 하루와 나눈 대답·카드는 **이 기기 localStorage에만**(계정별, `store.ts`) — 1·2단계를 다른 날 해도 이어지게 하되 민감한 대답을 서버 DB에 쌓지 않으려고. 카드에서 언제든 지울 수 있음.
- 그림(`public/haru/`)은 상태별 정지 그림(기본·말하기·듣기·생각)을 바꿔 끼움. 원본과 그림 프롬프트는 경량 웹 넘김본 참고.

## 화면

- **Landing** `/` · **Login** `/login` · **Signup** `/signup`
- **ReportPage** `/report` — 최종 통합 리포트 다시 보기(대시보드 "최종 리포트 다시 보기" 카드): 1·2단계는 이 기기 기록(없으면 서버 요약), 3단계는 서버의 가장 최근 완료 면접 + 저장돼 있던 코치 노트(AI 재호출 없음) (인증 필요)
- **예시 리포트** `/report/sample` — 로그인 없이 리포트 모양 확인용(판넬·팀). 값은 `features/report/sample.ts`의 예시이고 화면 맨 위에 "예시 화면"이라고 표시, 서버·AI 호출 없음
- **Dashboard** `/dashboard` — 3단계 진행 현황 (인증 필요). 1·2단계 완료는 서버에 저장된 분석 결과 기준이라 기기를 바꿔도 같고, 3단계 면접 난이도 산정과 같은 출처. "진행 상황 초기화"는 이 기기의 브라우저 기록만 지움(서버 기록은 유지)
- **VoiceStage** `/voice` — 1단계: 마이크 캘리브레이션 → 하루와 목소리 대화 → `/analyze`(결과는 3단계 뒤 최종 리포트) (인증 필요)
- **FaceStage** `/face` — 2단계: 하루와 영상 통화하는 동안 웹캠 실시간 분석(브라우저에서 바로 분석, 영상은 서버로 안 보냄, 결과는 3단계 뒤 최종 리포트) (인증 필요)
- **InterviewStage** `/interview` — 3단계 모의 면접: ("하루가 이렇게 이해했어요" 카드 →) 아바타 인사 → 카메라/마이크 예열 → 난이도별 질문(TTS) → 답변(STT) → 꼬리질문 → 대화 기록. 질문이 나올 때·답변이 확정될 때 텍스트를 서버에 저장하고(영상은 저장 안 함, 저장이 실패해도 면접은 계속됨), 끝까지 마치면 완료로 기록하고 결과 화면으로 이동. **면접 시작 화면에는 동의 절차 없이 "질문·답변 텍스트가 저장되고 AI로 전송된다"는 안내만 있음**(영상·음성은 저장 안 함, 결과 화면에서 삭제 가능). 결과 화면은 점수·평가 없이 "오늘 해낸 것 → 내 말 중 좋았던 한 문장 → 다음 한 걸음(카드 고르기, 코치 노트가 도착하면 — 늦어도 3초 뒤 — 위에서부터 한 장씩 펼쳐지듯 등장, 움직임 줄이기 설정이면 끔)" 순서이고, 질문·답변 다시 보기는 접혀 있으며, 기록 삭제가 가능. 카드마다 아이콘과 행동 버튼이 있고, "이 질문 다시 답해보기" 카드는 맞춤 연습 화면(`/practice`)으로 이동(방금 면접에서 답이 비었거나 가장 짧았던 질문을 힌트와 함께 한 번 더 답하고, 이전보다 좋아진 점만 알려줌 — AI 힌트는 `POST /interview/practice-hint`, 실패하면 일반 힌트). 코치 노트는 서버 에이전트(`POST /interview/sessions/<id>/coach-note`)가 만든 것을 화면이 비동기로 채움(실패해도 화면은 그대로)
- **CommunityPage** `/community`, **CommunityPostPage** `/community/:id` — "이야기" 자유 게시판: 목록/글쓰기/댓글 (인증 필요)

## 환경변수

- `VITE_API_BASE_URL` — 배포 빌드에서 백엔드 주소. 개발 시엔 비워두면 Vite 프록시가 처리.
- `VITE_USE_MOCK_API` — `true`면 백엔드 없이 프론트만 실행 (위 "개발" 섹션 참고).
