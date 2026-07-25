import { useCallback, useState } from 'react'
import { useRouter } from 'next/router'
import { ArrowLeft, ArrowRight, CheckCircle2, Compass, Mail, Sparkles, UserPlus } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { Alert, AlertDescription } from '@/components/ui/Alert'
import HouseholdCreationWizard from '@/components/HouseholdCreationWizard'
import { modules } from '@/lib/modules'
import { moduleHelp } from '@/lib/help-content'
import { cn } from '@/lib/utils'

type Screen = 'intro' | 'invited' | 'create' | 'done'

interface WelcomeFlowProps {
  firstName?: string | null
  /**
   * Called when the user leaves the final screen, not the moment the household
   * is created — the caller reloading its data unmounts this component, so
   * firing earlier would make the "You're in" screen unreachable.
   */
  onCreated: () => void
  /** Starts the guided tour from the final screen. Omitted when unavailable. */
  onStartTour?: () => void
  /** Records that the user declined the tour. */
  onSkipTour?: () => void
}

/**
 * Pull the invite token out of whatever the user pasted — a full URL, a bare
 * `?token=…` query string, or the token on its own.
 */
export function extractInviteToken(raw: string): string | null {
  const value = raw.trim()
  if (!value) return null

  const fromQuery = value.match(/[?&]token=([^&\s]+)/)
  if (fromQuery) return decodeURIComponent(fromQuery[1])

  // A bare token: opaque, but it should not contain URL punctuation.
  if (/^[A-Za-z0-9._~-]{16,256}$/.test(value)) return value

  return null
}

export default function WelcomeFlow({ firstName, onCreated, onStartTour, onSkipTour }: WelcomeFlowProps) {
  const router = useRouter()
  const [screen, setScreen] = useState<Screen>('intro')
  const [inviteValue, setInviteValue] = useState('')
  const [inviteError, setInviteError] = useState('')

  const openInvite = useCallback(() => {
    const token = extractInviteToken(inviteValue)
    if (!token) {
      setInviteError('That does not look like an invite link. Paste the whole link from the email or message.')
      return
    }
    setInviteError('')
    // The token is only validated server-side, on /invites/accept.
    void router.push(`/invites/accept?token=${encodeURIComponent(token)}`)
  }, [inviteValue, router])

  if (screen === 'create') {
    return (
      <div className="mx-auto max-w-2xl space-y-8 py-4">
        <HouseholdCreationWizard
          onComplete={() => setScreen('done')}
          onCancel={() => setScreen('intro')}
        />
      </div>
    )
  }

  if (screen === 'done') {
    return (
      <div className="mx-auto max-w-xl space-y-8 py-4 text-center">
        <div>
          <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-primary/10 text-primary">
            <CheckCircle2 className="h-7 w-7" aria-hidden="true" />
          </div>
          <h2 className="font-display text-3xl font-bold tracking-tight">You&apos;re in.</h2>
          <p className="mx-auto mt-3 max-w-md text-base leading-relaxed text-muted-foreground">
            Your household is set up. Take a quick look around, or dive straight in — most
            households start with a shopping list.
          </p>
        </div>
        <div className="flex flex-col justify-center gap-3 sm:flex-row">
          {onStartTour && (
            <Button size="lg" onClick={() => { onCreated(); onStartTour() }}>
              <Compass className="h-4 w-4" /> Take the 90-second tour
            </Button>
          )}
          <Button
            size="lg"
            variant={onStartTour ? 'outline' : 'default'}
            onClick={() => { onSkipTour?.(); onCreated() }}
          >
            {onStartTour ? "I'll look around myself" : 'Start using ClanKeep'}
          </Button>
        </div>
      </div>
    )
  }

  if (screen === 'invited') {
    return (
      <div className="mx-auto max-w-xl space-y-6 py-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" aria-hidden="true" />
              Join an existing household
            </CardTitle>
            <CardDescription>
              Paste the invite link your household sent you. It usually arrives by email.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="invite-link" className="text-sm font-medium text-foreground">
                Invite link
              </label>
              <Input
                id="invite-link"
                value={inviteValue}
                onChange={(event) => { setInviteValue(event.target.value); setInviteError('') }}
                onKeyDown={(event) => { if (event.key === 'Enter') openInvite() }}
                placeholder="https://…/invites/accept?token=…"
                autoComplete="off"
                spellCheck={false}
                aria-invalid={inviteError ? true : undefined}
                aria-describedby={inviteError ? 'invite-error' : undefined}
              />
            </div>

            {inviteError && (
              <Alert variant="destructive" id="invite-error">
                <AlertDescription>{inviteError}</AlertDescription>
              </Alert>
            )}

            <p className="text-sm text-muted-foreground">
              No link yet? Ask whoever set up the household to resend it from
              Household → Invites. Invite links expire, so an old one may need replacing.
            </p>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <Button variant="ghost" onClick={() => setScreen('intro')}>
                <ArrowLeft className="h-4 w-4" /> Back
              </Button>
              <Button onClick={openInvite} disabled={!inviteValue.trim()}>
                Open invite <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8 py-4">
      <div className="text-center">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-sm font-semibold text-primary">
          <Sparkles className="h-4 w-4" aria-hidden="true" /> Let&apos;s set up your home
        </div>
        <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
          Welcome to ClanKeep{firstName ? `, ${firstName}` : ''}!
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-base leading-relaxed text-muted-foreground">
          ClanKeep keeps the running of a home in one shared place. Everything lives
          inside a household, and everyone you invite sees the same lists, plans and records.
        </p>
      </div>

      <section aria-labelledby="welcome-areas" className="rounded-2xl border bg-card p-5 shadow-soft-sm sm:p-6">
        <h3 id="welcome-areas" className="font-display text-base font-bold tracking-tight">
          What you get
        </h3>
        <ul className="mt-4 grid gap-x-6 gap-y-4 sm:grid-cols-2">
          {modules
            .filter((module) => module.key !== 'home')
            .map((module) => {
              const help = moduleHelp[module.key]
              const Icon = module.icon
              return (
                <li key={module.key} className="flex gap-3">
                  <span className={cn('grid h-9 w-9 shrink-0 place-items-center rounded-lg', module.tileClass)}>
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold">{module.name}</span>
                      {help.requiresFeature && (
                        <Badge variant="secondary" className="shrink-0">Family plan</Badge>
                      )}
                    </div>
                    <p className="mt-0.5 text-sm leading-snug text-muted-foreground">{help.tagline}</p>
                  </div>
                </li>
              )
            })}
        </ul>
        <p className="mt-5 border-t pt-4 text-sm text-muted-foreground">
          Shopping, meals, chores, notes and medicine for one child are free, with no time limit.
        </p>
      </section>

      <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
        <Button size="lg" onClick={() => setScreen('create')}>
          <Sparkles className="h-4 w-4" /> Create our household
        </Button>
        <Button size="lg" variant="outline" onClick={() => setScreen('invited')}>
          <UserPlus className="h-4 w-4" /> I was invited
        </Button>
      </div>
    </div>
  )
}
