import { fileURLToPath, URL } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'
import pkg from './package.json' with { type: 'json' }
import { APP_DESCRIPTION, APP_NAME, APP_SHORT_NAME, APP_THEME } from './src/config/app.ts'

// Injects app identity into index.html so the name lives only in src/config/app.ts.
function appMeta(): Plugin {
  return {
    name: 'app-meta',
    transformIndexHtml: (html) =>
      html
        .replaceAll('%APP_NAME%', APP_NAME)
        .replaceAll('%APP_SHORT_NAME%', APP_SHORT_NAME)
        .replaceAll('%APP_DESCRIPTION%', APP_DESCRIPTION)
        .replaceAll('%THEME_LIGHT%', APP_THEME.light)
        .replaceAll('%THEME_DARK%', APP_THEME.dark),
  }
}

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    appMeta(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src/sw',
      filename: 'service-worker.ts',
      registerType: 'prompt',
      injectRegister: false,
      // Icons and iOS splash screens from pwa-assets.config.ts (head links injected at build).
      pwaAssets: { config: true, overrideManifestIcons: true, includeHtmlHeadLinks: true },
      manifest: {
        id: '/',
        name: APP_NAME,
        short_name: APP_SHORT_NAME,
        description: APP_DESCRIPTION,
        lang: 'fr',
        dir: 'ltr',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        theme_color: APP_THEME.light,
        background_color: APP_THEME.light,
        categories: ['shopping', 'lifestyle'],
        shortcuts: [
          {
            name: 'Signaler un restock',
            short_name: 'Signaler',
            url: '/signaler',
            icons: [{ src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png' }],
          },
          { name: 'Voir le fil', short_name: 'Fil', url: '/fil' },
        ],
      },
      injectManifest: {
        // App shell only: splash screens and unused font subsets stay out of the precache.
        globPatterns: ['**/*.{js,css,html,woff2}', 'pwa-*.png', 'maskable-*.png', 'favicon.*'],
        globIgnores: ['**/*hebrew*'],
      },
      devOptions: { enabled: false },
    }),
  ],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
})
