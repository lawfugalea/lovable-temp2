import { useCallback, useEffect, useRef, useState } from 'react';

type Options<T> = {
  householdId: string;
  page: string;
  initial?: T;
  debounceMs?: number;
};

export function usePageState<T>({ householdId, page, initial, debounceMs = 300 }: Options<T>) {
  const [state, setState] = useState<T | undefined>(initial);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load once
  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      const qs = new URLSearchParams({ householdId, page }).toString();
      const res = await fetch(`/api/page-state?${qs}`);
      const json = await res.json();
      if (!alive) return;
      if (json?.ok) {
        setState(json.data ?? initial);
      }
      setLoading(false);
    })();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [householdId, page]);

  const persist = useCallback(
    (next: T) => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(async () => {
        setSaving(true);
        await fetch('/api/page-state', {
          method: 'PUT',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ householdId, page, data: next }),
        });
        setSaving(false);
      }, debounceMs);
    },
    [debounceMs, householdId, page]
  );

  const update = useCallback((next: T | ((prev: T | undefined) => T)) => {
    setState((prev) => {
      const value = typeof next === 'function' ? (next as any)(prev) : next;
      persist(value);
      return value;
    });
  }, [persist]);

  return { state, setState: update, loading, saving };
}
