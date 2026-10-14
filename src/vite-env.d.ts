/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string
  readonly VITE_SUPABASE_ANON_KEY?: string
  readonly VITE_VAPID_PUBLIC_KEY?: string
  readonly VITE_GEOCODER_URL?: string
  readonly VITE_APP_ENV?: 'local' | 'preview' | 'production'
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
