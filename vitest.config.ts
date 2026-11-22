import { defineConfig } from 'vitest/config';
import { fileURLToPath, URL } from 'node:url';

// vite.config.ts와 분리해둔 이유: vitest가 내부적으로 물고 있는 vite(rollup 기반)와
// 이 프로젝트의 vite(rolldown 기반, v8)의 Plugin 타입이 서로 안 맞아서 defineConfig를
// 합치면 tsc가 vite.config.ts에서 타입 에러를 냄. 지금 테스트는 JSX 없는 순수 로직만
// 다뤄서 react() 플러그인도 필요 없음 — 프로덕션 빌드 설정(vite.config.ts)은 그대로 두고
// 테스트 실행 설정만 분리.
// Node 25부터 Node 자체 localStorage(Web Storage)가 기본으로 켜져서, 테스트용 브라우저(jsdom)의 localStorage를
// 가려 버린다 — 저장 파일 없이 켜진 Node localStorage는 비어 있어(undefined) localStorage.clear() 같은 테스트가 전부
// 실패했다(Node 26에서 실제로 겪음: 34개 파일 중 12개, 53개 테스트). 테스트를 돌리는 Node에서만 꺼서 jsdom 것을 쓰게 한다.
// 이 옵션은 Node 22.4+에만 있어서(그 전 Node는 모르는 옵션이면 시작을 못 함) 22 이상일 때만 넘긴다.
const nodeMajor = Number(process.versions.node.split('.')[0]);
const execArgv = nodeMajor >= 22 ? ['--no-experimental-webstorage'] : [];

export default defineConfig({
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    poolOptions: { forks: { execArgv }, threads: { execArgv } },
  },
});
