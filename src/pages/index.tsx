import React, { useState } from 'react'
import { useRouter } from 'next/router'
import { signIn, getSession } from 'next-auth/react'
import FunButton from '../components/ui/FunButton'
import FunCard from '../components/ui/FunCard'
import PasswordInput from '../components/ui/PasswordInput'

export default function HomePage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  // Check for registration success message and invite token
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
        // Authentication was successful
        if (router.query.next) {
          // Redirect to the next URL (e.g., invite acceptance)
          // Use window.location.href to ensure full page reload for proper session handling
          window.location.href = router.query.next as string
        } else {
          // Default redirect to dashboard
          router.push('/dashboard')
        }
      }
    } catch (error) {
      console.error('Login error:', error)
      setError('Something went wrong. Please try again.')
      setIsLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-cozy-warm flex items-center justify-center p-6">
      <div className="w-full max-w-md animate-cozy-bounce-in">
        <FunCard className="overflow-hidden" hover bounce>
          {/* Header with personality */}
          <div className="bg-cozy-header border-b border-cozy-gray-200 flex flex-col items-center py-8">
            <div className="h-16 w-16 rounded-cozy-lg bg-cozy-surface shadow-cozy-md grid place-items-center text-2xl border border-cozy-primary-soft mb-3 animate-cozy-float cozy-emoji">
              🏠
            </div>
            <h1 className="text-2xl font-bold text-cozy-text mb-1 flex items-center gap-2">
              <span>HouseFlow</span>
              <span className="animate-cozy-pulse-gentle">✨</span>
            </h1>
            <p className="text-cozy-text-muted text-sm text-center">
              Your cozy home hub awaits
              <br />
              <span className="animate-cozy-wiggle inline-block">🫖</span> Where warmth meets organization
            </p>
          </div>

          <div className="bg-cozy-surface px-8 py-8">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-cozy-text mb-2 flex items-center gap-2">
                  <span>📧</span>
                  Email
                </label>
                <input 
                  type="email" 
                  className="w-full border border-cozy-gray-300 rounded-lg bg-cozy-surface px-4 py-3 text-cozy-text focus:outline-none focus:border-cozy-primary focus:ring-2 focus:ring-cozy-primary/20 transition-all" 
                  placeholder="you@home.com" 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                  autoComplete="email" 
                  required 
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-cozy-text mb-2 flex items-center gap-2">
                  <span>🔒</span>
                  Password
                </label>
                <PasswordInput
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                />
              </div>
              
              {successMessage && (
                <div className="animate-cozy-bounce-in animation-delay-400">
                  <div className="bg-green-50 border border-green-200 rounded-cozy px-4 py-3 text-green-700 text-sm flex items-center gap-2">
                    <span>✅</span>
                    {successMessage}
                  </div>
                </div>
              )}
              
              {error && (
                <div className="animate-cozy-bounce-in animation-delay-400">
                  <div className="bg-red-50 border border-red-200 rounded-cozy px-4 py-3 text-red-700 text-sm flex items-center gap-2">
                    <span>⚠️</span>
                    {error}
                  </div>
                </div>
              )}
              
              <div className="animate-cozy-bounce-in animation-delay-400">
                <FunButton 
                  type="submit"
                  disabled={isLoading} 
                  className="w-full"
                  variant={isLoading ? "secondary" : "primary"}
                  emoji={isLoading ? "🏡" : "🔑"}
                  celebration={!isLoading}
                >
                  {isLoading ? 'Signing in…' : 'Enter your home'}
                </FunButton>
              </div>
            </form>

            <div className="mt-6 pt-6 border-t border-cozy-gray-200 text-center animate-cozy-bounce-in animation-delay-500">
              <p className="text-sm text-cozy-text-muted flex items-center justify-center gap-2">
                <span>New family?</span>
                <button 
                  onClick={() => {
                    const inviteToken = router.query.invite as string
                    if (inviteToken) {
                      router.push(`/register?invite=${encodeURIComponent(inviteToken)}`)
                    } else {
                      router.push('/register')
                    }
                  }}
                  className="font-medium text-cozy-primary hover:text-cozy-primary-deep underline hover:animate-cozy-wiggle transition-all"
                >
                  Create your household
                </button>
                <span className="animate-cozy-pulse-gentle">🏡</span>
              </p>
            </div>
          </div>
        </FunCard>

        <div className="text-center text-xs text-cozy-text-soft mt-6 bg-cozy-surface/60 rounded-cozy px-4 py-2 backdrop-blur-sm animate-cozy-bounce-in animation-delay-600">
          <div className="flex items-center justify-center gap-2">
            <span className="animate-cozy-pulse-gentle">☕</span>
            <span>By signing in, you agree to keep our home cozy and welcoming</span>
            <span className="animate-cozy-pulse-gentle animation-delay-300">💝</span>
          </div>
        </div>

        {/* Fun floating elements */}
        <div className="fixed top-10 left-10 text-2xl animate-cozy-float animation-delay-1000 opacity-20 pointer-events-none">
          🌸
        </div>
        <div className="fixed top-20 right-20 text-xl animate-cozy-pulse-gentle animation-delay-1500 opacity-30 pointer-events-none">
          ✨
        </div>
        <div className="fixed bottom-32 left-20 text-lg animate-cozy-wiggle animation-delay-2000 opacity-25 pointer-events-none">
          🫖
        </div>
      </div>
    </main>
  )
}