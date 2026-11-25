import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    projects: [
      { test: { name: 'node', include: ['tests/**/*.test.ts'], exclude: ['tests/react.test.ts'] } },
      { test: { name: 'react', include: ['tests/react.test.ts'], environment: 'happy-dom' } },
    ],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      thresholds: { lines: 90, functions: 90, branches: 90, statements: 90 },
    },
  },
});
