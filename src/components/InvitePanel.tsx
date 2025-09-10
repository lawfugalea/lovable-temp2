import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';

type CreateInviteResponse = {
  id: string;
  acceptUrl: string;
  expiresAt: string;
  status: 'PENDING' | 'ACCEPTED' | 'REVOKED' | 'EXPIRED';
  email?: string | null;
  role: 'OWNER' | 'MEMBER';
  emailStatus?: { ok: boolean; error?: string };
};

export default function InvitePanel() {
  const { data: session, status } = useSession();
  const [householdId, setHouseholdId] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'MEMBER' | 'OWNER'>('MEMBER');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<CreateInviteResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const disabled = submitting || !email || !householdId || status !== 'authenticated';

  // Derive/ensure householdId (same logic you approved earlier)
  useEffect(() => {
    let mounted = true;
    (async () => {
      if (status !== 'authenticated') return;
      const qs = new URLSearchParams(window.location.search);
      const hid = qs.get('hid');
      if (hid) { if (mounted) setHouseholdId(hid); return; }
      const sessionHid = (session as any)?.user?.activeHouseholdId as string | undefined;
      if (sessionHid) { if (mounted) setHouseholdId(sessionHid); return; }
      try {
        const r = await fetch('/api/household/create-default', { method: 'POST' });
        const j = await r.json();
        if (mounted) setHouseholdId(j?.householdId || '');
      } catch (e: any) {
        setError(e?.message || 'Could not get a household');
      }
    })();
    return () => { mounted = false; };
  }, [status, session]);

async function onInviteClick() {
  setSubmitting(true);
  setError(null);
  setResult(null);
  try {
    const r = await fetch('/api/household/invites', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ householdId, email: email.trim().toLowerCase(), role }),
    });

    // Be robust if the server ever returns plain text (e.g., "Unauthorized")
    const ct = r.headers.get('content-type') || '';
    const data = ct.includes('application/json') ? await r.json() : await r.text();

    if (!r.ok) {
      const msg = typeof data === 'string' ? data : data?.error || `Invite failed (${r.status})`;
      throw new Error(msg);
    }

    const json = data as any;
    setResult(json);
    if (json.emailStatus && !json.emailStatus.ok) {
      setError(`Email didn’t send: ${json.emailStatus.error || 'unknown error'}`);
    }
    setEmail('');
  } catch (e: any) {
    setError(e?.message || 'Invite failed');
  } finally {
    setSubmitting(false);
  }
}


  return (
    <div className="rounded-2xl border border-white/15 bg-white/60 backdrop-blur p-4 sm:p-5 shadow-sm">
      <h3 className="text-base sm:text-lg font-semibold mb-2 text-gray-900">Invite to household</h3>
      <p className="text-sm text-gray-600 mb-4">
        Send an email invite or share the link so your partner can join this household.
      </p>

      <div className="mb-2 text-xs text-gray-500">
        Household:&nbsp;<span className="font-mono">{householdId || '—'}</span>
      </div>

      <div className="space-y-3">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="partner@example.com"
          className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-fuchsia-400/60"
        />
        
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600">Role:</span>
          <div className="flex gap-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="role"
                value="MEMBER"
                checked={role === 'MEMBER'}
                onChange={(e) => setRole(e.target.value as 'MEMBER' | 'OWNER')}
                className="text-fuchsia-600 focus:ring-fuchsia-500"
              />
              <span className="text-sm text-gray-700">Member</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="role"
                value="OWNER"
                checked={role === 'OWNER'}
                onChange={(e) => setRole(e.target.value as 'MEMBER' | 'OWNER')}
                className="text-fuchsia-600 focus:ring-fuchsia-500"
              />
              <span className="text-sm text-gray-700">Owner</span>
            </label>
          </div>
        </div>

        <button
          type="button"
          onClick={onInviteClick}
          disabled={disabled}
          className={`w-full rounded-xl px-4 py-2 text-sm font-medium transition ${
            disabled
              ? 'cursor-not-allowed bg-gray-200 text-gray-500'
              : 'bg-fuchsia-600 text-white hover:bg-fuchsia-700 shadow-sm'
          }`}
        >
          {submitting ? 'Sending…' : `Invite as ${role}`}
        </button>
      </div>

      {error && (
        <div className="mt-3 text-sm text-red-600">{error}</div>
      )}

      {result && (
        <div className="mt-4 space-y-2">
          <div className="text-sm text-gray-900">
            Invite created for{' '}
            <span className="font-medium">{result.email || 'link-only'}</span>
            {result.emailStatus?.ok ? (
              <span className="ml-2 inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700">
                email sent
              </span>
            ) : result.email ? (
              <span className="ml-2 inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800">
                email failed
              </span>
            ) : null}
          </div>

          <div>
            <div className="text-xs text-gray-600">Accept link (share if needed):</div>
            <div className="mt-1 flex items-center gap-2">
              <code className="flex-1 break-all rounded-lg bg-gray-100 px-2 py-1 text-xs text-gray-800">
                {result.acceptUrl}
              </code>
              <button
                type="button"
                onClick={() => navigator.clipboard.writeText(result.acceptUrl)}
                className="rounded-lg border border-gray-300 bg-white px-2 py-1 text-xs hover:bg-gray-50"
              >
                Copy
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
