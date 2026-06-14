import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import jsxA11y from 'eslint-plugin-jsx-a11y';

export default tseslint.config(
  {
    ignores: ['dist/**', 'coverage/**', 'docs/**', '*.config.*'],
  },
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  {
    plugins: {
      'react-hooks': reactHooks,
      'jsx-a11y': jsxA11y,
    },
    languageOptions: {
      parserOptions: {
        project: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
    },
  },
  // Fronteras de arquitectura
  {
    files: ['src/core/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['react', 'react-dom', 'react/*'],
              message: 'src/core no puede importar React ni DOM.',
            },
            {
              group: ['../react/**', '../../react/**', '**/src/react/**'],
              message: 'src/core no puede importar desde src/react.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/core/algorithms/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['react', 'react-dom', 'react/*'],
              message: 'Los algoritmos no pueden importar React.',
            },
            {
              group: ['../../registry', '../../simulate', '../../player', '../../types/history', '../../types/process', '../../types/simulation-result'],
              message: 'src/core/algorithms solo puede importar types/algorithm.ts.',
            },
          ],
        },
      ],
    },
  },
);
