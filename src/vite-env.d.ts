/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  /** 'true'면 백엔드 없이 프론트만 실행 — lib/api/client.ts가 mock.ts의 가짜 응답을 씀. */
  readonly VITE_USE_MOCK_API?: string;
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}
