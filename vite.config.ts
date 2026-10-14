import { fileURLToPath, URL } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'
import pkg from './package.json' with { type: 'json' }
import { APP_DESCRIPTION, APP_NAME } from './src/config/app.ts'

// Injects app identity into index.html so the name lives only in src/config/app.ts.
function appMeta(): Plugin {
  return {
    name: 'app-meta',
    transformIndexHtml: (html) =>
      html.replaceAll('%APP_NAME%', APP_NAME).replaceAll('%APP_DESCRIPTION%', APP_DESCRIPTION),
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), appMeta()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
})
