import {
  BatteryLowIcon,
  CheckIcon,
  ClockIcon,
  MinusIcon,
  XIcon,
  type Icon,
} from '@phosphor-icons/react'

export type StatusKey = 'in_stock' | 'low_stock' | 'out_of_stock' | 'restock_incoming' | 'none'

// Status is always conveyed by color AND icon AND text (never color alone).
export const statusMeta: Record<StatusKey, { icon: Icon; surface: string }> = {
  in_stock: { icon: CheckIcon, surface: 'bg-status-ok text-on-status' },
  low_stock: { icon: BatteryLowIcon, surface: 'bg-status-low text-on-status-low' },
  out_of_stock: { icon: XIcon, surface: 'bg-status-out text-on-status' },
  restock_incoming: { icon: ClockIcon, surface: 'bg-status-soon text-on-status' },
  none: { icon: MinusIcon, surface: 'bg-status-none text-on-status' },
}

export type Rarity = 1 | 2 | 3

// Rarity shown on report cards, from the 0..100 trust score (architecture, "Trust score").
export function rarityFromTrust(trust: number): Rarity {
  if (trust >= 80) return 3
  if (trust >= 40) return 2
  return 1
}
