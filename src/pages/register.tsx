// src/pages/register.tsx
import { FormEvent, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErr(null); setOk(false); setLoading(true);
    try {
      const res = await fetch('/api/register', { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({ name, email, password }) });
      setLoading(false);
      if (!res.ok) throw new Error(await res.text());
      setOk(true);
      setTimeout(()=>router.replace('/'), 900);
    } catch (e:any) { setErr(e?.message || 'Could not register'); }
  };

  return (
    <>
      <Head><title>Register – Houseflow</title></Head>
      <div className="min-h-screen grid place-items-center px-4" style={{ background:'linear-gradient(90deg,var(--hf-grad-from),var(--hf-grad-via),var(--hf-grad-to))' }}>
        <div className="w-full max-w-md bg-white/80 backdrop-blur rounded-2xl border border-white/70 shadow-card p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-10 w-10 rounded-xl bg-white grid place-items-center shadow-sm">H</div>
            <h1 className="text-xl font-semibold">Create your account</h1>
          </div>
          <form onSubmit={onSubmit} className="grid gap-3">
            <label className="text-sm">Name
              <input className="mt-1 w-full rounded-xl border px-3 py-2" value={name} onChange={(e)=>setName(e.target.value)} required />
            </label>
            <label className="text-sm">Email
              <input type="email" className="mt-1 w-full rounded-xl border px-3 py-2" value={email} onChange={(e)=>setEmail(e.target.value)} required />
            </label>
            <label className="text-sm">Password
              <input type="password" className="mt-1 w-full rounded-xl border px-3 py-2" value={password} onChange={(e)=>setPassword(e.target.value)} required />
            </label>
            {err && <div className="text-sm text-red-600">{err}</div>}
            {ok && <div className="text-sm text-emerald-700">Account created! Redirecting…</div>}
            <button type="submit" disabled={loading} className="rounded-xl bg-gray-900 text-white px-4 py-2 min-h-[44px] hover:bg-black disabled:opacity-60">
              {loading ? 'Creating…' : 'Create account'}
            </button>
            <div className="text-xs text-center text-gray-600">Already have an account? <a className="underline" href="/">Sign in</a></div>
          </form>
        </div>
      </div>
    </>
  );
}
