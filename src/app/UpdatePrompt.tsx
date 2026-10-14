import { ArrowsClockwiseIcon } from '@phosphor-icons/react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { PressButton } from '@/components/ui/PressButton'
import { copy } from '@/copy/fr'

const UPDATE_CHECK_MS = 60 * 60 * 1000

// Registers the service worker and offers the new version when one is waiting.
export function UpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, registration) {
      if (registration) setInterval(() => void registration.update(), UPDATE_CHECK_MS)
    },
  })

  if (!needRefresh) return null

  return (
    <div
      role="status"
      className="fixed inset-x-4 bottom-[calc(var(--space-tabbar)+env(safe-area-inset-bottom))] z-50 mx-auto flex max-w-md items-center gap-3 rounded-lg border-3 border-ink bg-card p-3 text-ink shadow-card lg:bottom-6"
    >
      <ArrowsClockwiseIcon weight="bold" aria-hidden="true" className="size-6 shrink-0" />
      <p className="flex-1 text-small font-semibold">{copy.pwa.updateAvailable}</p>
      <PressButton variant="ghost" className="min-h-11 px-2" onClick={() => setNeedRefresh(false)}>
        {copy.pwa.later}
      </PressButton>
      <PressButton className="min-h-11 px-4" onClick={() => void updateServiceWorker(true)}>
        {copy.pwa.reload}
      </PressButton>
    </div>
  )
}
