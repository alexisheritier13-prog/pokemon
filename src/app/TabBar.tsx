import {
  CardsIcon,
  MapTrifoldIcon,
  PlusIcon,
  UserCircleIcon,
  type Icon,
} from '@phosphor-icons/react'
import { NavLink, useLocation } from 'react-router'
import { copy } from '@/copy/fr'
import { cn } from '@/lib/cn'

type Tab = { to: string; label: string; icon: Icon; end?: boolean; desktopOnly?: boolean }

// Phone: Carte · Signaler (centered) · Fil. Account lives in the top-right avatar (AccountButton).
// Desktop rail: Signaler on top, then Carte, Fil, and Compte (there is room for it).
const tabs: Tab[] = [
  { to: '/', label: copy.nav.map, icon: MapTrifoldIcon, end: true },
  { to: '/signaler', label: copy.nav.report, icon: PlusIcon },
  { to: '/fil', label: copy.nav.feed, icon: CardsIcon },
  { to: '/compte', label: copy.nav.account, icon: UserCircleIcon, desktopOnly: true },
]

export function TabBar() {
  const { pathname } = useLocation()

  const scrollTopIfActive = (to: string) => {
    if (pathname === to) window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <nav
      aria-label={copy.nav.label}
      className={cn(
        'fixed inset-x-0 bottom-0 z-30 border-t-3 border-ink bg-card pb-[env(safe-area-inset-bottom)]',
        'lg:sticky lg:top-0 lg:h-dvh lg:w-28 lg:shrink-0 lg:border-t-0 lg:border-r-3 lg:pt-[env(safe-area-inset-top)] lg:pb-0',
      )}
    >
      <ul className="grid h-16 grid-cols-3 items-center lg:mt-6 lg:flex lg:h-auto lg:flex-col lg:gap-3">
        {tabs.map((tab) =>
          tab.to === '/signaler' ? (
            <li key={tab.to} className="flex justify-center lg:order-first lg:mb-4">
              <NavLink
                to={tab.to}
                onClick={() => scrollTopIfActive(tab.to)}
                className={({ isActive }) =>
                  cn(
                    '-mt-3 flex flex-col items-center gap-0.5 text-caption font-bold text-ink lg:mt-0',
                    isActive && 'underline decoration-2 underline-offset-4',
                  )
                }
              >
                <span
                  aria-hidden="true"
                  className="grid size-15 place-items-center rounded-pill border-3 border-ink bg-red text-on-red shadow-primary transition-[translate,box-shadow] duration-(--dur-tap) active:translate-y-1 active:shadow-pressed"
                >
                  <tab.icon weight="bold" className="size-7" />
                </span>
                {tab.label}
              </NavLink>
            </li>
          ) : (
            <li
              key={tab.to}
              className={cn('flex justify-center', tab.desktopOnly && 'hidden lg:mt-auto lg:flex')}
            >
              <NavLink
                to={tab.to}
                end={tab.end}
                onClick={() => scrollTopIfActive(tab.to)}
                className={({ isActive }) =>
                  cn(
                    'flex min-h-12 min-w-16 flex-col items-center justify-center gap-0.5 rounded-md px-2 text-caption text-ink-2',
                    'transition-colors duration-(--dur-fast)',
                    isActive && 'bg-paper-2 font-bold text-ink',
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <tab.icon
                      weight={isActive ? 'fill' : 'bold'}
                      aria-hidden="true"
                      className="size-6"
                    />
                    {tab.label}
                  </>
                )}
              </NavLink>
            </li>
          ),
        )}
      </ul>
    </nav>
  )
}
