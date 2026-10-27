import { useCallback, useEffect, useState } from 'react';
import { localStore } from './localStore';
import type { DataStore } from './store';
import { createSupabaseStore, supabase } from './supabaseStore';
import type { AppData } from './types';

export const store: DataStore = supabase ? createSupabaseStore(supabase) : localStore;

export function useAppData(enabled: boolean) {
  const [data, setData] = useState<AppData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      setData(await store.load());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    void reload();
    // Pick up the other person's uploads when the app comes back to the foreground.
    const onVisible = () => document.visibilityState === 'visible' && void reload();
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [enabled, reload]);

  /** Runs a store mutation and reloads afterwards. */
  const mutate = useCallback(
    async <T,>(fn: (s: DataStore) => Promise<T>): Promise<T> => {
      const result = await fn(store);
      await reload();
      return result;
    },
    [reload],
  );

  return { data, error, reload, mutate };
}
