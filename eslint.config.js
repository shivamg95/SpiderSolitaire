import js from '@eslint/js'
import { defineConfig } from 'eslint/config'
import importPlugin from 'eslint-plugin-import'
import reactHooks from 'eslint-plugin-react-hooks'
import tseslint from 'typescript-eslint'

export default defineConfig(
  {
    ignores: [
      'dist/**',
      'coverage/**',
      'dev-dist/**',
      'node_modules/**',
      'playwright-report/**',
      'test-results/**',
      'public/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parserOptions: {
        projectService: {
          allowDefaultProject: ['*.js', '*.mjs', '*.cjs'],
          defaultProject: 'tsconfig.app.json',
        },
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      import: importPlugin,
      'react-hooks': reactHooks,
    },
    settings: {
      'import/resolver': {
        typescript: {
          project: ['./tsconfig.app.json', './tsconfig.node.json'],
        },
      },
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'import/no-restricted-paths': [
        'error',
        {
          zones: [
            {
              target: './src/engine',
              from: './src',
              except: ['./engine'],
              message:
                'engine must stay pure: no imports from react/components/state/solver/ui.',
            },
            {
              target: './src/solver',
              from: './src',
              except: ['./solver', './engine'],
              message: 'solver may only import from engine (and itself).',
            },
            {
              target: './src/components',
              from: './src/solver/worker.ts',
              message: 'components must not import the solver worker directly.',
            },
          ],
        },
      ],
      '@typescript-eslint/consistent-type-definitions': ['error', 'interface'],
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
  {
    files: ['**/*.{js,mjs,cjs}'],
    ...tseslint.configs.disableTypeChecked,
  },
)
