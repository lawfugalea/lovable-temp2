import { useEffect, useState } from 'react';

export function useHouseholdId() {
  const [householdId, setHouseholdId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const qs = new URLSearchParams(window.location.search);
        const hid = qs.get('hid');

        if (hid) {
          // Persist as active globally
          const r = await fetch('/api/household/active', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ householdId: hid }),
          });
          if (!r.ok) throw new Error(await r.text());
          if (!cancelled) { setHouseholdId(hid); setLoading(false); }
          return;
        }

        // Get active (DB-stored) or latest membership
        const g = await fetch('/api/household/active', { credentials: 'include' });
        if (!g.ok) throw new Error(await g.text());
        const j = await g.json();
        if (!cancelled) { setHouseholdId(j.householdId || ''); setLoading(false); }
      } catch (e: any) {
        if (!cancelled) { setError(e?.message || 'Failed to resolve household'); setLoading(false); }
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return { householdId, loading, error };
}

