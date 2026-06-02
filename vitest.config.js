import { defineConfig } from 'vitest/config';

// Pure-logic unit tests run in Node — the tested modules (rhythm aggregation,
// cloud-row builders) deliberately avoid browser globals. UI and Supabase glue
// are verified by running the app, not here.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.{js,jsx}'],
  },
});
