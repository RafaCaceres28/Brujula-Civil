import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const resolveThreshold = (envName: string, fallback: number): number => {
  const rawValue = process.env[envName];
  const parsedValue = Number(rawValue);
  return Number.isFinite(parsedValue) ? parsedValue : fallback;
};

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    globals: true,
    projects: [
      {
        test: {
          name: 'node',
          setupFiles: ['./test/setup.ts'],
          include: ['src/**/*.test.ts'],
          exclude: ['src/**/*.dom.test.ts'],
          environment: 'node',
        },
      },
      {
        test: {
          name: 'jsdom',
          setupFiles: ['./test/setup.ts'],
          include: ['src/**/*.dom.test.ts', 'src/**/*.test.tsx'],
          environment: 'jsdom',
        },
      },
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      reportsDirectory: './coverage',
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.test.{ts,tsx}', 'src/**/*.dom.test.{ts,tsx}', '**/*.d.ts'],
      thresholds: {
        statements: resolveThreshold('COVERAGE_THRESHOLD_STATEMENTS', 29),
        branches: resolveThreshold('COVERAGE_THRESHOLD_BRANCHES', 23),
        functions: resolveThreshold('COVERAGE_THRESHOLD_FUNCTIONS', 18),
        lines: resolveThreshold('COVERAGE_THRESHOLD_LINES', 29),
      },
    },
  },
});
