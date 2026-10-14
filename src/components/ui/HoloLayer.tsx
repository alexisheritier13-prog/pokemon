import { useRef, type ReactNode, type PointerEvent } from 'react'
import { cn } from '@/lib/cn'

type HoloLayerProps = { children: ReactNode; className?: string; enabled?: boolean }

// Wraps content with the holo sheen (reserved to trust >= 80 reports and badges).
// The pointer drives the reflection; without pointer it drifts slowly (disabled under reduced motion).
export function HoloLayer({ children, className, enabled = true }: HoloLayerProps) {
  const ref = useRef<HTMLDivElement>(null)
  if (!enabled) return <div className={className}>{children}</div>

  const onMove = (event: PointerEvent<HTMLDivElement>) => {
    const el = ref.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const x = ((event.clientX - rect.left) / rect.width) * 100
    const y = ((event.clientY - rect.top) / rect.height) * 100
    el.dataset.idle = 'false'
    el.style.setProperty('--mx', `${x}%`)
    el.style.setProperty('--my', `${y}%`)
    el.style.setProperty('--ang', `${100 + x * 0.5}deg`)
  }

  const onLeave = () => {
    const el = ref.current
    if (!el) return
    el.dataset.idle = 'true'
    el.style.removeProperty('--mx')
    el.style.removeProperty('--my')
    el.style.removeProperty('--ang')
  }

  return (
    <div
      ref={ref}
      data-idle="true"
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      className={cn('holo', className)}
    >
      {children}
    </div>
  )
}
