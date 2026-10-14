import { Outlet } from 'react-router'
import { Footer } from './Footer'
import { TabBar } from './TabBar'

// App frame: content above the bottom tab bar on phones, rail + content side by side on desktop.
export function AppShell() {
  return (
    <div className="min-h-dvh lg:flex">
      <TabBar />
      <div className="flex min-h-dvh min-w-0 flex-1 flex-col pt-[env(safe-area-inset-top)] pb-[calc(var(--space-tabbar)+env(safe-area-inset-bottom))] lg:pb-0">
        <main className="flex flex-1 flex-col">
          <Outlet />
        </main>
        <Footer />
      </div>
    </div>
  )
}
