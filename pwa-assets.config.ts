import {
  createAppleSplashScreens,
  defineConfig,
  minimal2023Preset as preset,
} from '@vite-pwa/assets-generator/config'
import { APP_THEME } from './src/config/app.ts'

// Icons (favicon, 64/192/512, maskable, Apple touch) and iOS splash screens, generated from public/logo.svg.
export default defineConfig({
  headLinkOptions: { preset: '2023' },
  preset: {
    ...preset,
    maskable: { ...preset.maskable, padding: 0.32, resizeOptions: { background: APP_THEME.light } },
    apple: { ...preset.apple, padding: 0.3, resizeOptions: { background: APP_THEME.light } },
    appleSplashScreens: createAppleSplashScreens({
      padding: 0.42,
      resizeOptions: { background: APP_THEME.light, fit: 'contain' },
      darkResizeOptions: { background: APP_THEME.dark, fit: 'contain' },
      linkMediaOptions: { log: false, addMediaScreen: true, xhtml: false },
    }),
  },
  images: ['public/logo.svg'],
})
