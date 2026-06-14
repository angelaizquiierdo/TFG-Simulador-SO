// @ts-check
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import jsxA11y from 'eslint-plugin-jsx-a11y';

export default tseslint.config(
  // Ignorar archivos generados y dependencias
  {
    ignores: ['dist/**', 'node_modules/**', 'docs/**', 'coverage/**'],
  },

  // Base: strict + stylistic para archivos TypeScript con type information
  {
    files: ['src/**/*.{ts,tsx}', 'tests/**/*.{ts,tsx}'],
    extends: [
      ...tseslint.configs.strictTypeChecked,
      ...tseslint.configs.stylisticTypeChecked,
    ],
    languageOptions: {
      parserOptions: {
        project: './tsconfig.json',
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

  // Frontera: src/core/** NO puede importar React, DOM, ni src/react/**
  {
    files: ['src/core/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            { group: ['react', 'react-dom', 'react/*'], message: 'src/core no puede importar React.' },
            { group: ['*/react/*', '../react*', '../../react*'], message: 'src/core no puede importar src/react.' },
          ],
        },
      ],
    },
  },

  // Frontera adicional para algoritmos: solo pueden importar types/algorithm.ts
  {
    files: ['src/core/algorithms/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            { group: ['react', 'react-dom', 'react/*'], message: 'Los algoritmos no pueden importar React.' },
            { group: ['*/react/*', '../react*', '../../react*'], message: 'Los algoritmos no pueden importar src/react.' },
          ],
        },
      ],
    },
  },
);
