/** Small HTTP helpers shared by the API routes. */

export function json(body: unknown, init: ResponseInit = {}): Response {
  const headers = new Headers(init.headers);
  headers.set('Content-Type', 'application/json; charset=utf-8');
  headers.set('Cache-Control', 'no-store');
  return new Response(JSON.stringify(body), { ...init, headers });
}

export function error(status: number, message: string): Response {
  return json({ error: message }, { status });
}

export function redirect(location: string, cookies: string[] = []): Response {
  const headers = new Headers({ Location: location, 'Cache-Control': 'no-store' });
  for (const c of cookies) headers.append('Set-Cookie', c);
  return new Response(null, { status: 302, headers });
}

export function readCookie(request: Request, name: string): string | null {
  const header = request.headers.get('Cookie');
  if (!header) return null;
  for (const part of header.split(';')) {
    const eq = part.indexOf('=');
    if (eq > 0 && part.slice(0, eq).trim() === name) return decodeURIComponent(part.slice(eq + 1).trim());
  }
  return null;
}

export function cookie(name: string, value: string, opts: { maxAge: number; path?: string }): string {
  return `${name}=${encodeURIComponent(value)}; Path=${opts.path ?? '/'}; Max-Age=${opts.maxAge}; HttpOnly; Secure; SameSite=Lax`;
}

/** Public origin of the app (APP_ORIGIN overrides it in local dev, where Vite proxies /api). */
export function appOrigin(request: Request, env: Env): string {
  return env.APP_ORIGIN || new URL(request.url).origin;
}

/**
 * Origins allowed to use the API: our own, plus PROXY_ORIGINS (comma-separated), the sites that
 * proxy /api/* to this Worker (e.g. the Vercel deployment).
 */
export function trustedOrigins(request: Request, env: Env): string[] {
  const proxies = (env.PROXY_ORIGINS ?? '').split(',').map((o) => o.trim()).filter(Boolean);
  return [appOrigin(request, env), new URL(request.url).origin, ...proxies];
}

/**
 * Blocks cross-site writes: browsers send Origin on POST/PUT/DELETE, and it must be ours.
 * (Session cookies are also SameSite=Lax, so other sites can't use them for writes anyway.)
 */
export function sameOrigin(request: Request, env: Env): boolean {
  const origin = request.headers.get('Origin');
  return origin === null || trustedOrigins(request, env).includes(origin);
}

/** Reads a request body as text, refusing anything larger than `maxBytes` without buffering it all. */
export async function readBody(request: Request, maxBytes: number): Promise<string | null> {
  const declared = Number(request.headers.get('Content-Length') ?? '0');
  if (declared > maxBytes) return null;
  if (!request.body) return '';
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  const all = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) {
    all.set(c, offset);
    offset += c.byteLength;
  }
  return new TextDecoder().decode(all);
}

export function base64url(bytes: Uint8Array): string {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function randomToken(bytes = 32): string {
  return base64url(crypto.getRandomValues(new Uint8Array(bytes)));
}

export async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function hmacSha256Hex(key: string, message: string): Promise<string> {
  const k = await crypto.subtle.importKey('raw', new TextEncoder().encode(key), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', k, new TextEncoder().encode(message));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Constant-time string comparison (for state values). */
export function safeEqual(a: string, b: string): boolean {
  const x = new TextEncoder().encode(a);
  const y = new TextEncoder().encode(b);
  if (x.byteLength !== y.byteLength) return false;
  return crypto.subtle.timingSafeEqual(x, y);
}
