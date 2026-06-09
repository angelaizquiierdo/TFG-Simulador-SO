// @ts-check
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import jsxA11y from 'eslint-plugin-jsx-a11y';

export default tseslint.config(
  // Ignorar carpetas generadas
  {
    ignores: ['dist/**', 'node_modules/**', 'docs/**', 'coverage/**'],
  },

  // Configuración base para todo src/ y tests/
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

  // Reglas específicas para src/core/ — prohibir React/DOM y src/react/
  {
    files: ['src/core/**/*.ts'],
    plugins: {
      'react-hooks': reactHooks,
    },
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['react', 'react-dom', 'react/*'],
              message:
                'src/core no puede importar React ni DOM. Mueve el código a src/react/.',
            },
            {
              group: ['*/react/*', '../react/*', '../../react/*'],
              message:
                'src/core no puede importar desde src/react/. La dependencia es unidireccional.',
            },
          ],
        },
      ],
    },
  },

  // Reglas específicas para src/core/algorithms/ — solo puede importar types/algorithm.ts
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
              group: ['*/react/*', '../react/*', '../../react/*', '../../../react/*'],
              message: 'Los algoritmos no pueden importar desde src/react/.',
            },
          ],
        },
      ],
    },
  },

  // React hooks y accesibilidad para src/react/
  {
    files: ['src/react/**/*.tsx', 'src/react/**/*.ts'],
    plugins: {
      'react-hooks': reactHooks,
      'jsx-a11y': jsxA11y,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      ...jsxA11y.flatConfigs.recommended.rules,
    },
  },

  // Tests — relajar algunas reglas estrictas
  {
    files: ['tests/**/*.ts', 'tests/**/*.tsx'],
    rules: {
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
);
