import { IdentificationCardIcon } from '@phosphor-icons/react'
import { Link } from 'react-router'
import { EmptyState } from '@/components/ui/EmptyState'
import { copy } from '@/copy/fr'

// Placeholder until stories 1.6 (auth) and 3.7 (account).
export function AccountPage() {
  const t = copy.placeholders.account
  return (
    <EmptyState
      icon={<IdentificationCardIcon weight="bold" />}
      title={t.title}
      body={t.body}
      action={
        <Link to="/" className="min-h-11 content-center font-semibold underline underline-offset-4">
          {t.action}
        </Link>
      }
    />
  )
}
