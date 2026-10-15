import {
  BinocularsIcon,
  HeartIcon,
  MapPinSimpleIcon,
  NavigationArrowIcon,
  StorefrontIcon,
} from '@phosphor-icons/react'
import { Link, useNavigate, useParams } from 'react-router'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { PressButton } from '@/components/ui/PressButton'
import { Skeleton } from '@/components/ui/Skeleton'
import { StatusBand } from '@/components/ui/StatusBand'
import { rarityFromTrust } from '@/components/ui/status'
import { useToast } from '@/components/ui/toast-context'
import { copy } from '@/copy/fr'
import { useAuth } from '@/features/auth/auth-context'
import { rememberReturnTo } from '@/features/auth/returnTo'
import { cn } from '@/lib/cn'
import { directionsUrl } from '@/lib/directions'
import { timeAgo } from '@/lib/time'
import { useFavorite, useStore, type StoreDetail } from './api'
import {
  dayName,
  describeStatus,
  formatTime,
  openStatus,
  parisClock,
  parseOpeningHours,
} from './openingHours'

// Store page (/m/:id). History and the "calendrier de chasse" heatmap arrive with story 2.9.
export function StorePage() {
  const { storeId } = useParams()
  const { data: store, isLoading } = useStore(storeId)

  if (isLoading) return <StoreSkeleton />
  if (!store) {
    return (
      <EmptyState
        icon={<StorefrontIcon weight="bold" />}
        title={copy.store.notFoundTitle}
        body={copy.store.notFoundBody}
        action={
          <Link
            to="/"
            className="min-h-11 content-center font-semibold underline underline-offset-4"
          >
            {copy.store.backToMap}
          </Link>
        }
      />
    )
  }
  return <StoreContent store={store} />
}

function StoreContent({ store }: { store: StoreDetail }) {
  const auth = useAuth()
  const navigate = useNavigate()
  const toast = useToast()
  const { isFavorite, toggle } = useFavorite(store.id)
  const week = parseOpeningHours(store.opening_hours)
  const now = new Date()
  const today = parisClock(now).day
  const status = week ? describeStatus(openStatus(week, now), today) : null

  const requireAccount = (path: string) => {
    rememberReturnTo(path)
    navigate('/connexion')
  }

  const onFavorite = () => {
    if (auth.status !== 'authenticated') return requireAccount(`/m/${store.id}`)
    const next = !isFavorite
    toggle.mutate(next, {
      onSuccess: () =>
        toast.show({ message: next ? copy.store.favoriteAdded : copy.store.favoriteRemoved }),
    })
  }

  return (
    <article className="flex flex-col gap-6 px-4 pb-8 lg:px-8 lg:pt-6">
      <header className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {store.brand_name && (
            <span className="rounded-pill border-2 border-ink bg-card px-3 py-1 text-caption font-semibold">
              {store.brand_name}
            </span>
          )}
          {store.status === 'pending' && (
            <span className="rounded-pill bg-yellow px-3 py-1 text-caption font-semibold text-on-yellow">
              {copy.store.pending}
            </span>
          )}
        </div>
        <h1 className="type-h1">{store.name}</h1>
        {status && (
          <p
            className={cn(
              'text-small font-semibold',
              status.startsWith('Ouvert') ? 'text-status-ok' : 'text-ink-2',
            )}
          >
            {status}
          </p>
        )}
        {(store.address || store.city) && (
          <p className="flex items-start gap-1.5 text-body text-ink-2">
            <MapPinSimpleIcon weight="bold" aria-hidden="true" className="mt-1 size-4 shrink-0" />
            <span>
              {[store.address, [store.postcode, store.city].filter(Boolean).join(' ')]
                .filter(Boolean)
                .join(', ')}
            </span>
          </p>
        )}
      </header>

      {/* Two columns on large screens: practical info on the left, reports on the right. */}
      <div className="grid gap-8 lg:grid-cols-2 lg:items-start xl:gap-12">
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-3 gap-3">
            <a
              href={directionsUrl(store)}
              target="_blank"
              rel="noreferrer"
              className="type-button flex min-h-16 flex-col items-center justify-center gap-1 rounded-button border-3 border-ink bg-card px-2 text-ink shadow-press active:translate-y-1 active:shadow-pressed"
            >
              <NavigationArrowIcon weight="bold" aria-hidden="true" className="size-6" />
              <span className="text-caption">{copy.store.directions}</span>
            </a>
            <PressButton
              variant="secondary"
              aria-pressed={isFavorite}
              aria-label={isFavorite ? copy.store.favoriteRemove : copy.store.favoriteAdd}
              onClick={onFavorite}
              className={cn(
                'min-h-16 flex-col gap-1 px-2',
                isFavorite && 'bg-yellow text-on-yellow',
              )}
            >
              <HeartIcon
                weight={isFavorite ? 'fill' : 'bold'}
                aria-hidden="true"
                className="size-6"
              />
              <span className="text-caption">
                {isFavorite ? copy.store.favoriteRemove : copy.store.favoriteAdd}
              </span>
            </PressButton>
            <PressButton
              className="min-h-16 flex-col gap-1 px-2"
              onClick={() =>
                auth.status === 'authenticated'
                  ? navigate(`/signaler?magasin=${store.id}`)
                  : requireAccount(`/signaler?magasin=${store.id}`)
              }
            >
              <BinocularsIcon weight="bold" aria-hidden="true" className="size-6" />
              <span className="text-caption">{copy.store.reportHere}</span>
            </PressButton>
          </div>

          <section className="flex flex-col gap-3" aria-labelledby="hours">
            <h2 id="hours" className="type-h2">
              {copy.store.hoursTitle}
            </h2>
            {week ? (
              <dl className="grid max-w-md grid-cols-[auto_1fr] gap-x-6 gap-y-1.5 text-body">
                {week.map((ranges, day) => (
                  <div key={day} className={cn('contents', day === today && 'font-bold')}>
                    <dt className="capitalize">
                      {dayName(day)}
                      {day === today && <span className="sr-only"> ({copy.store.today})</span>}
                    </dt>
                    <dd className="tabular-nums">
                      {ranges.length === 0
                        ? copy.store.closedDay
                        : ranges.map(([s, e]) => `${formatTime(s)} – ${formatTime(e)}`).join(', ')}
                    </dd>
                  </div>
                ))}
              </dl>
            ) : store.opening_hours ? (
              <p className="text-body text-ink-2">
                {copy.store.hoursRaw} <code>{store.opening_hours}</code>
              </p>
            ) : (
              <p className="text-body text-ink-2">{copy.store.hoursUnknown}</p>
            )}
          </section>
        </div>

        <section className="flex flex-col gap-3" aria-labelledby="last-report">
          <h2 id="last-report" className="type-h2">
            {copy.store.lastReportTitle}
          </h2>
          <Card className="flex flex-col gap-3">
            {store.current_status && store.current_reported_at ? (
              <>
                <StatusBand
                  status={store.current_status}
                  rarity={rarityFromTrust(store.current_trust ?? 0)}
                />
                <p className="px-1 text-small text-ink-2">
                  {copy.store.reportedAgo(timeAgo(store.current_reported_at))}
                  {store.current_confirm_count
                    ? ` · ${copy.store.confirmations(store.current_confirm_count)}`
                    : ''}
                </p>
              </>
            ) : (
              <>
                <StatusBand status="none" />
                <p className="px-1 text-small text-ink-2">{copy.store.noReportYet}</p>
              </>
            )}
          </Card>
        </section>
      </div>

      <p className="text-caption text-ink-2">{copy.store.osmCredit}</p>
    </article>
  )
}

function StoreSkeleton() {
  return (
    <div className="flex flex-col gap-4 px-4 py-6 lg:px-8">
      <Skeleton className="h-6 w-32" />
      <Skeleton className="h-9 w-2/3" />
      <Skeleton className="h-16 max-w-xl" />
      <Skeleton className="h-32 max-w-xl rounded-lg" />
    </div>
  )
}
