import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['packages/*/test/**/*.test.ts', 'apps/*/test/**/*.test.ts', 'tools/**/*.test.ts'],
    environment: 'node',
    // theme.ts reads theme.css with `?raw`; Vitest empties CSS imports unless they are listed here.
    css: { include: [/packages\/design\/src\/theme\.css/] },
  },
});
