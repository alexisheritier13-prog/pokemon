/// <reference lib="webworker" />
import {
  cleanupOutdatedCaches,
  createHandlerBoundToURL,
  precacheAndRoute,
} from 'workbox-precaching'
import { NavigationRoute, registerRoute } from 'workbox-routing'

// Single service worker (architecture: Workbox injectManifest). Later stories add runtime caching
// (map tiles, photos: 2.1 / 2.7), push and notificationclick (4.x) and background sync (5.4).

declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<{ url: string; revision: string | null } | string>
}

precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()

// SPA: every navigation is served the precached shell, so the app opens offline.
registerRoute(new NavigationRoute(createHandlerBoundToURL('index.html')))

// The page asks the waiting worker to take over when the user accepts the update prompt.
self.addEventListener('message', (event) => {
  if ((event.data as { type?: string } | null)?.type === 'SKIP_WAITING') void self.skipWaiting()
})
