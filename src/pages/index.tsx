// src/pages/index.tsx
import { FormEvent, useMemo, useState } from 'react';
import { signIn, useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Image from 'next/image';
import Head from 'next/head';

export default function LoginPage() {
  const router = useRouter();
  const { status } = useSession();

  const callbackUrl = useMemo(() => {
    const n = router.query.next;
    return typeof n === 'string' && n.startsWith('/') ? n : '/dashboard';
  }, [router.query.next]);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (status === 'authenticated') {
    if (typeof window !== 'undefined') router.replace(callbackUrl);
    return null;
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    const res = await signIn('credentials', { email, password, redirect: false, callbackUrl });
    setLoading(false);
    if (!res?.ok) { setErr('Invalid credentials'); return; }
    router.push(callbackUrl);
  };

  return (
    <>
      <Head><title>Welcome Home – HouseFlow</title></Head>

      <main className="min-h-screen bg-cozy-warm flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="cozy-card overflow-hidden">
            <div className="bg-cozy-header border-b border-cozy-gray-200 flex flex-col items-center py-8">
              <div className="h-16 w-16 rounded-cozy-lg bg-cozy-surface shadow-cozy-md grid place-items-center text-2xl border border-cozy-primary-soft mb-3">
                🏠
              </div>
              <h1 className="text-2xl font-bold text-cozy-text mb-1">HouseFlow</h1>
              <p className="text-cozy-text-muted text-sm">Your cozy home hub awaits</p>
            </div>

            <div className="bg-cozy-surface px-8 py-8">
              <form onSubmit={onSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-cozy-text mb-2">Email</label>
                  <input 
                    type="email" 
                    className="w-full border border-cozy-gray-300 rounded-cozy bg-cozy-surface px-4 py-3 text-cozy-text focus:outline-none focus:border-cozy-primary focus:ring-2 focus:ring-cozy-primary/20 transition-all" 
                    placeholder="you@home.com" 
                    value={email} 
                    onChange={(e)=>setEmail(e.target.value)} 
                    autoComplete="email" 
                    required 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-cozy-text mb-2">Password</label>
                  <input 
                    type="password" 
                    className="w-full border border-cozy-gray-300 rounded-cozy bg-cozy-surface px-4 py-3 text-cozy-text focus:outline-none focus:border-cozy-primary focus:ring-2 focus:ring-cozy-primary/20 transition-all" 
                    placeholder="••••••••" 
                    value={password} 
                    onChange={(e)=>setPassword(e.target.value)} 
                    autoComplete="current-password" 
                    required 
                  />
                </div>
                {err && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-cozy">{err}</p>}
                <button 
                  disabled={loading} 
                  className={`cozy-btn-primary w-full ${loading ? 'opacity-60 cursor-not-allowed' : ''}`}
                >
                  {loading ? '🏡 Signing in…' : '🔑 Enter your home'}
                </button>
              </form>

              <div className="mt-6 pt-6 border-t border-cozy-gray-200 text-center">
                <p className="text-sm text-cozy-text-muted">
                  New family? <a className="font-medium text-cozy-primary hover:text-cozy-primary-deep underline" href="/register">Create your household</a>
                </p>
              </div>
            </div>
          </div>

          <div className="text-center text-xs text-cozy-text-soft mt-6 bg-cozy-surface/60 rounded-cozy px-4 py-2 backdrop-blur-sm">
            ☕ By signing in, you agree to keep our home cozy and welcoming
          </div>
        </div>
      </main>
    </>
  );
}
