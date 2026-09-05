import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import VoiceStage from './pages/VoiceStage';
import ComingSoon from './pages/ComingSoon';
import Login from './pages/Login';
import Landing from './pages/Landing';
import Signup from './pages/Signup';
import TrainingGuide from './pages/TrainingGuide';

<Route path="/voice/training/:axisKey" element={<PrivateRoute><TrainingGuide /></PrivateRoute>} />

function PrivateRoute({ children }) {
  const token = localStorage.getItem('token');
  return token ? children : <Navigate to="/login" />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
        <Route path="/voice" element={<PrivateRoute><VoiceStage /></PrivateRoute>} />
        <Route
          path="/face"
          element={<PrivateRoute><ComingSoon title="표정 분석" subtitle="멀티모달 인터랙션 · 2단계" /></PrivateRoute>}
        />
        <Route
          path="/interview"
          element={<PrivateRoute><ComingSoon title="실전 모의 면접" subtitle="Adaptive Interview · 3단계" /></PrivateRoute>}
        />
      </Routes>
    </BrowserRouter>
  );
}