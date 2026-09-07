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
      { path: '*', element: <NotFound /> },
    ],
  },
]);
