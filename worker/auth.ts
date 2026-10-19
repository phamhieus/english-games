import { appOrigin, base64url, cookie, error, hmacSha256Hex, readCookie, redirect, randomToken, safeEqual, sha256Hex, trustedOrigins } from './http';

/**
 * Sign-in with Google or Facebook (OAuth 2.0 authorization-code flow, done on the server so
 * client secrets never reach the browser), plus cookie sessions.
 *
 *   GET  /api/auth/:provider/start     → redirect to the provider
 *   GET  /api/auth/:provider/callback  → create/update the user, set the session cookie
 *   POST /api/auth/logout
 */

export type Provider = 'google' | 'facebook' | 'dev';

export interface User {
  id: string;
  provider: Provider;
  name: string;
  avatarUrl: string | null;
  createdAt: number;
  /** Coins granted to the account on top of what games earn. */
  bonusCoins: number;
}

interface Profile {
  providerUserId: string;
  name: string;
  email: string | null;
  avatarUrl: string | null;
}

const SESSION_COOKIE = 'ws_session';
const STATE_COOKIE = 'ws_oauth';
const SESSION_DAYS = 30;
const DAY_MS = 86_400_000;

const callbackUrl = (origin: string, provider: Provider) => `${origin}/api/auth/${provider}/callback`;

async function pkceChallenge(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
  return base64url(new Uint8Array(digest));
}

// ── Providers ────────────────────────────────────────────────────────────────

async function authorizeUrl(provider: 'google' | 'facebook', redirectUri: string, env: Env, state: string, verifier: string): Promise<string> {
  if (provider === 'google') {
    const u = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    u.search = new URLSearchParams({
      client_id: env.GOOGLE_CLIENT_ID,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'openid email profile',
      state,
      code_challenge: await pkceChallenge(verifier),
      code_challenge_method: 'S256',
      prompt: 'select_account',
    }).toString();
    return u.toString();
  }
  const u = new URL(`https://www.facebook.com/${env.FACEBOOK_GRAPH_VERSION}/dialog/oauth`);
  u.search = new URLSearchParams({
    client_id: env.FACEBOOK_APP_ID,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'public_profile,email',
    state,
  }).toString();
  return u.toString();
}

async function googleProfile(code: string, verifier: string, redirectUri: string, env: Env): Promise<Profile> {
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
      code_verifier: verifier,
    }),
  });
  if (!tokenRes.ok) throw new Error(`google token ${tokenRes.status}`);
  const { access_token } = await tokenRes.json<{ access_token: string }>();
  const infoRes = await fetch('https://openidconnect.googleapis.com/v1/userinfo', { headers: { Authorization: `Bearer ${access_token}` } });
  if (!infoRes.ok) throw new Error(`google userinfo ${infoRes.status}`);
  const info = await infoRes.json<{ sub: string; name?: string; email?: string; picture?: string }>();
  return { providerUserId: info.sub, name: info.name || 'Player', email: info.email ?? null, avatarUrl: info.picture ?? null };
}

async function facebookProfile(code: string, redirectUri: string, env: Env): Promise<Profile> {
  const v = env.FACEBOOK_GRAPH_VERSION;
  const tokenUrl = new URL(`https://graph.facebook.com/${v}/oauth/access_token`);
  tokenUrl.search = new URLSearchParams({
    client_id: env.FACEBOOK_APP_ID,
    client_secret: env.FACEBOOK_APP_SECRET,
    redirect_uri: redirectUri,
    code,
  }).toString();
  const tokenRes = await fetch(tokenUrl);
  if (!tokenRes.ok) throw new Error(`facebook token ${tokenRes.status}`);
  const { access_token } = await tokenRes.json<{ access_token: string }>();
  const meUrl = new URL(`https://graph.facebook.com/${v}/me`);
  meUrl.search = new URLSearchParams({
    fields: 'id,name,email,picture.width(128).height(128)',
    access_token,
    appsecret_proof: await hmacSha256Hex(env.FACEBOOK_APP_SECRET, access_token),
  }).toString();
  const meRes = await fetch(meUrl);
  if (!meRes.ok) throw new Error(`facebook me ${meRes.status}`);
  const me = await meRes.json<{ id: string; name?: string; email?: string; picture?: { data?: { url?: string } } }>();
  return { providerUserId: me.id, name: me.name || 'Player', email: me.email ?? null, avatarUrl: me.picture?.data?.url ?? null };
}

function providerConfigured(provider: Provider, env: Env): boolean {
  if (provider === 'google') return !!env.GOOGLE_CLIENT_ID && !!env.GOOGLE_CLIENT_SECRET;
  if (provider === 'facebook') return !!env.FACEBOOK_APP_ID && !!env.FACEBOOK_APP_SECRET;
  return env.DEV_LOGIN === '1';
}

/** Which sign-in buttons the app should show. */
export function availableProviders(env: Env): Provider[] {
  return (['google', 'facebook', 'dev'] as const).filter((p) => providerConfigured(p, env));
}

// ── Users & sessions ────────────────────────────────────────────────────────

async function upsertUser(env: Env, provider: Provider, p: Profile): Promise<string> {
  const now = Date.now();
  const row = await env.DB.prepare(
    `INSERT INTO users (id, provider, provider_user_id, name, email, avatar_url, created_at, last_login_at)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?7)
     ON CONFLICT (provider, provider_user_id)
     DO UPDATE SET name = excluded.name, email = excluded.email, avatar_url = excluded.avatar_url, last_login_at = excluded.last_login_at
     RETURNING id`,
  )
    .bind(crypto.randomUUID(), provider, p.providerUserId, p.name.slice(0, 80), p.email, p.avatarUrl, now)
    .first<{ id: string }>();
  if (!row) throw new Error('user upsert failed');
  return row.id;
}

async function startSession(env: Env, userId: string, ctx: ExecutionContext): Promise<string> {
  const token = randomToken();
  const now = Date.now();
  await env.DB.prepare('INSERT INTO auth_sessions (token_hash, user_id, created_at, expires_at) VALUES (?1, ?2, ?3, ?4)')
    .bind(await sha256Hex(token), userId, now, now + SESSION_DAYS * DAY_MS)
    .run();
  // Housekeeping off the critical path.
  ctx.waitUntil(env.DB.prepare('DELETE FROM auth_sessions WHERE expires_at < ?1').bind(now).run());
  return cookie(SESSION_COOKIE, token, { maxAge: SESSION_DAYS * 86_400 });
}

/** The signed-in user for this request, or null. */
export async function currentUser(request: Request, env: Env): Promise<User | null> {
  const token = readCookie(request, SESSION_COOKIE);
  if (!token) return null;
  const row = await env.DB.prepare(
    `SELECT u.id, u.provider, u.name, u.avatar_url, u.created_at, u.bonus_coins
     FROM auth_sessions s JOIN users u ON u.id = s.user_id
     WHERE s.token_hash = ?1 AND s.expires_at > ?2`,
  )
    .bind(await sha256Hex(token), Date.now())
    .first<{ id: string; provider: Provider; name: string; avatar_url: string | null; created_at: number; bonus_coins: number }>();
  return row
    ? { id: row.id, provider: row.provider, name: row.name, avatarUrl: row.avatar_url, createdAt: row.created_at, bonusCoins: row.bonus_coins }
    : null;
}

// ── Routes ──────────────────────────────────────────────────────────────────

export async function handleAuth(request: Request, env: Env, ctx: ExecutionContext, parts: string[]): Promise<Response> {
  const [provider, action] = parts as [string | undefined, string | undefined];
  const home = appOrigin(request, env);

  if (provider === 'logout' && request.method === 'POST') {
    const token = readCookie(request, SESSION_COOKIE);
    if (token) await env.DB.prepare('DELETE FROM auth_sessions WHERE token_hash = ?1').bind(await sha256Hex(token)).run();
    return new Response(null, { status: 204, headers: { 'Set-Cookie': cookie(SESSION_COOKIE, '', { maxAge: 0 }) } });
  }

  if (provider !== 'google' && provider !== 'facebook' && provider !== 'dev') return error(404, 'Unknown sign-in provider.');
  if (!providerConfigured(provider, env)) return error(404, 'This sign-in method is not set up.');
  if (request.method !== 'GET') return error(405, 'Method not allowed.');

  // Local development only: sign in as a named test user without any provider,
  // optionally with test coins (?coins=50000).
  if (provider === 'dev') {
    if (action !== 'start') return error(404, 'Not found.');
    const params = new URL(request.url).searchParams;
    const name = (params.get('name') || 'Test player').slice(0, 40);
    const userId = await upsertUser(env, 'dev', { providerUserId: name.toLowerCase(), name, email: null, avatarUrl: null });
    const coins = Number(params.get('coins'));
    if (Number.isInteger(coins) && coins > 0 && coins <= 1_000_000) {
      await env.DB.prepare('UPDATE users SET bonus_coins = ?2 WHERE id = ?1').bind(userId, coins).run();
    }
    return redirect(`${home}/?signedIn=1`, [await startSession(env, userId, ctx)]);
  }

  // The app may be served from a proxy (e.g. Vercel → this Worker): it sends its origin, and the
  // whole sign-in (redirect URI, cookies, return page) then happens on that origin.
  const allowed = (o: string | null | undefined): o is string => !!o && trustedOrigins(request, env).includes(o);

  if (action === 'start') {
    const from = new URL(request.url).searchParams.get('origin');
    const origin = allowed(from) ? from : home;
    const state = randomToken(16);
    const verifier = randomToken(32);
    const stateCookie = cookie(STATE_COOKIE, `${provider}.${state}.${verifier}.${origin}`, { maxAge: 600, path: '/api/auth' });
    return redirect(await authorizeUrl(provider, callbackUrl(origin, provider), env, state, verifier), [stateCookie]);
  }

  if (action === 'callback') {
    const url = new URL(request.url);
    const clearState = cookie(STATE_COOKIE, '', { maxAge: 0, path: '/api/auth' });
    // provider.state.verifier.origin — state and verifier are base64url, so only the origin has dots.
    const [savedProvider, savedState, verifier, ...rest] = (readCookie(request, STATE_COOKIE) ?? '').split('.');
    const savedOrigin = rest.join('.');
    const origin = allowed(savedOrigin) ? savedOrigin : home;
    const fail = (reason: string) => redirect(`${origin}/?signInError=${encodeURIComponent(reason)}`, [clearState]);
    if (url.searchParams.get('error')) return fail('cancelled');
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    if (!code || !state || savedProvider !== provider || !savedState || !verifier || !safeEqual(state, savedState)) return fail('expired');
    try {
      const redirectUri = callbackUrl(origin, provider);
      const profile = provider === 'google' ? await googleProfile(code, verifier, redirectUri, env) : await facebookProfile(code, redirectUri, env);
      const userId = await upsertUser(env, provider, profile);
      return redirect(`${origin}/?signedIn=1`, [clearState, await startSession(env, userId, ctx)]);
    } catch (e) {
      console.error(JSON.stringify({ msg: 'sign-in failed', provider, error: e instanceof Error ? e.message : String(e) }));
      return fail('failed');
    }
  }

  return error(404, 'Not found.');
}
