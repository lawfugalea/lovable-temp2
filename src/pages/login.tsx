import React, { useState } from 'react'
import Head from 'next/head'
import { useRouter } from 'next/router'
import { signIn } from 'next-auth/react'
import { AlertCircle, ArrowRight, CheckCircle2, Mail } from 'lucide-react'
import AuthLayout from '@/components/AuthLayout'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import PasswordInput from '@/components/ui/PasswordInput'
import { Spinner } from '@/components/ui/spinner'
import { APP_BASE_PATH, withBasePath } from '@/lib/base-path'
import { resolveSafeAppPath } from '@/lib/safe-navigation'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  React.useEffect(() => {
    if (router.query.registered === '1') {
      setSuccessMessage('Account created successfully! Please sign in to continue.')
    }
    if (router.query.invite) {
      setSuccessMessage('You have been invited to join a household! Please sign in or create an account to accept the invitation.')
    }
  }, [router.query])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      })

      if (result?.error) {
        setError('Invalid email or password')
        setIsLoading(false)
      } else {
        const requestedNext = typeof router.query.next === 'string' ? router.query.next : ''
        const safeNext = resolveSafeAppPath(requestedNext, window.location.origin, APP_BASE_PATH)
        if (safeNext !== withBasePath('/dashboard')) {
          window.location.assign(safeNext)
        } else {
          router.push('/dashboard')
        }
      }
    } catch (error) {
      console.error('Login error:', error)
      setError('Something went wrong. Please try again.')
      setIsLoading(false)
    }
  }

  const goToRegistration = () => {
    const inviteToken = router.query.invite as string
    if (inviteToken) {
      router.push(`/register?invite=${encodeURIComponent(inviteToken)}`)
    } else {
      router.push('/register')
    }
  }

  return (
    <>
      <Head>
        <title>Sign in – Clankeep</title>
        <meta
          name="description"
          content="Sign in to Clankeep to access your household workspace."
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <AuthLayout
        eyebrow="Welcome back"
        title="Sign in to your household"
        description="Pick up where you left off with your shared home workspace."
      >
        {successMessage && (
          <div
            role="status"
            className="mb-5 flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm leading-5 text-emerald-800"
          >
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{successMessage}</span>
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="mb-5 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm leading-5 text-red-800"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
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
                aria-invalid={Boolean(error)}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label htmlFor="password" className="text-sm font-medium">
                Password
              </label>
              <button
                type="button"
                onClick={() => router.push('/forgot-password')}
                className="text-sm font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                Forgot password?
              </button>
            </div>
            <PasswordInput
              id="password"
              name="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-11 border-border bg-background text-foreground focus:border-primary focus:ring-ring"
              placeholder="Enter your password"
              autoComplete="current-password"
              required
            />
          </div>

          <Button type="submit" disabled={isLoading} className="h-11 w-full gap-2">
            {isLoading ? <><Spinner /> Signing in…</> : <>Sign in <ArrowRight className="h-4 w-4" aria-hidden="true" /></>}
          </Button>
        </form>

        <div className="mt-6 border-t border-border pt-6 text-center">
          <p className="text-sm text-muted-foreground">
            New to Clankeep?{' '}
            <button
              type="button"
              onClick={goToRegistration}
              className="font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Create an account
            </button>
          </p>
        </div>
      </AuthLayout>
    </>
  )
}
