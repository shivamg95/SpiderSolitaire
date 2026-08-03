import path from 'node:path'
import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

const rootDir = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(rootDir, 'src'),
    },
  },
  test: {
    globals: false,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov', 'json'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/main.tsx',
        'src/**/*.d.ts',
        'src/**/*.{test,spec}.{ts,tsx}',
        'src/test/**',
        'src/vite-env.d.ts',
        'src/engine/index.ts',
        'src/solver/index.ts',
        'src/solver/worker.ts',
        'src/solver/client.ts',
        'src/components/**',
        'src/animation/**',
        'src/interaction/usePointerDrag.ts',
        'src/interaction/useKeyboardShortcuts.ts',
        'src/theme/**',
        'src/App.tsx',
        'src/state/gameStore.ts',
        'src/state/settingsStore.ts',
        'src/state/uiStore.ts',
        'src/platform/**',
      ],
      thresholds: {
        lines: 80,
        branches: 75,
        functions: 80,
        statements: 80,
        'src/engine/**': {
          lines: 80,
          branches: 75,
          functions: 80,
          statements: 80,
        },
        'src/solver/**': {
          lines: 80,
          branches: 65,
          functions: 80,
          statements: 80,
        },
      },
    },
    projects: [
      {
        extends: true,
        test: {
          name: 'engine',
          environment: 'node',
          include: ['src/engine/**/*.{test,spec}.ts'],
        },
      },
      {
        extends: true,
        test: {
          name: 'solver',
          environment: 'node',
          include: ['src/solver/**/*.{test,spec}.ts'],
        },
      },
      {
        extends: true,
        test: {
          name: 'ui',
          environment: 'jsdom',
          setupFiles: ['./src/test/setup.ts'],
          include: ['src/**/*.{test,spec}.{ts,tsx}'],
          exclude: ['src/engine/**', 'src/solver/**'],
        },
      },
    ],
  },
})
