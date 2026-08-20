// src/hooks/usePageState.ts
import { useCallback, useEffect, useRef, useState } from 'react';

type UsePageStateOptions<T> = {
  householdId: string;              // must be a real household the viewer belongs to
  page: string;                     // e.g., 'finances'
  initial: T;                       // initial shape/value (used until server responds)
  saveDelayMs?: number;             // debounce for saves (default 800ms)
  localKey?: string;                // optional localStorage cache key (e.g. 'houseflow_finance_v4')
};

type UsePageStateReturn<T> = {
  value: T;
  setValue: (next: T | ((prev: T) => T)) => void;
  loading: boolean;                 // true while the first GET is in flight
  saving: boolean;                  // true while a PUT is in flight (or queued)
  error: string | null;             // last error (GET/PUT)
  saveNow: () => void;              // flush the debounced save immediately
};

export function usePageState<T>(opts: UsePageStateOptions<T>): UsePageStateReturn<T> {
  const { householdId, page, initial, saveDelayMs = 800, localKey } = opts;

  // ---- state
  const [value, _setValue] = useState<T>(initial);
  const [loading, setLoading] = useState<boolean>(!!householdId); // if we have an HID we'll load
  const [saving, setSaving]   = useState<boolean>(false);
  const [error, setError]     = useState<string | null>(null);

  // ---- refs
  const mountedRef        = useRef<boolean>(false);
  const timerRef          = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inFlightRef       = useRef<boolean>(false);
  const lastSavedJsonRef  = useRef<string>(JSON.stringify(initial));
  const didHydrateRef     = useRef<boolean>(false);
  const updatedAtRef      = useRef<string | null>(null);
  const hidRef            = useRef<string>(householdId);
  const pageRef           = useRef<string>(page);
  const abortRef          = useRef<AbortController | null>(null);

  // ---- read from localStorage cache (if provided)
  useEffect(() => {
    if (!localKey) return;
    try {
      const raw = localStorage.getItem(localKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        _setValue(parsed);
        lastSavedJsonRef.current = JSON.stringify(parsed);
      }
    } catch { /* ignore */ }
  }, [localKey]);

  // ---- doSave (PUT)
  const doSave = useCallback(async (data: T) => {
    if (!mountedRef.current || !householdId || !page) { setSaving(false); return; }
    const json = JSON.stringify(data);
    if (json === lastSavedJsonRef.current) { setSaving(false); return; } // no changes

    if (inFlightRef.current) {
      // If a save is currently in flight, queue the newest state.
      timerRef.current = setTimeout(() => { void doSave(data); }, 200);
      return;
    }

    inFlightRef.current = true;
    setError(null);
    try {
      const res = await fetch('/api/page-state', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ householdId, page, data, expectedUpdatedAt: updatedAtRef.current }),
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => null);
        throw new Error(payload?.error || `Save failed (${res.status})`);
      }

      const payload = await res.json();
      updatedAtRef.current = payload.updatedAt ?? updatedAtRef.current;
      lastSavedJsonRef.current = json;
    } catch (e: any) {
      setError(e?.message || 'Failed to save');
    } finally {
      inFlightRef.current = false;
      setSaving(false);
    }
  }, [householdId, page]);

  // ---- helper: schedule save
  const scheduleSave = useCallback((data: T) => {
    if (!householdId || !page) return; // nothing to do
    if (timerRef.current) clearTimeout(timerRef.current);
    setSaving(true);
    timerRef.current = setTimeout(async () => {
      timerRef.current = null;
      await doSave(data);
    }, Math.max(0, saveDelayMs));
  }, [doSave, householdId, page, saveDelayMs]);

  // ---- public setValue (updates local + schedules save)
  const setValue = useCallback((next: T | ((prev: T) => T)) => {
    _setValue(prev => {
      const n = typeof next === 'function' ? (next as (p: T) => T)(prev) : next;

      // cache to localStorage if asked
      if (localKey) {
        try { localStorage.setItem(localKey, JSON.stringify(n)); } catch { /* ignore */ }
      }

      // schedule a save if we are already hydrated from server (to avoid flicker during initial GET)
      if (didHydrateRef.current && householdId && page) {
        scheduleSave(n);
      }

      return n;
    });
  }, [householdId, page, localKey, scheduleSave]);

  // ---- saveNow (flush debounce)
  const saveNow = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    void doSave(value);
  }, [doSave, value]);

  // ---- initial load (GET) whenever hid/page changes
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
      if (abortRef.current) { abortRef.current.abort(); abortRef.current = null; }
    };
  }, []);

  useEffect(() => {
    const hidChanged = hidRef.current !== householdId;
    const pageChanged = pageRef.current !== page;
    if (!householdId || !page) {
      setLoading(false);
      return;
    }

    // reset lifecycle flags when context changes
    if (hidChanged || pageChanged) {
      didHydrateRef.current = false;
      updatedAtRef.current = null;
      hidRef.current = householdId;
      pageRef.current = page;
    }

    // abort any in-flight GET
    if (abortRef.current) { abortRef.current.abort(); }
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);

    (async () => {
      try {
        const res = await fetch(
          `/api/page-state?householdId=${encodeURIComponent(householdId)}&page=${encodeURIComponent(page)}`,
          { method: 'GET', credentials: 'include', signal: controller.signal }
        );

        if (!res.ok) {
          const text = await res.text().catch(() => '');
          throw new Error(text || `Load failed (${res.status})`);
        }

        const j = await res.json().catch(() => ({}));
        const serverData = (j?.data ?? null) as T | null;
        updatedAtRef.current = typeof j?.updatedAt === 'string' ? j.updatedAt : null;

        // If server has no data yet, keep current local state (from initial or localStorage)
        if (serverData && mountedRef.current) {
          _setValue(serverData);
          lastSavedJsonRef.current = JSON.stringify(serverData);
        } else {
          // keep local value as source of truth (and lastSaved tracks it)
          lastSavedJsonRef.current = JSON.stringify(value);
        }

        didHydrateRef.current = true;
      } catch (e: any) {
        if (controller.signal.aborted) return;
        setError(e?.message || 'Failed to load');
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();

    return () => {
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [householdId, page]);

  // ---- also persist to localStorage whenever value changes (best-effort)
  useEffect(() => {
    if (!localKey) return;
    try { localStorage.setItem(localKey, JSON.stringify(value)); } catch { /* ignore */ }
  }, [localKey, value]);

  return { value, setValue, loading, saving, error, saveNow };
}

export default usePageState;
