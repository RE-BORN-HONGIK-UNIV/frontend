import { createBrowserRouter } from 'react-router-dom';
import { PrivateRoute } from '@/components/PrivateRoute';
import { RootLayout } from './RootLayout';
import Landing from '@/pages/Landing';
import Login from '@/pages/Login';
import Signup from '@/pages/Signup';
import VoiceStage from '@/pages/VoiceStage';
import FaceStage from '@/pages/FaceStage';
import Dashboard from '@/pages/Dashboard';
import { NotFound } from '@/pages/stubs';
import InterviewStage from '@/pages/InterviewStage';
import PracticePage from '@/pages/PracticePage';
import ReportPage, { SampleReportPage } from '@/pages/ReportPage';
import CommunityPage from '@/pages/CommunityPage';
import CommunityPostPage from '@/pages/CommunityPostPage';
import { LiveFaceSpike } from '@/features/face/live/Spike';
import { LiveBlinkDemo } from '@/features/face/live/LiveBlinkDemo';
import { LiveGazeDemo } from '@/features/face/live/LiveGazeDemo';
import { LiveExpressionDemo } from '@/features/face/live/LiveExpressionDemo';

export const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      { path: '/', element: <Landing /> },
      { path: '/login', element: <Login /> },
      { path: '/signup', element: <Signup /> },
      {
        path: '/dashboard',
        element: (
          <PrivateRoute>
            <Dashboard />
          </PrivateRoute>
        ),
      },
      {
        path: '/voice',
        element: (
          <PrivateRoute>
            <VoiceStage />
          </PrivateRoute>
        ),
      },
      {
        path: '/face',
        element: (
          <PrivateRoute>
            <FaceStage />
          </PrivateRoute>
        ),
      },
      {
        path: '/interview',
        element: (
          <PrivateRoute>
            <InterviewStage />
          </PrivateRoute>
        ),
      },
      {
        path: '/practice',
        element: (
          <PrivateRoute>
            <PracticePage />
          </PrivateRoute>
        ),
      },
      {
        // 최종 통합 리포트 다시 보기 (대시보드에서)
        path: '/report',
        element: (
          <PrivateRoute>
            <ReportPage />
          </PrivateRoute>
        ),
      },
      // 예시 리포트 — 로그인 없이 리포트 모양 확인용(판넬·팀). 값은 예시이고 화면에 그렇게 표시됨
      { path: '/report/sample', element: <SampleReportPage /> },
      {
        path: '/community',
        element: (
          <PrivateRoute>
            <CommunityPage />
          </PrivateRoute>
        ),
      },
      {
        path: '/community/:id',
        element: (
          <PrivateRoute>
            <CommunityPostPage />
          </PrivateRoute>
        ),
      },
      // Phase 0 스파이크 전용, 임시 라우트 — 확인 끝나면 Spike.tsx와 같이 제거
      { path: '/face/live-spike', element: <LiveFaceSpike /> },
      // Phase 1 데모 전용, 임시 라우트 — FaceStage.tsx에 통합되면(Phase 4) 제거
      { path: '/face/live-blink-demo', element: <LiveBlinkDemo /> },
      // Phase 2 데모 전용, 임시 라우트 — FaceStage.tsx에 통합되면(Phase 4) 제거
      { path: '/face/live-gaze-demo', element: <LiveGazeDemo /> },
      // Phase 3 데모 전용, 임시 라우트 — FaceStage.tsx에 통합되면(Phase 4) 제거
      { path: '/face/live-expression-demo', element: <LiveExpressionDemo /> },
      { path: '*', element: <NotFound /> },
    ],
  },
]);
