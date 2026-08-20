import React, { useState } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { AlertCircle, ArrowRight, CheckCircle2 } from 'lucide-react'
import AuthLayout from '@/components/AuthLayout'
import { Button } from '@/components/ui/Button'
import PasswordInput from '@/components/ui/PasswordInput'
import { Spinner } from '@/components/ui/spinner'

export default function ResetPasswordPage() {
  const router = useRouter()
  const token = typeof router.query.token === 'string' ? router.query.token : ''
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirm) {
      setError('The two passwords do not match')
      return
    }
    setIsLoading(true)
    setError('')
    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(typeof data.error === 'string' ? data.error : 'Something went wrong. Please try again.')
      setDone(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const missingToken = router.isReady && !token

  return (
    <>
      <Head>
        <title>Reset password – Clankeep</title>
        <meta name="description" content="Choose a new password for your Clankeep account." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <AuthLayout
        eyebrow="Account recovery"
        title="Choose a new password"
        description="At least 8 characters — a few unrelated words make a strong, memorable password."
      >
        {done ? (
          <>
            <div
              role="status"
              className="flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm leading-5 text-emerald-800"
            >
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <span>Your password has been updated. Sign in with the new password to continue.</span>
            </div>
            <Button type="button" onClick={() => router.push('/login')} className="mt-5 h-11 w-full gap-2">
              Go to sign in <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Button>
          </>
        ) : missingToken ? (
          <div
            role="alert"
            className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm leading-5 text-red-800"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>
              This reset link is incomplete.{' '}
              <Link href="/forgot-password" className="font-medium underline underline-offset-4">
                Request a new one
              </Link>
              .
            </span>
          </div>
        ) : (
          <>
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
                <label htmlFor="password" className="text-sm font-medium">
                  New password
                </label>
                <PasswordInput
                  id="password"
                  name="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-11 border-border bg-background text-foreground focus:border-primary focus:ring-ring"
                  placeholder="At least 8 characters"
                  autoComplete="new-password"
                  required
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="confirm" className="text-sm font-medium">
                  Repeat new password
                </label>
                <PasswordInput
                  id="confirm"
                  name="confirm"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className="h-11 border-border bg-background text-foreground focus:border-primary focus:ring-ring"
                  placeholder="Same password again"
                  autoComplete="new-password"
                  required
                />
              </div>

              <Button type="submit" disabled={isLoading} className="h-11 w-full gap-2">
                {isLoading ? <><Spinner /> Updating…</> : <>Update password <ArrowRight className="h-4 w-4" aria-hidden="true" /></>}
              </Button>
            </form>
          </>
        )}

        <div className="mt-6 border-t border-border pt-6 text-center">
          <p className="text-sm text-muted-foreground">
            Remembered it?{' '}
            <Link
              href="/login"
              className="font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Back to sign in
            </Link>
          </p>
        </div>
      </AuthLayout>
    </>
  )
}
