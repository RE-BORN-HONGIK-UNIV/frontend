import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: {
    port: 3000,
    proxy: {
      '/api': 'http://localhost:5000',
      '/analyze': 'http://localhost:5000',
      '/health': 'http://localhost:5000',
      '/community/posts': 'http://localhost:5000',
      // /interview·/haru를 통째로 넘기면 안 됨 — /interview는 화면 경로(새로고침하면 백엔드로 가 버림),
      // /haru/*.jpg는 public/ 그림이다. 그래서 백엔드 API 경로만 하나씩 적는다(client.ts에 새 경로를 추가하면 여기도).
      '/interview/tts': 'http://localhost:5000',
      '/interview/next-question': 'http://localhost:5000',
      '/interview/transcribe': 'http://localhost:5000',
      '/interview/sessions': 'http://localhost:5000',
      '/interview/practice-hint': 'http://localhost:5000',
      '/interview/anxiety': 'http://localhost:5000',
      '/haru/reply': 'http://localhost:5000',
      '/haru/profile': 'http://localhost:5000',
    },
  },
});
