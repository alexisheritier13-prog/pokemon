import type { ReactNode } from 'react'
import { Drawer } from 'vaul'

type SheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  children: ReactNode
  /** Snap points as fractions of the viewport height, e.g. [0.4, 0.92]. */
  snapPoints?: number[]
}

// Bottom sheet (vaul: focus trap, swipe-to-close, Escape and back handled).
export function Sheet({
  open,
  onOpenChange,
  title,
  description,
  children,
  snapPoints,
}: SheetProps) {
  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange} snapPoints={snapPoints}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-40 bg-overlay" />
        <Drawer.Content className="fixed inset-x-0 bottom-0 z-50 flex max-h-[92dvh] flex-col rounded-t-xl border-3 border-b-0 border-ink bg-card pb-[env(safe-area-inset-bottom)] text-ink shadow-sheet outline-none">
          <div aria-hidden="true" className="mx-auto mt-2.5 h-1.5 w-12 rounded-pill bg-ink-2/40" />
          <div className="flex flex-col gap-1 px-5 pt-3 pb-2">
            <Drawer.Title className="type-h2">{title}</Drawer.Title>
            {description ? (
              <Drawer.Description className="text-small text-ink-2">
                {description}
              </Drawer.Description>
            ) : (
              <Drawer.Description className="sr-only">{title}</Drawer.Description>
            )}
          </div>
          <div className="overflow-y-auto px-5 pb-5">{children}</div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  )
}
