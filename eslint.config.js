// @ts-check
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import jsxA11y from 'eslint-plugin-jsx-a11y';

export default tseslint.config(
  // Ignores
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      'docs/**',
      'simulador-ui/**',
      '*.config.js',
      '*.config.ts',
    ],
  },

  // Base TypeScript rules
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,

  // All src/ and tests/
  {
    files: ['src/**/*.{ts,tsx}', 'tests/**/*.{ts,tsx}'],
    languageOptions: {
      parserOptions: {
        project: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      'react-hooks': reactHooks,
      'jsx-a11y': jsxA11y,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
    },
  },

  // Boundary: src/core/** must NOT import React, DOM, or src/react/**
  {
    files: ['src/core/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            { group: ['react', 'react-dom', 'react/*'], message: 'src/core no puede importar React.' },
            { group: ['*/src/react/*', '../react/*', '../../react/*'], message: 'src/core no puede importar src/react.' },
          ],
        },
      ],
    },
  },

  // Boundary: src/core/algorithms/** can ONLY import types/algorithm.ts
  {
    files: ['src/core/algorithms/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            { group: ['react', 'react-dom', 'react/*'], message: 'Los algoritmos no pueden importar React.' },
            { group: ['*/src/react/*', '../react/*', '../../react/*', '../../../react/*'], message: 'Los algoritmos no pueden importar src/react.' },
            { group: ['*/core/registry*', '*/core/simulate*', '*/core/player*', '*/core/types/process*', '*/core/types/history*', '*/core/types/simulation-result*', '*/core/types/scheduler-state*'], message: 'Los algoritmos solo pueden importar types/algorithm.ts.' },
          ],
        },
      ],
    },
  },
);
