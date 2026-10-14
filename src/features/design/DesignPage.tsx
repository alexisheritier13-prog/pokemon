import {
  CameraIcon,
  MapPinIcon,
  NavigationArrowIcon,
  PlusIcon,
  UsersIcon,
} from '@phosphor-icons/react'
import { useEffect, useState, type ReactNode } from 'react'
import { Card } from '@/components/ui/Card'
import { Chip } from '@/components/ui/Chip'
import { HoloLayer } from '@/components/ui/HoloLayer'
import { PressButton } from '@/components/ui/PressButton'
import { ReputationBadge, type BadgeKey } from '@/components/ui/ReputationBadge'
import { Sheet } from '@/components/ui/Sheet'
import { ReportCardSkeleton, Skeleton } from '@/components/ui/Skeleton'
import { StatusBand } from '@/components/ui/StatusBand'
import type { StatusKey } from '@/components/ui/status'
import { TextField } from '@/components/ui/TextField'
import { useToast } from '@/components/ui/toast-context'
import { designCopy as t } from './designCopy'

type Theme = 'system' | 'light' | 'dark'

const colorTokens = [
  'paper',
  'paper-2',
  'card',
  'ink',
  'ink-2',
  'red',
  'yellow',
  'focus',
  'status-ok',
  'status-low',
  'status-out',
  'status-soon',
  'status-none',
  'type-feu',
  'type-eau',
  'type-plante',
  'type-electrik',
  'type-psy',
  'type-roche',
] as const

const statuses: StatusKey[] = ['in_stock', 'low_stock', 'out_of_stock', 'restock_incoming', 'none']
const badges: BadgeKey[] = ['nouveau', 'fiable', 'eclaireur', 'veteran']

// Dev-only showcase of every component and state (story 1.2). Never shipped in production.
export function DesignPage() {
  const [theme, setTheme] = useState<Theme>('system')
  const [sheetOpen, setSheetOpen] = useState(false)
  const [chips, setChips] = useState<Record<string, boolean>>({
    display: true,
    coffret: false,
    tin: true,
  })
  const toast = useToast()

  useEffect(() => {
    const root = document.documentElement
    if (theme === 'system') root.removeAttribute('data-theme')
    else root.setAttribute('data-theme', theme)
    return () => root.removeAttribute('data-theme')
  }, [theme])

  return (
    <div className="flex flex-col gap-12 px-4 py-8 lg:px-10">
      <header className="flex flex-col gap-4">
        <p className="type-label text-ink-2">{t.eyebrow}</p>
        <h1 className="type-display">{t.title}</h1>
        <p className="max-w-prose text-ink-2">{t.intro}</p>
        <div role="group" aria-label={t.themeLabel} className="flex flex-wrap gap-2">
          {(['system', 'light', 'dark'] as const).map((value) => (
            <Chip key={value} selected={theme === value} onClick={() => setTheme(value)}>
              {t.theme[value]}
            </Chip>
          ))}
        </div>
      </header>

      <Section title={t.sections.colors}>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
          {colorTokens.map((token) => (
            <div key={token} className="flex flex-col gap-1.5">
              <div
                className="h-16 rounded-md border-2 border-ink"
                style={{ background: `var(--${token})` }}
              />
              <code className="text-caption text-ink-2">--{token}</code>
            </div>
          ))}
        </div>
      </Section>

      <Section title={t.sections.type}>
        <div className="flex flex-col gap-3">
          <p className="type-display">{t.sample.display}</p>
          <p className="type-h1">{t.sample.h1}</p>
          <p className="type-h2">{t.sample.h2}</p>
          <p className="type-h3">{t.sample.h3}</p>
          <p className="max-w-prose text-body">{t.sample.body}</p>
          <p className="text-small text-ink-2">{t.sample.small}</p>
          <p className="type-label text-ink-2">{t.sample.label}</p>
        </div>
      </Section>

      <Section title={t.sections.buttons}>
        <Row label={t.states.default}>
          <PressButton icon={<PlusIcon weight="bold" />}>{t.actions.report}</PressButton>
          <PressButton variant="secondary" icon={<NavigationArrowIcon weight="bold" />}>
            {t.actions.go}
          </PressButton>
          <PressButton variant="ghost">{t.actions.later}</PressButton>
          <PressButton variant="danger">{t.actions.ban}</PressButton>
        </Row>
        <Row label={t.states.pressed}>
          <PressButton pressed>{t.actions.report}</PressButton>
          <PressButton variant="secondary" pressed>
            {t.actions.confirmed}
          </PressButton>
        </Row>
        <Row label={t.states.disabled}>
          <PressButton disabled>{t.actions.report}</PressButton>
          <PressButton variant="secondary" disabled>
            {t.actions.go}
          </PressButton>
        </Row>
        <Row label={t.states.loading}>
          <PressButton loading>{t.actions.sending}</PressButton>
          <PressButton variant="secondary" loading>
            {t.actions.sending}
          </PressButton>
        </Row>
      </Section>

      <Section title={t.sections.chips}>
        <Row label={t.states.toggle}>
          {Object.entries(chips).map(([key, selected]) => (
            <Chip
              key={key}
              selected={selected}
              onClick={() => setChips((c) => ({ ...c, [key]: !c[key] }))}
            >
              {t.products[key as keyof typeof t.products]}
            </Chip>
          ))}
          <Chip selected={false} count={12}>
            {t.products.brands}
          </Chip>
          <Chip selected={false} disabled>
            {t.products.blister}
          </Chip>
        </Row>
      </Section>

      <Section title={t.sections.status}>
        <div className="grid max-w-md gap-2">
          {statuses.map((status, i) => (
            <StatusBand
              key={status}
              status={status}
              rarity={status === 'none' ? undefined : (((i % 3) + 1) as 1 | 2 | 3)}
            />
          ))}
          <StatusBand status="in_stock" rarity={2} remote />
        </div>
      </Section>

      <Section title={t.sections.card}>
        <div className="flex flex-wrap items-start gap-8">
          <DemoReportCard holo />
          <DemoReportCard />
        </div>
      </Section>

      <Section title={t.sections.badges}>
        <Row label={t.states.showcase}>
          {badges.map((badge) => (
            <ReputationBadge key={badge} badge={badge} size="showcase" />
          ))}
          <ReputationBadge badge="fiable" size="showcase" lockedProgress="18/30" />
        </Row>
        <Row label={t.states.sizes}>
          <ReputationBadge badge="eclaireur" size="card" />
          <span className="inline-flex items-center gap-1.5 text-small font-semibold">
            {t.sample.pseudo}
            <ReputationBadge badge="fiable" size="inline" />
          </span>
        </Row>
      </Section>

      <Section title={t.sections.fields}>
        <div className="grid max-w-md gap-5">
          <TextField label={t.fields.pseudo} placeholder="Chasseur4821" />
          <TextField label={t.fields.city} hint={t.fields.cityHint} />
          <TextField label={t.fields.pseudo} defaultValue="ab" error={t.fields.pseudoError} />
          <TextField label={t.fields.disabled} disabled defaultValue="84" />
        </div>
      </Section>

      <Section title={t.sections.feedback}>
        <Row label={t.states.sheetToast}>
          <PressButton variant="secondary" onClick={() => setSheetOpen(true)}>
            {t.actions.openSheet}
          </PressButton>
          <PressButton variant="secondary" onClick={() => toast.show({ message: t.toast.simple })}>
            {t.actions.toast}
          </PressButton>
          <PressButton
            variant="secondary"
            onClick={() =>
              toast.show({
                message: t.toast.undoable,
                onUndo: () => toast.show({ message: t.toast.undone }),
              })
            }
          >
            {t.actions.toastUndo}
          </PressButton>
        </Row>
        <Sheet
          open={sheetOpen}
          onOpenChange={setSheetOpen}
          title={t.sheet.title}
          description={t.sheet.description}
        >
          <div className="flex flex-col gap-4">
            <DemoReportCard />
            <PressButton fullWidth onClick={() => setSheetOpen(false)}>
              {t.actions.go}
            </PressButton>
          </div>
        </Sheet>
      </Section>

      <Section title={t.sections.skeleton}>
        <div className="flex flex-wrap gap-8">
          <ReportCardSkeleton />
          <div className="flex w-64 flex-col gap-2">
            <Skeleton className="h-5" />
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-5 w-1/2" />
          </div>
        </div>
      </Section>
    </div>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-5">
      <h2 className="type-h1">{title}</h2>
      {children}
    </section>
  )
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-3">
      <p className="type-label text-ink-2">{label}</p>
      <div className="flex flex-wrap items-center gap-4">{children}</div>
    </div>
  )
}

// Preview of the report card anatomy; the real ReportCard ships with the feed (story 3.1).
function DemoReportCard({ holo = false }: { holo?: boolean }) {
  return (
    <HoloLayer enabled={holo} className="w-full max-w-85 rounded-lg">
      <Card className="flex flex-col gap-2">
        <StatusBand status="in_stock" rarity={holo ? 3 : 2} />
        <div className="relative flex h-37.5 items-end gap-1.5 overflow-hidden rounded-md border-2 border-ink bg-paper-2 p-3">
          {(['red', 'status-soon', 'yellow', 'status-ok', 'type-psy', 'red'] as const).map(
            (c, i) => (
              <span
                key={i}
                aria-hidden="true"
                className="block flex-1 rounded-xs"
                style={{ background: `var(--${c})`, height: `${38 + ((i * 7) % 18)}%` }}
              />
            ),
          )}
          <span className="absolute right-2 bottom-2 inline-flex items-center gap-1 rounded-pill bg-ink px-2 py-1 text-label font-bold text-paper">
            <CameraIcon weight="bold" aria-hidden="true" />
            {t.card.photo}
          </span>
        </div>
        <div className="flex flex-col gap-1.5 px-1 pt-1">
          <h3 className="type-h3">{t.card.store}</h3>
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-caption text-ink-2">
            <span className="inline-flex items-center gap-1">
              <MapPinIcon weight="bold" aria-hidden="true" />
              {t.card.distance}
            </span>
            <span>{t.card.age}</span>
            <span className="inline-flex items-center gap-1">
              {t.card.author}
              <ReputationBadge badge="fiable" size="inline" />
            </span>
          </p>
          <div className="flex flex-wrap gap-1.5">
            {t.card.products.map((p) => (
              <span
                key={p}
                className="rounded-sm bg-paper-2 px-2 py-1.5 text-caption font-semibold"
              >
                {p}
              </span>
            ))}
          </div>
        </div>
        <div className="mt-1 flex items-center justify-between border-t-2 border-dashed border-ink-2/40 px-1 pt-2 text-caption">
          <span className="inline-flex items-center gap-1.5">
            <UsersIcon weight="bold" aria-hidden="true" />
            {t.card.confirmations}
          </span>
        </div>
      </Card>
    </HoloLayer>
  )
}
