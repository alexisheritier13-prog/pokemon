import { UserCircleIcon } from '@phosphor-icons/react'
import { NavLink } from 'react-router'
import { copy } from '@/copy/fr'
import { cn } from '@/lib/cn'

// Phone-only entry to the account (top-right avatar). Shows the user's avatar once accounts exist (story 1.6).
export function AccountButton() {
  return (
    <NavLink
      to="/compte"
      aria-label={copy.nav.account}
      className={({ isActive }) =>
        cn(
          'fixed top-[calc(env(safe-area-inset-top)+12px)] right-4 z-30 grid size-11 place-items-center rounded-pill border-3 border-ink bg-card text-ink shadow-chip lg:hidden',
          'transition-[translate,box-shadow] duration-(--dur-tap) active:translate-y-0.5 active:shadow-pressed',
          isActive && 'bg-yellow text-on-yellow',
        )
      }
    >
      <UserCircleIcon weight="bold" aria-hidden="true" className="size-6" />
    </NavLink>
  )
}
