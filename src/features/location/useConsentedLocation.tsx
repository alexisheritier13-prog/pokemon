import { useState } from 'react'
import { PressButton } from '@/components/ui/PressButton'
import { Sheet } from '@/components/ui/Sheet'
import { copy } from '@/copy/fr'
import { useGeolocation, type GeoState } from '@/features/map/useGeolocation'

const CONSENT_KEY = 'rr-geo-explained'

function consentGiven(): boolean {
  try {
    return localStorage.getItem(CONSENT_KEY) === '1'
  } catch {
    return false
  }
}

// Location request preceded, the first time, by an explanation sheet (front-end spec: no surprise prompts).
export function useConsentedLocation() {
  const { state, locate } = useGeolocation()
  const [open, setOpen] = useState(false)
  const [pending, setPending] = useState<((result: GeoState) => void) | null>(null)

  const request = (): Promise<GeoState> => {
    if (consentGiven()) return locate()
    return new Promise((resolve) => {
      setPending(() => resolve)
      setOpen(true)
    })
  }

  const accept = () => {
    try {
      localStorage.setItem(CONSENT_KEY, '1')
    } catch {
      // ignore: the explanation will simply show again next time
    }
    setOpen(false)
    void locate().then((result) => pending?.(result))
    setPending(null)
  }

  const decline = () => {
    setOpen(false)
    pending?.({ status: 'idle' })
    setPending(null)
  }

  const consentSheet = (
    <Sheet open={open} onOpenChange={(next) => !next && decline()} title={copy.map.consentTitle}>
      <div className="flex flex-col gap-4">
        <p className="text-body text-ink-2">{copy.map.consentBody}</p>
        <PressButton fullWidth onClick={accept}>
          {copy.map.consentAccept}
        </PressButton>
        <PressButton variant="ghost" fullWidth onClick={decline}>
          {copy.map.consentDecline}
        </PressButton>
      </div>
    </Sheet>
  )

  return { state, request, consentSheet }
}
