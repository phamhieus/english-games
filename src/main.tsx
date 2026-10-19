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

const root = document.getElementById('root');
if (!root) throw new Error('Root element missing');

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Not awaited: outside Facebook the SDK never resolves, and the app must still run.
initPlatform().catch((err) => console.warn('[platform] init failed, running standalone', err));
