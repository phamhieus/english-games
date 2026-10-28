import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/fredoka/500.css';
import '@fontsource/fredoka/600.css';
import '@fontsource/fredoka/700.css';
import '@fontsource/nunito/500.css';
import '@fontsource/nunito/600.css';
import '@fontsource/nunito/700.css';
import '@fontsource/nunito/800.css';
import './index.css';
import { App } from '@/app/App';
import { initPlatform } from '@/services/platform/platform';

// After a deploy, a tab still on the old build can't load the old build's lazy chunks (the
// game screen, Phaser) any more. Reload into the new build instead of showing an error —
// at most once a minute, so a real network problem doesn't loop.
window.addEventListener('vite:preloadError', (event) => {
  try {
    const last = Number(sessionStorage.getItem('reloaded-for-chunk') ?? 0);
    if (Date.now() - last < 60_000) return;
    sessionStorage.setItem('reloaded-for-chunk', String(Date.now()));
  } catch {
    /* no storage: reload anyway */
  }
  event.preventDefault();
  window.location.reload();
});

const root = document.getElementById('root');
if (!root) throw new Error('Root element missing');

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Not awaited: outside Facebook the SDK never resolves, and the app must still run.
initPlatform().catch((err) => console.warn('[platform] init failed, running standalone', err));
