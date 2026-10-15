import { Outlet } from 'react-router'
import { AccountButton } from './AccountButton'
import { Footer } from './Footer'
import { OfflineBanner } from './OfflineBanner'
import { TabBar } from './TabBar'
import { UpdatePrompt } from './UpdatePrompt'

// App frame: content above the bottom tab bar on phones, rail + content side by side on desktop.
export function AppShell() {
  return (
    <div className="min-h-dvh lg:flex">
      <TabBar />
      <AccountButton />
      <div className="flex min-h-dvh min-w-0 flex-1 flex-col pt-[env(safe-area-inset-top)] pb-[calc(var(--space-tabbar)+env(safe-area-inset-bottom))] lg:pb-0">
        <OfflineBanner />
        {/* Keeps page titles clear of the floating account avatar (phones only). */}
        <div aria-hidden="true" className="h-14 shrink-0 lg:hidden" />
        <main className="flex flex-1 flex-col">
          <Outlet />
        </main>
        <Footer />
      </div>
      <UpdatePrompt />
    </div>
  )
}
