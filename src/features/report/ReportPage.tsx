import { CrosshairIcon, MinusIcon, PlusIcon } from '@phosphor-icons/react'
import { useMemo, useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router'
import { Card } from '@/components/ui/Card'
import { Chip } from '@/components/ui/Chip'
import { PressButton } from '@/components/ui/PressButton'
import { Skeleton } from '@/components/ui/Skeleton'
import { statusMeta } from '@/components/ui/status'
import { TextField } from '@/components/ui/TextField'
import { copy } from '@/copy/fr'
import { RequireAuth } from '@/features/auth/RequireAuth'
import { useConsentedLocation } from '@/features/location/useConsentedLocation'
import { useLaunchStores } from '@/features/map/api'
import { cn } from '@/lib/cn'
import type { AppError } from '@/lib/errors'
import { distanceMeters, formatDistance } from '@/lib/geo'
import { useCreateReport, useProducts, type CreatedReport, type ReportStatus } from './api'
import { ReportSuccess } from './ReportSuccess'
import { reportErrorMessage } from './reportErrors'

const t = copy.reportFlow
const STATUSES: ReportStatus[] = ['in_stock', 'low_stock', 'out_of_stock', 'restock_incoming']
const MAX_DISTANCE_M = 300

export function ReportPage() {
  return (
    <RequireAuth>
      <ReportFlow />
    </RequireAuth>
  )
}

// One progressive screen (front-end spec, Flow 1): position → store → products → status → send.
function ReportFlow() {
  const [params] = useSearchParams()
  const { state: geo, request, consentSheet } = useConsentedLocation()
  const { data: stores = [] } = useLaunchStores()
  const { data: products = [] } = useProducts()
  const createReport = useCreateReport()

  const [storeId, setStoreId] = useState<string | null>(params.get('magasin'))
  const [choosing, setChoosing] = useState(false)
  const [quantities, setQuantities] = useState<Record<string, number | null>>({})
  const [status, setStatus] = useState<ReportStatus | null>(null)
  const [price, setPrice] = useState('')
  const [comment, setComment] = useState('')
  const [error, setError] = useState<string>()
  const [created, setCreated] = useState<CreatedReport | null>(null)

  const position = geo.status === 'located' ? geo.position : null
  const nearby = useMemo(() => {
    if (!position) return []
    return stores
      .map((s) => ({ store: s, distance: distanceMeters(position, s) }))
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 8)
  }, [stores, position])

  // Store from the link ("Signaler ici") if it is among the nearest, else the nearest one.
  const selected = nearby.find((n) => n.store.id === storeId) ?? nearby[0]
  const selectedProducts = Object.keys(quantities)

  if (created) {
    return (
      <ReportSuccess
        storeId={created.store_id}
        onAnother={() => {
          setCreated(null)
          setQuantities({})
          setStatus(null)
          setPrice('')
          setComment('')
        }}
      />
    )
  }

  const toggleProduct = (id: string) =>
    setQuantities((current) => {
      const next = { ...current }
      if (id in next) delete next[id]
      else next[id] = null
      return next
    })

  const stepQuantity = (id: string, delta: number) =>
    setQuantities((current) => {
      const value = Math.min(999, Math.max(0, (current[id] ?? 0) + delta))
      return { ...current, [id]: value === 0 ? null : value }
    })

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (!position || !selected) return
    if (selectedProducts.length === 0 || !status) {
      setError(t.missing)
      return
    }
    setError(undefined)
    const euros = Number(price.replace(',', '.'))
    createReport.mutate(
      {
        clientId: crypto.randomUUID(),
        storeId: selected.store.id,
        lat: position.lat,
        lng: position.lng,
        status,
        products: selectedProducts.map((productId) => ({
          productId,
          qty: quantities[productId] ?? null,
        })),
        priceCents: price && Number.isFinite(euros) ? Math.round(euros * 100) : null,
        comment: comment.trim() || null,
        capturedAt: new Date().toISOString(),
      },
      {
        onSuccess: setCreated,
        onError: (e) => setError(reportErrorMessage(e as unknown as AppError)),
      },
    )
  }

  return (
    <form
      onSubmit={submit}
      noValidate
      className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 pb-10 lg:pt-6"
    >
      <h1 className="type-h1">{t.title}</h1>

      {!position && (
        <Card className="flex flex-col gap-3 p-4">
          <p className="text-body text-ink-2">{t.locateWhy}</p>
          {geo.status === 'denied' && (
            <p className="text-small font-semibold text-status-out">{t.locateDenied}</p>
          )}
          <PressButton
            type="button"
            loading={geo.status === 'locating'}
            icon={<CrosshairIcon weight="bold" />}
            onClick={() => void request()}
          >
            {geo.status === 'locating' ? t.locating : t.locateCta}
          </PressButton>
        </Card>
      )}

      {position && (
        <section className="flex flex-col gap-3" aria-labelledby="store-step">
          <h2 id="store-step" className="type-label text-ink-2">
            {t.storeLabel}
          </h2>
          {nearby.length === 0 ? (
            <Skeleton className="h-16 rounded-lg" />
          ) : selected ? (
            <Card className="flex items-center justify-between gap-3 p-3">
              <div className="min-w-0">
                <p className="truncate font-semibold">{selected.store.name}</p>
                <p className="text-caption text-ink-2">
                  {[selected.store.city, formatDistance(selected.distance)]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
              </div>
              <PressButton
                type="button"
                variant="ghost"
                className="min-h-11 shrink-0 px-2"
                aria-expanded={choosing}
                onClick={() => setChoosing((v) => !v)}
              >
                {t.change}
              </PressButton>
            </Card>
          ) : (
            <p className="text-body text-ink-2">{t.noStoreNearby}</p>
          )}
          {selected && selected.distance > MAX_DISTANCE_M && (
            <p className="text-small font-semibold text-status-out">
              {t.tooFarFromAll(formatDistance(selected.distance))}
            </p>
          )}
          {choosing && (
            <ul aria-label={t.nearbyTitle} className="flex flex-col gap-2">
              {nearby.map(({ store, distance }) => (
                <li key={store.id}>
                  <button
                    type="button"
                    aria-pressed={store.id === selected?.store.id}
                    onClick={() => {
                      setStoreId(store.id)
                      setChoosing(false)
                    }}
                    className={cn(
                      'flex min-h-12 w-full cursor-pointer items-center justify-between gap-3 rounded-md border-2 border-ink px-3 text-left',
                      store.id === selected?.store.id ? 'bg-yellow text-on-yellow' : 'bg-card',
                    )}
                  >
                    <span className="truncate font-semibold">{store.name}</span>
                    <span className="shrink-0 text-caption tabular-nums">
                      {formatDistance(distance)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {position && selected && (
        <>
          <section className="flex flex-col gap-3" aria-labelledby="products-step">
            <h2 id="products-step" className="type-label text-ink-2">
              {t.productsLabel}
            </h2>
            <p className="sr-only">{t.productsHint}</p>
            <div className="flex flex-wrap gap-2">
              {products.map((product) => (
                <Chip
                  key={product.id}
                  selected={product.id in quantities}
                  onClick={() => toggleProduct(product.id)}
                >
                  {product.name}
                </Chip>
              ))}
            </div>
            {selectedProducts.length > 0 && (
              <ul className="flex flex-col gap-2" aria-label={t.quantity}>
                {selectedProducts.map((id) => {
                  const name = products.find((p) => p.id === id)?.name ?? ''
                  const qty = quantities[id]
                  return (
                    <li key={id} className="flex items-center justify-between gap-3 text-small">
                      <span className="truncate">{name}</span>
                      <span className="flex items-center gap-2">
                        <PressButton
                          type="button"
                          variant="secondary"
                          aria-label={`${t.quantity} − ${name}`}
                          className="size-11 min-h-11 px-0"
                          onClick={() => stepQuantity(id, -1)}
                          icon={<MinusIcon weight="bold" />}
                        />
                        <span className="w-8 text-center font-semibold tabular-nums">
                          {qty ?? '–'}
                        </span>
                        <PressButton
                          type="button"
                          variant="secondary"
                          aria-label={`${t.quantity} + ${name}`}
                          className="size-11 min-h-11 px-0"
                          onClick={() => stepQuantity(id, 1)}
                          icon={<PlusIcon weight="bold" />}
                        />
                      </span>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>

          <section className="flex flex-col gap-3" aria-labelledby="status-step">
            <h2 id="status-step" className="type-label text-ink-2">
              {t.statusLabel}
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {STATUSES.map((value) => {
                const { icon: Icon, surface } = statusMeta[value]
                const active = status === value
                return (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setStatus(value)}
                    className={cn(
                      'flex min-h-18 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-3 border-ink font-semibold shadow-press transition-[translate,box-shadow] duration-(--dur-tap)',
                      active ? cn(surface, 'translate-y-1 shadow-pressed') : 'bg-card text-ink',
                    )}
                  >
                    <Icon weight="bold" aria-hidden="true" className="size-6" />
                    {t.status[value]}
                  </button>
                )
              })}
            </div>
          </section>

          <details className="rounded-lg border-2 border-ink bg-card p-3 [&_summary]:cursor-pointer">
            <summary className="min-h-11 content-center font-semibold">{t.optionsLabel}</summary>
            <div className="flex flex-col gap-4 pt-3">
              <TextField
                label={t.priceLabel}
                inputMode="decimal"
                value={price}
                onChange={(e) => setPrice(e.target.value.replace(/[^\d.,]/g, '').slice(0, 7))}
              />
              <TextField
                label={t.commentLabel}
                hint={t.commentHint(140 - comment.length)}
                value={comment}
                maxLength={140}
                onChange={(e) => setComment(e.target.value)}
              />
            </div>
          </details>

          {error && (
            <p role="alert" className="text-small font-semibold text-status-out">
              {error}
            </p>
          )}

          <PressButton type="submit" fullWidth loading={createReport.isPending}>
            {t.submit}
          </PressButton>
        </>
      )}
      {consentSheet}
    </form>
  )
}
