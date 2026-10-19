import type { SyncSnapshot } from './snapshot';

/** Client for the Worker's /api routes (same origin; the session is an HttpOnly cookie). */

export type Provider = 'google' | 'facebook' | 'dev';

export interface AccountUser {
  id: string;
  provider: Provider;
  name: string;
  avatarUrl: string | null;
  createdAt: number;
  /** Coins granted to the account (gifts, test accounts) on top of game earnings. */
  bonusCoins: number;
}

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly body: Record<string, unknown> = {},
  ) {
    super(message);
  }
}

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, { ...init, credentials: 'same-origin', headers: { 'Content-Type': 'application/json', ...init.headers } });
  } catch {
    throw new ApiError(0, 'You are offline.');
  }
  if (res.status === 204) return undefined as T;
  const type = res.headers.get('Content-Type') ?? '';
  // Without the Worker (e.g. plain `vite` or static hosting) /api returns the app's HTML.
  if (!type.includes('application/json')) throw new ApiError(503, 'Online accounts are not available here.');
  const body = (await res.json()) as Record<string, unknown>;
  if (!res.ok) throw new ApiError(res.status, typeof body.error === 'string' ? body.error : `Request failed (${res.status}).`, body);
  return body as T;
}

export const fetchMe = () => call<{ user: AccountUser | null; providers: Provider[] }>('/api/me');

export const fetchData = () => call<{ version: number; updatedAt: number | null; data: SyncSnapshot | null }>('/api/data');

export const putData = (baseVersion: number, data: SyncSnapshot) =>
  call<{ version: number; updatedAt: number }>('/api/data', { method: 'PUT', body: JSON.stringify({ baseVersion, data }) });

export const logout = () => call<void>('/api/auth/logout', { method: 'POST' });

export const deleteAccount = () => call<void>('/api/me', { method: 'DELETE' });

/** Sign-in is a full-page redirect through the provider. */
// The origin tells the Worker where to return when the app is served through a proxy (Vercel).
export const signInUrl = (provider: Provider) => `/api/auth/${provider}/start?origin=${encodeURIComponent(window.location.origin)}`;
