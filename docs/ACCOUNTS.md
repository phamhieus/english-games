# Online accounts (Google / Facebook) on Cloudflare

Word Shooter works offline as a guest. Signing in saves the player's words, games, coins,
skins and achievements to their account so they can continue on any device.

## How it works

- **One Cloudflare Worker** (`worker/`) serves the built app (`dist/`) and the API under `/api/*`
  (`run_worker_first` in `wrangler.jsonc`), so the app and API share one origin.
- **Sign-in** is OAuth 2.0 (authorization code) with Google or Facebook, done on the server:
  client secrets live in Worker secrets and never reach the browser. No passwords are stored.
- **Sessions** are a random token in an `HttpOnly; Secure; SameSite=Lax` cookie; D1 stores only its
  SHA-256 hash. Writes check the `Origin` header.
- **Data** is one gzip-compressed snapshot per account in D1 (`user_data`), versioned. A device
  pushes on top of the version it last saw; if another device saved first the server answers
  `409` and the client merges (`src/services/account/sync.ts`, `snapshot.ts`).
- The DeepSeek API key is **never** synced.
- **Bonus coins** (`users.bonus_coins`) are granted by the server (gifts, test accounts) and
  added to the coins earned in games.

API: `GET /api/me`, `DELETE /api/me` (delete account), `GET|PUT /api/data`,
`GET /api/auth/{google|facebook}/start|callback`, `POST /api/auth/logout`.

## Local development

```bash
cp .dev.vars.example .dev.vars        # DEV_LOGIN=1 enables the local test sign-in
npm run build                         # wrangler dev serves ./dist
npm run db:migrate:local              # create the local D1 tables
npm run dev:api                       # Worker on http://localhost:8787
npm run dev                           # app on http://localhost:5173 (proxies /api)
```

Open **Profile** (the level badge in the header). With `DEV_LOGIN=1` you get two local-only
buttons: **Test player** and **Tester · 50,000 coins** (or open
`http://localhost:5173/api/auth/dev/start?name=Tester&coins=50000`). The dev sign-in only exists
when `DEV_LOGIN=1`, so never set it in production.

## Production setup

1. **Database**

   ```bash
   npx wrangler d1 create word-shooter      # paste the id into wrangler.jsonc → d1_databases
   npm run db:migrate:remote
   ```

2. **Google** — Google Cloud Console → APIs & Services → Credentials → *OAuth client ID* (Web).
   - Authorised redirect URI: `https://<your-domain>/api/auth/google/callback`
   - Configure the OAuth consent screen (scopes: `openid`, `email`, `profile`).

3. **Facebook** — developers.facebook.com → Create app → add **Facebook Login**.
   - Valid OAuth Redirect URI: `https://<your-domain>/api/auth/facebook/callback`
   - Permissions: `public_profile`, `email`. Set the Privacy Policy URL and a data-deletion URL
     (the app's Profile → *Delete account* removes everything stored online).
   - Check the current Graph API version and set `FACEBOOK_GRAPH_VERSION` in `wrangler.jsonc`.

4. **Secrets** (never commit them):

   ```bash
   npx wrangler secret put GOOGLE_CLIENT_ID
   npx wrangler secret put GOOGLE_CLIENT_SECRET
   npx wrangler secret put FACEBOOK_APP_ID
   npx wrangler secret put FACEBOOK_APP_SECRET
   ```

5. **Deploy**: `npm run deploy` (builds the app, then `wrangler deploy`).

Only the providers whose secrets are set show a button in the app.

### Vercel (frontend mirror)

Vercel serves the static app and proxies `/api/*` to the Worker (`vercel.json` rewrites), so
the browser still sees one origin. The Worker trusts that origin through `PROXY_ORIGINS` in
`wrangler.jsonc`; the app sends `?origin=` when signing in, so the OAuth redirect URI and the
session cookie use the Vercel domain. Register both callback URLs with Google/Facebook:
`https://<worker>.workers.dev/api/auth/<provider>/callback` and
`https://<vercel-domain>/api/auth/<provider>/callback`.

```bash
npx vercel deploy --prod      # after changing the Worker URL or adding a custom domain,
                              # update vercel.json and PROXY_ORIGINS, then redeploy both
```

## Limits and known gaps

- A snapshot is capped at ~1.9 MB compressed (D1 row limit); larger libraries get a clear error.
- If two devices edit offline and one deletes a word, a merge can bring it back.
- Google and Facebook sign-ins are separate accounts (no linking by e-mail yet).
- Signing out clears this device back to a fresh guest (the account keeps everything).
