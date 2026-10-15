import { defineConfig } from 'vitest/config'

// Integration tests against the local Supabase stack (`npx supabase start`).
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/integration/**/*.test.ts'],
    globalSetup: ['tests/integration/globalSetup.ts'],
    testTimeout: 20_000,
    hookTimeout: 60_000,
    fileParallelism: false,
  },
})
