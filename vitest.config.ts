import { fileURLToPath, URL } from 'node:url'
import { defineConfig, mergeConfig } from 'vitest/config'
import viteConfig from './vite.config.ts'

export default mergeConfig(
  viteConfig,
  defineConfig({
    resolve: {
      alias: {
        // The PWA register module is virtual (Vite builds only): use a test double.
        'virtual:pwa-register/react': fileURLToPath(
          new URL('./src/test/pwaRegisterMock.ts', import.meta.url),
        ),
      },
    },
    test: {
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.ts'],
      include: ['src/**/*.test.{ts,tsx}', 'tests/**/*.test.ts', 'scripts/**/*.test.ts'],
      exclude: ['tests/integration/**', 'node_modules/**'],
    },
  }),
)
