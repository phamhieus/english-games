import { useEffect, useState } from 'react';
import { isFacebookInstant } from '@/services/platform/platform';

const CHECK_EVERY_MS = 2 * 60_000;

/**
 * Reloads the page when a newer build has been deployed, so open games pick up fixes
 * without the player doing anything. The check runs every few minutes and whenever the
 * tab comes back to the front; the reload waits until `canReload` (not mid-game).
 * Off in dev and in the Instant Game build (Facebook hosts that one).
 */
export function useUpdateReload(canReload: boolean): void {
  const [outdated, setOutdated] = useState(false);

  useEffect(() => {
    if (import.meta.env.DEV || isFacebookInstant) return;
    const current = import.meta.env.VITE_BUILD_ID as string;
    let stopped = false;
    const check = async () => {
      if (stopped || document.visibilityState !== 'visible') return;
      try {
        const res = await fetch(`/version.json?t=${Date.now()}`, { cache: 'no-store' });
        if (!res.ok) return;
        const { id } = (await res.json()) as { id?: string };
        if (id && id !== current && !stopped) setOutdated(true);
      } catch {
        /* offline: try again later */
      }
    };
    void check();
    const timer = window.setInterval(() => void check(), CHECK_EVERY_MS);
    const onVisible = () => void check();
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);
    return () => {
      stopped = true;
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
    };
  }, []);

  useEffect(() => {
    if (outdated && canReload) window.location.reload();
  }, [outdated, canReload]);
}
