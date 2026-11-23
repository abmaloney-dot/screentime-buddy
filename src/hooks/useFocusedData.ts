import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { onClockChange } from '@/lib/clock';

/**
 * Loads data when the screen gains focus, when `key` changes, when the app
 * returns to the foreground (screen time keeps growing while we're away), and
 * when the dev clock jumps.
 */
export function useFocusedData<T>(key: string, load: () => Promise<T>) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Always call the latest `load` without making it a dependency.
  const loadRef = useRef(load);
  useEffect(() => {
    loadRef.current = load;
  });

  // Only the newest request may update state, so a slow load for a previous
  // `key` (e.g. after tapping through days quickly) can't overwrite a newer one.
  const latestRequest = useRef(0);
  const reload = useCallback(async () => {
    const request = ++latestRequest.current;
    try {
      const value = await loadRef.current();
      if (request !== latestRequest.current) return;
      setData(value);
      setError(null);
    } catch (e) {
      if (request !== latestRequest.current) return;
      setError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload]),
  );

  // The focus effect already covers the first load; only react to later key changes.
  const loadedKey = useRef(key);
  useEffect(() => {
    if (loadedKey.current === key) return;
    loadedKey.current = key;
    reload();
  }, [key, reload]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') reload();
    });
    const offClock = onClockChange(reload); // dev time skips
    return () => {
      sub.remove();
      offClock();
    };
  }, [reload]);

  return { data, error, reload };
}
