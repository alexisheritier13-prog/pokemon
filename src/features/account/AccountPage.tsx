import { IdentificationCardIcon, SignOutIcon } from '@phosphor-icons/react'
import { useQueryClient } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { PressButton } from '@/components/ui/PressButton'
import { ReputationBadge } from '@/components/ui/ReputationBadge'
import { Skeleton } from '@/components/ui/Skeleton'
import { TextField } from '@/components/ui/TextField'
import { useToast } from '@/components/ui/toast-context'
import { copy } from '@/copy/fr'
import { signOut, updatePseudo, useMe } from '@/features/auth/api'
import { useAuth } from '@/features/auth/auth-context'
import { rememberReturnTo } from '@/features/auth/returnTo'

const PSEUDO_RE = /^[A-Za-z0-9_À-ÿ-]{3,20}$/

// Minimal account page for story 1.6; the full "carte de chasseur" comes with story 3.7.
export function AccountPage() {
  const auth = useAuth()
  if (auth.status === 'loading') return <AccountSkeleton />
  if (auth.status === 'anonymous') {
    return (
      <EmptyState
        icon={<IdentificationCardIcon weight="bold" />}
        title={copy.account.anonymousTitle}
        body={copy.account.anonymousBody}
        action={
          <Link
            to="/connexion"
            onClick={() => rememberReturnTo('/compte')}
            className="type-button inline-flex min-h-13 items-center rounded-button border-3 border-ink bg-red px-5.5 text-on-red shadow-primary active:translate-y-1 active:shadow-pressed"
          >
            {copy.account.signIn}
          </Link>
        }
      />
    )
  }
  return <SignedInAccount userId={auth.session.user.id} />
}

function SignedInAccount({ userId }: { userId: string }) {
  const { data: me, isLoading } = useMe()
  const toast = useToast()

  if (isLoading || !me) return <AccountSkeleton />

  return (
    <section className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-6 px-4 py-10">
      <Card className="flex flex-col gap-5 p-5">
        <div className="flex items-center gap-4">
          <div
            aria-hidden="true"
            className="grid size-16 place-items-center rounded-pill border-3 border-ink bg-yellow text-on-yellow"
          >
            <IdentificationCardIcon weight="bold" className="size-8" />
          </div>
          <div className="flex min-w-0 flex-col">
            <h1 className="type-h2 truncate">{me.profile.pseudo}</h1>
            <p className="text-small text-ink-2">
              {copy.account.reputation(me.profile.reputation_score)}
            </p>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <h2 className="type-label text-ink-2">{copy.account.badgesTitle}</h2>
          <div className="flex flex-wrap gap-3">
            {me.profile.badges.map((badge) => (
              <ReputationBadge key={badge} badge={badge} size="card" />
            ))}
          </div>
        </div>
      </Card>

      {/* Keyed by the saved pseudo: the form resets after each successful save. */}
      <PseudoForm key={me.profile.pseudo} userId={userId} current={me.profile.pseudo} />

      <PressButton
        variant="ghost"
        icon={<SignOutIcon weight="bold" />}
        onClick={() => {
          void signOut().then(() => toast.show({ message: copy.account.signedOut }))
        }}
      >
        {copy.account.signOut}
      </PressButton>
    </section>
  )
}

function PseudoForm({ userId, current }: { userId: string; current: string }) {
  const toast = useToast()
  const queryClient = useQueryClient()
  const [pseudo, setPseudo] = useState(current)
  const [error, setError] = useState<string>()
  const [saving, setSaving] = useState(false)

  const save = async (event: FormEvent) => {
    event.preventDefault()
    const value = pseudo.trim()
    if (!PSEUDO_RE.test(value)) {
      setError(copy.account.errors.pseudoFormat)
      return
    }
    setSaving(true)
    setError(undefined)
    try {
      await updatePseudo(userId, value)
      toast.show({ message: copy.account.saved })
      await queryClient.invalidateQueries({ queryKey: ['me'] })
    } catch (e) {
      const code = (e as Error).message
      setError(
        code === 'pseudo_taken'
          ? copy.account.errors.pseudoTaken
          : code === 'pseudo_format'
            ? copy.account.errors.pseudoFormat
            : copy.account.errors.unknown,
      )
      setSaving(false)
    }
  }

  return (
    <form onSubmit={save} noValidate className="flex flex-col gap-3">
      <TextField
        label={copy.account.pseudoLabel}
        hint={copy.account.pseudoHint}
        value={pseudo}
        onChange={(e) => setPseudo(e.target.value)}
        error={error}
        autoComplete="nickname"
        maxLength={20}
      />
      <PressButton
        type="submit"
        variant="secondary"
        loading={saving}
        disabled={pseudo.trim() === current}
      >
        {copy.account.save}
      </PressButton>
    </form>
  )
}

function AccountSkeleton() {
  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-4 px-4 py-10">
      <Skeleton className="h-40 rounded-lg" />
      <Skeleton className="h-12" />
    </div>
  )
}
