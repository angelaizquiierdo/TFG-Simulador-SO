import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import dts from 'vite-plugin-dts';

export default defineConfig({
  plugins: [react(), dts({ include: ['src'] })],
  build: {
    lib: {
      entry: 'src/index.ts',
      formats: ['es'],
      fileName: 'index',
    },
    rollupOptions: {
      external: ['react', 'react-dom'],
    },
  },
  test: {
    environmentMatchGlobs: [
      ['tests/react/**', 'jsdom'],
      ['tests/core/**', 'node'],
    ],
    coverage: {
      provider: 'v8',
      include: ['src/core/**', 'src/react/**'],
      exclude: ['src/core/types/**', 'src/react/style/**'],
      thresholds: {
        lines: 90,
        functions: 90,
        statements: 90,
        branches: 80,
      },
    },
  },
});
