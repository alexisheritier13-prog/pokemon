import { BinocularsIcon } from '@phosphor-icons/react'
import { Link } from 'react-router'
import { EmptyState } from '@/components/ui/EmptyState'
import { copy } from '@/copy/fr'
import { RequireAuth } from '@/features/auth/RequireAuth'

// Reporting needs an account. The flow itself arrives in story 2.6.
export function ReportPage() {
  const t = copy.placeholders.report
  return (
    <RequireAuth>
      <EmptyState
        icon={<BinocularsIcon weight="bold" />}
        title={t.title}
        body={t.body}
        action={
          <Link
            to="/"
            className="min-h-11 content-center font-semibold underline underline-offset-4"
          >
            {t.action}
          </Link>
        }
      />
    </RequireAuth>
  )
}
