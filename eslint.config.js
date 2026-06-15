import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import jsxA11y from 'eslint-plugin-jsx-a11y';

export default tseslint.config(
  {
    ignores: ['dist/**', 'docs/**', 'node_modules/**'],
  },
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    plugins: {
      'react-hooks': reactHooks,
      'jsx-a11y': jsxA11y,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
    },
  },
  // Frontera: src/core/** no puede importar React/DOM ni src/react/**
  {
    files: ['src/core/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['react', 'react-dom', 'react/*'],
              message: 'src/core no puede importar React ni DOM',
            },
            {
              group: ['*/react/*', '../react/*', '../../react/*'],
              message: 'src/core no puede importar src/react',
            },
          ],
        },
      ],
    },
  },
  // Frontera: src/core/algorithms/** solo puede importar types/algorithm.ts
  {
    files: ['src/core/algorithms/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['react', 'react-dom', 'react/*'],
              message: 'Los algoritmos no pueden importar React',
            },
            {
              group: ['*/react/*', '../react/*'],
              message: 'Los algoritmos no pueden importar src/react',
            },
            {
              group: ['*/core/registry*', '*/core/simulate*', '*/core/player*'],
              message: 'Los algoritmos solo pueden importar types/algorithm.ts',
            },
          ],
        },
      ],
    },
  },
);
