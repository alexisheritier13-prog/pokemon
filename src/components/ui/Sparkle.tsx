import { cn } from '@/lib/cn'

// Custom rarity glyph (4-point sparkle), drawn on the 24px icon grid. Not an official rarity symbol.
export function Sparkle({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={cn('size-[1em] fill-current', className)}
    >
      <path d="M12 3c.6 4.6 2.4 6.4 7 7-4.6.6-6.4 2.4-7 7-.6-4.6-2.4-6.4-7-7 4.6-.6 6.4-2.4 7-7z" />
    </svg>
  )
}
