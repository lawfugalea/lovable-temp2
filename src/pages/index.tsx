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
      <Head><title>Sign in – HouseFlow</title></Head>

      <main className="min-h-screen bg-gradient-to-br from-indigo-700 via-violet-700 to-fuchsia-700 flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          <div className="overflow-hidden rounded-3xl shadow-xl">
            <div className="bg-white/10 backdrop-blur-md border-b border-white/20 flex justify-center py-6">
              <Image src="/logo.png" alt="HouseFlow" width={80} height={80} className="rounded-2xl" priority />
            </div>

            <div className="bg-white px-6 py-6">
              <h1 className="text-2xl font-bold text-center text-gray-800 mb-1">HouseFlow</h1>
              <p className="text-center text-sm text-gray-500 mb-6">Sign in to your household</p>

              <form onSubmit={onSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-700 mb-1">Email</label>
                  <input type="email" className="w-full border border-gray-300 rounded-xl px-3 py-2 focus:ring-2 focus:ring-fuchsia-400/60" placeholder="you@example.com" value={email} onChange={(e)=>setEmail(e.target.value)} autoComplete="email" required />
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-1">Password</label>
                  <input type="password" className="w-full border border-gray-300 rounded-xl px-3 py-2 focus:ring-2 focus:ring-fuchsia-400/60" placeholder="••••••••" value={password} onChange={(e)=>setPassword(e.target.value)} autoComplete="current-password" required />
                </div>
                {err && <p className="text-sm text-red-600 -mt-1">{err}</p>}
                <button disabled={loading} className={`w-full rounded-xl py-2.5 font-medium text-white shadow-sm transition ${loading ? 'bg-gray-400' : 'bg-fuchsia-600 hover:bg-fuchsia-700'}`}>
                  {loading ? 'Signing in…' : 'Sign in'}
                </button>
              </form>

              <p className="text-sm text-center mt-4 text-gray-700">
                No account? <a className="underline text-fuchsia-700 hover:text-fuchsia-800" href="/register">Register</a>
              </p>
            </div>
          </div>

          <div className="text-center text-xs text-white/80 mt-4">By signing in you agree to the household rules.</div>
        </div>
      </main>
    </>
  );
}
