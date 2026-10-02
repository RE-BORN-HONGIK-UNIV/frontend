import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// vitest는 globals를 켜지 않아서 RTL의 자동 cleanup이 안 걸린다 — 테스트 간에 렌더된 DOM이
// 남아 다음 테스트의 getBy/getAllBy 결과를 오염시키므로 직접 정리한다.
afterEach(() => cleanup());
