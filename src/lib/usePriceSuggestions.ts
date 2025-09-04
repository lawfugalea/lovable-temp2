// src/lib/usePriceSuggestions.ts
import { useEffect, useState } from 'react';

export type SuggestItem = {
  id: string;
  name: string;
  imageUrl: string | null;
  priceCents: number | null;
  url: string | null;
};

export function usePriceSuggestions(query: string) {
  const [items, setItems] = useState<SuggestItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let abort = false;
    if (!query || query.trim().length < 2) { setItems([]); return; }

    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const r = await fetch(`/api/prices/suggest?q=${encodeURIComponent(query)}`, { credentials: 'include' });
        if (!r.ok) throw new Error(await r.text());
        const data = await r.json();
        if (!abort) setItems(data);
      } catch {
        if (!abort) setItems([]);
      } finally {
        if (!abort) setLoading(false);
      }
    }, 200); // debounce

    return () => { abort = true; clearTimeout(t); };
  }, [query]);

  return { items, loading };
}