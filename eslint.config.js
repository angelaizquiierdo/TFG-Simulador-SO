// @ts-check
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';

export default tseslint.config(
  {
    ignores: ['dist/**', 'docs/**', 'node_modules/**', 'coverage/**', 'vite.config.ts', '*.js'],
  },
  {
    files: ['src/**/*.ts', 'src/**/*.tsx', 'tests/**/*.ts', 'tests/**/*.tsx'],
    extends: [
      ...tseslint.configs.strictTypeChecked,
      ...tseslint.configs.stylisticTypeChecked,
    ],
    languageOptions: {
      parserOptions: {
        project: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    plugins: {
      'react-hooks': reactHooks,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
    },
  },
  // Frontera: src/core/** no puede importar react ni src/react/**
  {
    files: ['src/core/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            { group: ['react', 'react-dom', 'react/*'], message: 'src/core no puede importar React.' },
            { group: ['*/react/*', '../react/*', '../../react/*'], message: 'src/core no puede importar src/react.' },
          ],
        },
      ],
    },
  },
  // Frontera: src/core/algorithms/** solo puede importar tipos permitidos
  {
    files: ['src/core/algorithms/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            { group: ['react', 'react-dom', 'react/*'], message: 'Los algoritmos no pueden importar React.' },
            { group: ['*/react/*', '../react/*'], message: 'Los algoritmos no pueden importar src/react.' },
            {
              group: ['*/core/simulate*', '*/core/registry*', '*/core/player*'],
              message: 'Los algoritmos solo pueden importar desde types/algorithm.ts y types/io.ts.',
            },
          ],
        },
      ],
    },
  },
);
