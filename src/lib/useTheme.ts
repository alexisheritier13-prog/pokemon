import { useSyncExternalStore } from 'react'

export type Theme = 'light' | 'dark'

const query = '(prefers-color-scheme: dark)'

function read(): Theme {
  const forced = document.documentElement.getAttribute('data-theme')
  if (forced === 'light' || forced === 'dark') return forced
  return window.matchMedia(query).matches ? 'dark' : 'light'
}

function subscribe(onChange: () => void) {
  const media = window.matchMedia(query)
  media.addEventListener('change', onChange)
  const observer = new MutationObserver(onChange)
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
  return () => {
    media.removeEventListener('change', onChange)
    observer.disconnect()
  }
}

// Active theme: explicit data-theme (dev /design page) or the system preference.
export function useTheme(): Theme {
  return useSyncExternalStore(subscribe, read, () => 'light')
}
