// Single source of truth for the app identity (NFR13): rename the app here only.
// Also imported by vite.config.ts and pwa-assets.config.ts, so it must stay free of browser- or Vite-only APIs.

declare const __APP_VERSION__: string | undefined

export const APP_NAME = 'RestockRadar'
export const APP_SHORT_NAME = 'RestockRadar'
export const APP_DESCRIPTION =
  'Les restocks de cartes Pokémon en magasin, repérés et vérifiés par la communauté.'
export const APP_VERSION = typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : '0.0.0'

// Browser chrome / splash colors. Must equal --paper in src/design/tokens.css (checked by a test).
export const APP_THEME = { light: '#f6efdf', dark: '#0f1830' } as const
