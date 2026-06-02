/// <reference types="vitest" />
import { getViteConfig } from 'astro/config';

/**
 * Configuración de Vitest derivada de la configuración de Vite de Astro
 * mediante `getViteConfig`, para que el entorno de test use exactamente la
 * misma resolución de módulos que Astro.
 */
export default getViteConfig({
  test: {
    // Archivos de test reconocidos por la suite.
    include: ['src/**/*.test.ts'],
    // Entorno de ejecución (TypeScript puro, sin DOM por defecto).
    environment: 'node',
    // Reporters de salida en terminal.
    reporters: ['default'],
    coverage: {
      // Proveedor de cobertura exigido por la especificación.
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts', 'src/**/__tests__/**'],
    },
  },
});