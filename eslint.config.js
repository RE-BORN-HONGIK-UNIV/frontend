import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  // public/mediapipe: node_modules에서 그대로 복사한 emscripten WASM glue
  // 코드(vision_wasm_*.js) — 우리 소스가 아니라 린트 대상 아님
  { ignores: ['dist', 'public/mediapipe'] },
  js.configs.recommended,
  {
    files: ['**/*.cjs'],
    languageOptions: { globals: globals.node, sourceType: 'commonjs' },
  },
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
    },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    },
  },
);
