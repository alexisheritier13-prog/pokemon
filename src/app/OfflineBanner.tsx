import { WifiSlashIcon } from '@phosphor-icons/react'
import { copy } from '@/copy/fr'
import { useOnlineStatus } from '@/lib/useOnlineStatus'

// Shown while offline. The app shell itself is precached, so navigation keeps working.
export function OfflineBanner() {
  const online = useOnlineStatus()
  if (online) return null
  return (
    <div
      role="status"
      className="sticky top-0 z-20 flex items-center justify-center gap-2 border-b-3 border-ink bg-yellow px-4 py-2 pr-16 text-small font-semibold text-on-yellow lg:pr-4"
    >
      <WifiSlashIcon weight="bold" aria-hidden="true" className="size-5 shrink-0" />
      <span>{copy.pwa.offline}</span>
    </div>
  )
}
