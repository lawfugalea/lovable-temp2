import React, { useState } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { AlertCircle, ArrowRight, CheckCircle2, Mail, UserRound } from 'lucide-react'
import AuthLayout from '@/components/AuthLayout'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import MathCaptcha from '@/components/ui/MathCaptcha'
import { Spinner } from '@/components/ui/spinner'
import PasswordInput from '@/components/ui/PasswordInput'
import PublicTracking from '@/components/PublicTracking'
import { trackMetaEvent } from '@/components/MetaPixel'
import { newEventId } from '@/lib/meta/event-id'

export default function RegisterPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [captcha, setCaptcha] = useState<{ id: string; answer: string } | null>(null)
  const [acceptedTerms, setAcceptedTerms] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!captcha) {
      setError('Please complete the security check')
      return
    }

    if (!acceptedTerms) {
      setError('Please accept the Terms and Privacy Policy')
      return
    }

    setIsLoading(true)
    setError('')
    setSuccess(false)

    try {
      // One id for both sides of the same conversion, so the browser event and
      // the server event are recognised as one signup rather than two.
      const metaEventId = newEventId()
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name, email, password, captchaId: captcha.id, captchaAnswer: captcha.answer, acceptedTerms, metaEventId })
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Could not register')
      }

      // No-op unless the visitor accepted tracking and the pixel loaded.
      trackMetaEvent('CompleteRegistration', metaEventId)
      setSuccess(true)
      setTimeout(() => {
        const inviteToken = router.query.invite as string
        if (inviteToken) {
          const next = `/invites/accept?token=${encodeURIComponent(inviteToken)}`
          router.replace(`/login?registered=1&invite=${encodeURIComponent(inviteToken)}&next=${encodeURIComponent(next)}`)
        } else {
          router.replace('/login?registered=1')
        }
      }, 1500)
    } catch (e: any) {
      setError(e?.message || 'Could not register')
    } finally {
      setIsLoading(false)
    }
  }

  const goToSignIn = () => {
    const inviteToken = typeof router.query.invite === 'string' ? router.query.invite : ''
    if (!inviteToken) {
      void router.push('/login')
      return
    }

    const next = `/invites/accept?token=${encodeURIComponent(inviteToken)}`
    void router.push(`/login?invite=${encodeURIComponent(inviteToken)}&next=${encodeURIComponent(next)}`)
  }

  return (
    <>
      <Head>
        <title>Create an account – Clankeep</title>
        <meta
          name="description"
          content="Create a Clankeep account for your shared household workspace."
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <AuthLayout
        eyebrow={router.query.invite ? 'Household invitation' : 'Get started'}
        title={router.query.invite ? 'Create your account to join' : 'Create your Clankeep account'}
        description={
          router.query.invite
            ? 'Your invitation will be waiting after you create your account and sign in.'
            : 'Set up your account, then bring the people and routines of your home together.'
        }
      >
        {error && (
          <div
            role="alert"
            className="mb-5 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm leading-5 text-red-800"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div
            role="status"
            className="mb-5 flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm leading-5 text-emerald-800"
          >
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>Account created. Redirecting you to sign in…</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <label htmlFor="name" className="text-sm font-medium">
              Full name
            </label>
            <div className="relative">
              <UserRound
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                id="name"
                name="name"
                type="text"
                className="h-11 border-border bg-background pl-10 text-foreground placeholder:text-muted-foreground focus-visible:ring-ring"
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium">
              Email address
            </label>
            <div className="relative">
              <Mail
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                id="email"
                name="email"
                type="email"
                className="h-11 border-border bg-background pl-10 text-foreground placeholder:text-muted-foreground focus-visible:ring-ring"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="new-password" className="text-sm font-medium">
              Password
            </label>
            <PasswordInput
              id="new-password"
              name="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-11 border-border bg-background text-foreground focus:border-primary focus:ring-ring"
              placeholder="Create a strong password"
              autoComplete="new-password"
              required
              minLength={8}
              maxLength={128}
            />
            <p className="text-xs leading-5 text-muted-foreground">
              At least 8 characters. A few unrelated words work great.
            </p>
          </div>

          <MathCaptcha onChange={setCaptcha} />

          <label className="flex items-start gap-3 text-sm text-muted-foreground">
            <input
              type="checkbox"
              checked={acceptedTerms}
              onChange={(event) => setAcceptedTerms(event.target.checked)}
              required
              className="mt-0.5 h-4 w-4 shrink-0 rounded border-input text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <span>
              I agree to the{' '}
              <Link href="/terms" target="_blank" className="font-medium text-primary hover:underline">Terms</Link>
              {' '}and{' '}
              <Link href="/privacy" target="_blank" className="font-medium text-primary hover:underline">Privacy Policy</Link>.
            </span>
          </label>

          <Button
            type="submit"
            disabled={isLoading || !captcha || !acceptedTerms}
            className="h-11 w-full gap-2"
          >
            {isLoading ? <><Spinner /> Creating account…</> : <>Create account <ArrowRight className="h-4 w-4" aria-hidden="true" /></>}
          </Button>
        </form>

        <div className="mt-6 border-t border-border pt-6 text-center">
          <p className="text-sm text-muted-foreground">
            Already have an account?{' '}
            <button
              type="button"
              onClick={goToSignIn}
              className="font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Sign in
            </button>
          </p>
        </div>
      </AuthLayout>
      <PublicTracking />
    </>
  )
}
