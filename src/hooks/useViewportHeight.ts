import { useEffect } from 'react';

/**
 * Keeps `--app-height` equal to the *visual* viewport height, so the layout
 * shrinks (instead of being covered) when a mobile keyboard opens.
 */
export function useViewportHeight(): void {
  useEffect(() => {
    const vv = window.visualViewport;
    const apply = () => {
      const h = vv?.height ?? window.innerHeight;
      document.documentElement.style.setProperty('--app-height', `${Math.round(h)}px`);
    };
    apply();
    vv?.addEventListener('resize', apply);
    window.addEventListener('resize', apply);
    return () => {
      vv?.removeEventListener('resize', apply);
      window.removeEventListener('resize', apply);
    };
  }, []);
}
