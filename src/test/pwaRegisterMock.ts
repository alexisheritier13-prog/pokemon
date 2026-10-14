// Test double for the vite-plugin-pwa virtual module (it only exists in Vite builds).
import { useState } from 'react'

export function useRegisterSW() {
  const needRefresh = useState(false)
  const offlineReady = useState(false)
  return { needRefresh, offlineReady, updateServiceWorker: async () => undefined }
}
