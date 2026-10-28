/// <reference types="vitest/config" />
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath, URL } from 'node:url';

const FB_SDK_URL = 'https://connect.facebook.net/en_US/fbinstant.8.0.js';

/** Facebook Instant Game build: loads the SDK and emits fbapp-config.json next to index.html. */
function fbInstant(): Plugin {
  return {
    name: 'fb-instant',
    transformIndexHtml: () => [{ tag: 'script', attrs: { src: FB_SDK_URL }, injectTo: 'head-prepend' }],
    generateBundle() {
      const config = {
        instant_games: {
          platform_version: 'RICH_GAMEPLAY',
          navigation_menu_version: 'NAV_FLOATING',
          orientation: 'PORTRAIT',
          override_web_orientation: 'LANDSCAPE',
        },
      };
      this.emitFile({ type: 'asset', fileName: 'fbapp-config.json', source: JSON.stringify(config, null, 2) });
    },
  };
}

/**
 * Emits version.json with this build's id. Open games poll it and reload when a newer
 * build is deployed (see useUpdateReload).
 */
function buildVersion(id: string): Plugin {
  return {
    name: 'build-version',
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'version.json', source: JSON.stringify({ id }) });
    },
  };
}

export default defineConfig(({ mode }) => {
  const isFb = mode === 'fbinstant';
  const buildId = Date.now().toString(36);
  return {
    // Instant Games are served from a sub-path, so asset URLs must be relative.
    base: isFb ? './' : '/',
    plugins: [react(), tailwindcss(), ...(isFb ? [fbInstant()] : [buildVersion(buildId)])],
    define: { 'import.meta.env.VITE_BUILD_ID': JSON.stringify(buildId) },
    resolve: {
      alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
    },
    build: {
      outDir: isFb ? 'dist-fb' : 'dist',
      chunkSizeWarningLimit: 1600,
    },
    // Account API: run `npm run dev:api` (wrangler dev) alongside `npm run dev`.
    server: {
      proxy: { '/api': 'http://localhost:8787' },
    },
    test: {
      environment: 'node',
      include: ['tests/unit/**/*.test.ts'],
    },
  };
});
