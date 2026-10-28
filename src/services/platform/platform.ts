/**
 * Platform bootstrap. The same app ships as a standalone website and as a
 * Facebook Instant Game; the target is chosen at build time with
 * `vite build --mode fbinstant`, which also injects the FBInstant SDK script.
 */

interface FBInstantSDK {
  initializeAsync(): Promise<void>;
  setLoadingProgress(percentage: number): void;
  startGameAsync(): Promise<void>;
}

declare global {
  interface Window {
    FBInstant?: FBInstantSDK;
  }
}

export const isFacebookInstant = import.meta.env.MODE === 'fbinstant';

/** Tells Facebook the game is ready so it hides its loading screen. */
export async function initPlatform(): Promise<void> {
  if (!isFacebookInstant) return;
  const sdk = window.FBInstant;
  if (!sdk) {
    // Opened outside Facebook (e.g. local preview of the fbinstant build): run as plain web.
    console.warn('[platform] FBInstant SDK not found, running standalone');
    return;
  }
  await sdk.initializeAsync();
  sdk.setLoadingProgress(100);
  await sdk.startGameAsync();
}
