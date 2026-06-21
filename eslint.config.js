import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import { fileURLToPath } from 'node:url';

export default tseslint.config(
  // Ignorar directorios generados
  {
    ignores: ['dist/**', 'docs/**', 'node_modules/**', 'coverage/**', 'eslint.config.js'],
  },

  // Base: TypeScript estricto
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,

  // Configuración general
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: fileURLToPath(new URL('.', import.meta.url)),
      },
    },
    plugins: {
      'react-hooks': reactHooks,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
    },
  },

  // Frontera 1: src/core/** no puede importar React, DOM ni src/react/**
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

  // Frontera 2: src/core/algorithms/** solo puede importar types/algorithm.ts, types/io.ts y algorithms/shared/**
  {
    files: ['src/core/algorithms/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            { group: ['react', 'react-dom', 'react/*'], message: 'Los algoritmos no pueden importar React.' },
            { group: ['*/core/registry*', '*/core/simulate*', '*/core/player*', '*/core/io-subsystem*'], message: 'Los algoritmos solo importan types/algorithm.ts, types/io.ts y algorithms/shared/**.' },
            { group: ['*/types/process*', '*/types/history*', '*/types/simulation-result*', '*/types/scheduler-state*'], message: 'Los algoritmos solo importan types/algorithm.ts y types/io.ts.' },
          ],
        },
      ],
    },
  },
);
