import { defineConfig } from 'vitest/config';
import { fileURLToPath, URL } from 'node:url';

// vite.config.ts와 분리해둔 이유: vitest가 내부적으로 물고 있는 vite(rollup 기반)와
// 이 프로젝트의 vite(rolldown 기반, v8)의 Plugin 타입이 서로 안 맞아서 defineConfig를
// 합치면 tsc가 vite.config.ts에서 타입 에러를 냄. 지금 테스트는 JSX 없는 순수 로직만
// 다뤄서 react() 플러그인도 필요 없음 — 프로덕션 빌드 설정(vite.config.ts)은 그대로 두고
// 테스트 실행 설정만 분리.
export default defineConfig({
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
});
