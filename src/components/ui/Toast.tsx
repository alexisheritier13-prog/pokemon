import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react'
import { copy } from '@/copy/fr'
import { ToastContext, type ToastOptions } from './toast-context'

type ToastItem = ToastOptions & { id: number }

const DEFAULT_DURATION_MS = 4000
const UNDO_DURATION_MS = 5000

// Toasts sit above the tab bar, announced politely to screen readers.
export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])
  const nextId = useRef(1)

  const dismiss = useCallback((id: number) => {
    setItems((current) => current.filter((item) => item.id !== id))
  }, [])

  const show = useCallback(
    (options: ToastOptions) => {
      const id = nextId.current++
      setItems((current) => [...current.slice(-2), { ...options, id }])
      const duration = options.onUndo ? UNDO_DURATION_MS : DEFAULT_DURATION_MS
      window.setTimeout(() => dismiss(id), duration)
    },
    [dismiss],
  )

  const value = useMemo(() => ({ show }), [show])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="pointer-events-none fixed inset-x-4 bottom-[calc(var(--space-tabbar)+env(safe-area-inset-bottom))] z-60 flex flex-col items-center gap-2"
      >
        {items.map((item) => (
          <div
            key={item.id}
            className="pointer-events-auto flex w-full max-w-md items-center justify-between gap-3 rounded-md border-3 border-ink bg-ink px-4 py-3 text-small font-semibold text-paper shadow-press"
          >
            <span>{item.message}</span>
            {item.onUndo && (
              <button
                type="button"
                className="min-h-11 cursor-pointer rounded-sm px-2 font-bold text-yellow underline underline-offset-4"
                onClick={() => {
                  item.onUndo?.()
                  dismiss(item.id)
                }}
              >
                {copy.common.undo}
              </button>
            )}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
