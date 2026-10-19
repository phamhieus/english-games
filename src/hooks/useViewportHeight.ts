import { useEffect, useState } from 'react';

/**
 * Keeps `--app-height` / `--app-top` equal to the *visual* viewport, so the app frame
 * (`.app-root`, position: fixed) shrinks to the space above a mobile keyboard instead of
 * being covered by it. iOS also scrolls the page when an input gets focus; following
 * `visualViewport.offsetTop` keeps the whole frame on screen.
 */
export function useViewportHeight(): void {
  useEffect(() => {
    const vv = window.visualViewport;
    const root = document.documentElement.style;
    const apply = () => {
      root.setProperty('--app-height', `${Math.round(vv?.height ?? window.innerHeight)}px`);
      root.setProperty('--app-top', `${Math.round(vv?.offsetTop ?? 0)}px`);
    };
    apply();
    vv?.addEventListener('resize', apply);
    vv?.addEventListener('scroll', apply);
    window.addEventListener('resize', apply);
    return () => {
      vv?.removeEventListener('resize', apply);
      vv?.removeEventListener('scroll', apply);
      window.removeEventListener('resize', apply);
    };
  }, []);
}

/** True when the visible height is short (a phone with the keyboard open, or landscape). */
export function useShortViewport(limit = 560): boolean {
  const read = () => (window.visualViewport?.height ?? window.innerHeight) < limit;
  const [short, setShort] = useState(read);
  useEffect(() => {
    const vv = window.visualViewport;
    const update = () => setShort(read());
    vv?.addEventListener('resize', update);
    window.addEventListener('resize', update);
    return () => {
      vv?.removeEventListener('resize', update);
      window.removeEventListener('resize', update);
    };
  }, [limit]);
  return short;
}
