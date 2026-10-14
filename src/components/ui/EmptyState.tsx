import type { ReactNode } from 'react'

type EmptyStateProps = { icon: ReactNode; title: string; body: string; action?: ReactNode }

// Empty, offline and error screens: a little object, a line with personality, and always one action.
export function EmptyState({ icon, title, body, action }: EmptyStateProps) {
  return (
    <section className="flex flex-1 flex-col items-center justify-center gap-4 px-4 py-16 text-center">
      <div
        aria-hidden="true"
        className="grid size-20 place-items-center rounded-xl border-3 border-ink bg-card text-ink shadow-card [&>svg]:size-10"
      >
        {icon}
      </div>
      <h1 className="type-h1 max-w-[18ch]">{title}</h1>
      <p className="max-w-prose text-body text-ink-2">{body}</p>
      {action}
    </section>
  )
}
