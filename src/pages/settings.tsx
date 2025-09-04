// src/pages/settings.tsx
import Head from 'next/head';
import Layout from '../components/Layout';
import { useEffect, useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import InvitePanel from '@/components/InvitePanel';

// UI kit
import PageHeader from '@/components/ui/PageHeader';
import Section from '@/components/ui/Section';
import Card from '@/components/ui/Card';

type InviteItem = {
  id: string;
  householdId: string;
  email?: string | null;
  role: 'OWNER' | 'MEMBER';
  status: 'PENDING' | 'ACCEPTED' | 'REVOKED' | 'EXPIRED';
  expiresAt: string;
};

export default function SettingsPage() {
  const { status, data: session } = useSession();
  const [householdId, setHouseholdId] = useState<string>('');
  const [loadingHid, setLoadingHid] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (status !== 'authenticated') return;

      const qs = new URLSearchParams(window.location.search);
      const hid = qs.get('hid');
      if (hid) { if (mounted) setHouseholdId(hid); setLoadingHid(false); return; }

      const sessHid = (session as any)?.user?.activeHouseholdId as string | undefined;
      if (sessHid) { if (mounted) setHouseholdId(sessHid); setLoadingHid(false); return; }

      try {
        const r = await fetch('/api/household/create-default', { method: 'POST', credentials: 'include' });
        const ct = r.headers.get('content-type') || '';
        const body = ct.includes('application/json') ? await r.json() : await r.text();
        const newHid = (body as any)?.householdId as string | undefined;
        if (mounted) setHouseholdId(newHid || '');
      } finally { if (mounted) setLoadingHid(false); }
    })();
    return () => { mounted = false; };
  }, [status, session]);

  if (status === 'loading' || loadingHid)
    return <Layout><div className="min-h-[50vh] flex items-center justify-center text-sm text-gray-500">Loading…</div></Layout>;

  if (status === 'unauthenticated')
    return <Layout><div className="p-6 text-red-600">Sign in required</div></Layout>;

  return (
    <Layout>
      <Head><title>Household Settings – HouseFlow</title></Head>

      <PageHeader
        title="Household Settings"
        subtitle="Manage members and invites for your household."
        householdId={householdId}
        status={
          <button onClick={() => signOut({ callbackUrl: '/' })} className="rounded-xl bg-white px-3 py-1.5 text-xs border hover:bg-gray-50">
            Sign out
          </button>
        }
      />

      <main className="mx-4 sm:mx-6 my-6 grid gap-6">
        <Section title="Invite a member" desc="Invite your partner to access the same Finances & Shopping data." tone="indigo">
          <InvitePanel />
          {typeof window !== 'undefined' &&
            new URLSearchParams(window.location.search).get('joined') === '1' && (
              <Card className="p-3 mt-3">
                <div className="inline-flex items-center gap-2 text-sm">
                  <span className="inline-block h-2 w-2 rounded-full bg-emerald-400" />
                  You have successfully joined this household 🎉
                </div>
              </Card>
            )}
        </Section>

        <PendingInvites householdId={householdId} />
        <Members householdId={householdId} />
      </main>
    </Layout>
  );
}

/* -------------------- Members -------------------- */
function Members({ householdId }: { householdId: string }) {
  const [items, setItems] = useState<Array<{
    id: string;
    role: 'OWNER' | 'MEMBER';
    createdAt: string;
    user: { id: string; name: string | null; email: string; createdAt: string };
  }>>([]);
  const [viewerRole, setViewerRole] = useState<'OWNER' | 'MEMBER' | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const r = await fetch(`/api/household/members?householdId=${encodeURIComponent(householdId)}`, { credentials: 'include' });
      if (!r.ok) throw new Error(await r.text());
      const j = await r.json();
      setViewerRole(j.viewerRole || null);
      setItems(j.members || []);
    } catch (e: any) {
      setErr(e?.message || 'Failed to load members');
    } finally { setLoading(false); }
  }

  useEffect(() => { if (householdId) void load(); }, [householdId]);

  async function onRemove(memberId: string) {
    if (!confirm('Remove this member from the household?')) return;
    const r = await fetch(`/api/household/members/${memberId}/remove`, { method: 'POST', credentials: 'include' });
    if (!r.ok) { const msg = await r.text(); alert(`Remove failed: ${msg || r.status}`); return; }
    setItems(prev => prev.filter(m => m.id !== memberId));
  }

  return (
    <Section title="Members" desc="Owner can remove members." tone="violet">
      {loading ? (
        <div className="text-sm text-gray-500">Loading…</div>
      ) : err ? (
        <div className="text-sm text-red-600">{err}</div>
      ) : items.length === 0 ? (
        <div className="text-sm text-gray-500">No members yet.</div>
      ) : (
        <ul className="space-y-3">
          {items.map((m) => (
            <li key={m.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-2xl border border-gray-200 bg-gray-50 p-3">
              <div className="min-w-0">
                <div className="text-sm text-gray-900 truncate">{m.user.name || m.user.email}</div>
                <div className="text-xs text-gray-600">Role: {m.role.toLowerCase()} • Joined: {new Date(m.createdAt).toLocaleString()}</div>
              </div>
              {viewerRole === 'OWNER' && m.role !== 'OWNER' && (
                <button onClick={() => onRemove(m.id)} className="rounded-xl border border-red-200 bg-red-50 px-3 py-1.5 text-xs text-red-700 hover:bg-red-100">
                  Remove
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      <div className="mt-3">
        <button className="rounded-xl border border-gray-300 bg-white px-3 py-1.5 text-xs hover:bg-gray-50" onClick={load}>
          Refresh
        </button>
      </div>
    </Section>
  );
}

/* -------------------- Pending Invites -------------------- */
function PendingInvites({ householdId }: { householdId: string }) {
  const [invites, setInvites] = useState<InviteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const r = await fetch(`/api/household/invites?householdId=${encodeURIComponent(householdId)}`, { credentials: 'include' });
      const ct = r.headers.get('content-type') || '';
      const data = ct.includes('application/json') ? await r.json() : await r.text();
      if (!r.ok) throw new Error(typeof data === 'string' ? data : data?.error || 'Failed to load invites');
      setInvites((data as any).invites || []);
    } catch (e: any) {
      setErr(e?.message || 'Failed to load invites');
    } finally { setLoading(false); }
  }
  useEffect(() => { if (householdId) load(); }, [householdId]);

  async function onResend(id: string) {
    const r = await fetch(`/api/household/invites/${id}/resend`, { method: 'POST', credentials: 'include' });
    if (!r.ok) alert(`Resend failed: ${await r.text()}`); else alert('Resent ✅');
  }
  async function onRevoke(id: string) {
    if (!confirm('Revoke this invite?')) return;
    const r = await fetch(`/api/household/invites/${id}/revoke`, { method: 'POST', credentials: 'include' });
    if (!r.ok) alert(`Revoke failed: ${await r.text()}`); else setInvites(prev => prev.filter(v => v.id !== id));
  }

  return (
    <Section title="Pending invites" desc="Manage outstanding invitations." tone="indigo">
      {loading ? (
        <div className="text-sm text-gray-500">Loading…</div>
      ) : err ? (
        <div className="text-sm text-red-600">{err}</div>
      ) : invites.length === 0 ? (
        <div className="text-sm text-gray-500">No pending invites.</div>
      ) : (
        <ul className="space-y-3">
          {invites.map(inv => (
            <li key={inv.id} className="rounded-2xl border border-gray-200 bg-gray-50 p-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <div className="text-sm text-gray-900">To: {inv.email ?? '—'}</div>
                  <div className="text-xs text-gray-600">Role {inv.role.toLowerCase()} • Status {inv.status.toLowerCase()} • Expires {new Date(inv.expiresAt).toLocaleString()}</div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => onResend(inv.id)} className="rounded-xl border bg-white px-3 py-1.5 text-xs hover:bg-gray-50">Resend</button>
                  <button onClick={() => onRevoke(inv.id)} className="rounded-xl border bg-white px-3 py-1.5 text-xs hover:bg-gray-50 text-red-600">Revoke</button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-3">
        <button onClick={load} className="rounded-xl border bg-white px-3 py-1.5 text-xs hover:bg-gray-50">Refresh</button>
      </div>
    </Section>
  );
}
