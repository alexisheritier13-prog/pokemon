import { LightningSlashIcon } from '@phosphor-icons/react'
import { useEffect } from 'react'
import { isRouteErrorResponse, useRouteError } from 'react-router'
import { EmptyState } from '@/components/ui/EmptyState'
import { PressButton } from '@/components/ui/PressButton'
import { copy } from '@/copy/fr'
import { logClientError } from '@/lib/logger'
import { NotFoundPage } from './NotFoundPage'

// Route error boundary: keeps the tab bar, logs the error to our own journal, offers a reload.
export function ErrorPage() {
  const error = useRouteError()
  const notFound = isRouteErrorResponse(error) && error.status === 404

  useEffect(() => {
    if (!notFound) logClientError(error)
  }, [error, notFound])

  if (notFound) return <NotFoundPage />

  return (
    <EmptyState
      icon={<LightningSlashIcon weight="bold" />}
      title={copy.error.title}
      body={copy.error.body}
      action={
        <PressButton variant="secondary" onClick={() => window.location.reload()}>
          {copy.error.reload}
        </PressButton>
      }
    />
  )
}
