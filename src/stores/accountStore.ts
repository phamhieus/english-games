import { create } from 'zustand';
import { ApiError, deleteAccount, fetchMe, logout, signInUrl, type AccountUser, type Provider } from '@/services/account/api';
import { forgetSyncState, resetDeviceData, syncAccount, type SyncOutcome } from '@/services/account/sync';

export type AccountStatus = 'loading' | 'signed-out' | 'signed-in' | 'unavailable';
export type SyncState = 'idle' | 'syncing' | 'error';

interface AccountStore {
  status: AccountStatus;
  user: AccountUser | null;
  /** Sign-in methods the server has set up. */
  providers: Provider[];
  sync: SyncState;
  lastSyncedAt: number | null;
  lastOutcome: SyncOutcome | null;
  error: string | null;
  init(): Promise<void>;
  signIn(provider: Provider): void;
  /** Syncs first; returns false (and stays signed in) if unsynced changes would be lost. */
  signOut(force?: boolean): Promise<boolean>;
  deleteAccount(): Promise<void>;
  syncNow(): Promise<void>;
  /** Debounced background sync after local changes. */
  requestSync(): void;
}

const SYNC_DEBOUNCE_MS = 2500;
let debounce: number | undefined;
let inFlight: Promise<void> | null = null;

export const useAccountStore = create<AccountStore>((set, get) => ({
  status: 'loading',
  user: null,
  providers: [],
  sync: 'idle',
  lastSyncedAt: null,
  lastOutcome: null,
  error: null,

  async init() {
    try {
      const { user, providers } = await fetchMe();
      set({ user, providers, status: user ? 'signed-in' : 'signed-out', error: null });
      if (user) await get().syncNow();
    } catch (e) {
      set({ status: e instanceof ApiError && e.status === 503 ? 'unavailable' : 'signed-out', error: null });
    }
  },

  signIn(provider) {
    window.location.assign(signInUrl(provider));
  },

  async signOut(force = false) {
    const { user } = get();
    if (!user) return true;
    await get().syncNow();
    if (get().sync === 'error' && !force) return false;
    try {
      await logout();
    } catch {
      /* the cookie expires on its own */
    }
    forgetSyncState(user.id);
    await resetDeviceData();
    set({ user: null, status: 'signed-out', sync: 'idle', lastSyncedAt: null, lastOutcome: null, error: null });
    return true;
  },

  async deleteAccount() {
    const { user } = get();
    if (!user) return;
    await deleteAccount();
    forgetSyncState(user.id);
    set({ user: null, status: 'signed-out', sync: 'idle', lastSyncedAt: null, lastOutcome: null, error: null });
  },

  async syncNow() {
    const { user } = get();
    if (!user) return;
    if (inFlight) return inFlight;
    window.clearTimeout(debounce);
    set({ sync: 'syncing', error: null });
    inFlight = syncAccount(user.id)
      .then((outcome) => set({ sync: 'idle', lastSyncedAt: Date.now(), lastOutcome: outcome }))
      .catch((e: unknown) => {
        if (e instanceof ApiError && e.status === 401) set({ user: null, status: 'signed-out', sync: 'idle' });
        else set({ sync: 'error', error: e instanceof Error ? e.message : 'Sync failed.' });
      })
      .finally(() => {
        inFlight = null;
      });
    return inFlight;
  },

  requestSync() {
    if (!get().user) return;
    window.clearTimeout(debounce);
    debounce = window.setTimeout(() => void get().syncNow(), SYNC_DEBOUNCE_MS);
  },
}));
