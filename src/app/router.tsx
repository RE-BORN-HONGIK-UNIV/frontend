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
import CommunityPage from '@/pages/CommunityPage';
import CommunityPostPage from '@/pages/CommunityPostPage';

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
        element: <InterviewStage />,
      },
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
      { path: '*', element: <NotFound /> },
    ],
  },
]);
