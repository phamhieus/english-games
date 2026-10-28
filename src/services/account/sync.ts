import { getDb } from '@/services/database/db';
import { addSampleCollection } from '@/services/database/seed';
import { DEFAULT_SETTINGS } from '@/features/settings/defaults';
import { useSettingsStore } from '@/stores/settingsStore';
import { DEFAULT_SETUP, useAppStore } from '@/stores/appStore';
import { ApiError, fetchData, putData } from './api';
import { isPristine, mergeSnapshots, snapshotHash, toSyncedSettings, type SyncSnapshot } from './snapshot';

/**
 * Two-way sync between this device and the signed-in account.
 *
 * The server keeps one versioned snapshot. This device remembers which version it last
 * synced and a hash of what it had then:
 *  - only this device changed      → push
 *  - only the account changed      → pull (replace local)
 *  - both changed                  → merge, then push
 * A push names the version it builds on; if another device got there first the server
 * answers 409 and we go round again.
 */

export type SyncOutcome = 'pushed' | 'pulled' | 'merged' | 'up-to-date';

interface SyncMeta {
  version: number;
  hash: string;
}

const metaKey = (userId: string) => `ws-sync:${userId}`;

function readMeta(userId: string): SyncMeta {
  try {
    const raw = localStorage.getItem(metaKey(userId));
    if (raw) return JSON.parse(raw) as SyncMeta;
  } catch {
    /* storage unavailable: behave like a first sync */
  }
  return { version: 0, hash: '' };
}

function writeMeta(userId: string, meta: SyncMeta): void {
  try {
    localStorage.setItem(metaKey(userId), JSON.stringify(meta));
  } catch {
    /* next sync will simply compare again */
  }
}

export function forgetSyncState(userId: string): void {
  try {
    localStorage.removeItem(metaKey(userId));
  } catch {
    /* ignore */
  }
}

export async function buildSnapshot(): Promise<SyncSnapshot> {
  const db = getDb();
  const [collections, vocabulary, progress, sessions] = await Promise.all([
    db.collections.toArray(),
    db.vocabulary.toArray(),
    db.progress.toArray(),
    // Games still being played are saved when they end.
    db.sessions.filter((s) => s.status !== 'in_progress').toArray(),
  ]);
  return {
    format: 1,
    collections,
    vocabulary,
    progress,
    sessions,
    settings: toSyncedSettings(useSettingsStore.getState().settings),
    setup: useAppStore.getState().setup,
  };
}

/** Fills in fields a snapshot from an older app version may not have. */
function normalize(s: SyncSnapshot): SyncSnapshot {
  return {
    ...s,
    settings: { ...toSyncedSettings(DEFAULT_SETTINGS), ...s.settings },
    setup: { ...DEFAULT_SETUP, ...s.setup },
  };
}

/** Replaces this device's data with `s` (the DeepSeek key and the keyboard choice stay as they are). */
async function applySnapshot(s: SyncSnapshot): Promise<void> {
  const db = getDb();
  await db.transaction('rw', [db.collections, db.vocabulary, db.progress, db.sessions], async () => {
    await Promise.all([db.collections.clear(), db.vocabulary.clear(), db.progress.clear(), db.sessions.clear()]);
    await db.collections.bulkPut(s.collections);
    await db.vocabulary.bulkPut(s.vocabulary);
    await db.progress.bulkPut(s.progress);
    await db.sessions.bulkPut(s.sessions);
  });
  const settings = useSettingsStore.getState();
  settings.update({ ...s.settings, deepseekApiKey: settings.settings.deepseekApiKey, screenKeyboard: settings.settings.screenKeyboard });
  useAppStore.getState().updateSetup(s.setup);
}

export async function syncAccount(userId: string): Promise<SyncOutcome> {
  for (let attempt = 0; attempt < 3; attempt++) {
    const meta = readMeta(userId);
    const local = await buildSnapshot();
    const localHash = await snapshotHash(local);
    const remote = await fetchData();
    const localChanged = localHash !== meta.hash;
    try {
      if (remote.version === meta.version) {
        if (!localChanged) return 'up-to-date';
        const saved = await putData(meta.version, local);
        writeMeta(userId, { version: saved.version, hash: localHash });
        return 'pushed';
      }
      if (!remote.data) {
        // The account has nothing yet (or was reset): this device's data becomes the account's.
        const saved = await putData(remote.version, local);
        writeMeta(userId, { version: saved.version, hash: localHash });
        return 'pushed';
      }
      const remoteSnap = normalize(remote.data);
      if (!localChanged || isPristine(local)) {
        await applySnapshot(remoteSnap);
        writeMeta(userId, { version: remote.version, hash: await snapshotHash(await buildSnapshot()) });
        return 'pulled';
      }
      await applySnapshot(mergeSnapshots(local, remoteSnap));
      const merged = await buildSnapshot();
      const saved = await putData(remote.version, merged);
      writeMeta(userId, { version: saved.version, hash: await snapshotHash(merged) });
      return 'merged';
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) continue; // another device saved first: go again
      throw e;
    }
  }
  throw new Error('Another device keeps saving at the same time. Please try again.');
}

/** After signing out: leave this device as a fresh guest (the account keeps everything). */
export async function resetDeviceData(): Promise<void> {
  const db = getDb();
  await db.transaction('rw', [db.collections, db.vocabulary, db.progress, db.sessions], async () => {
    await Promise.all([db.collections.clear(), db.vocabulary.clear(), db.progress.clear(), db.sessions.clear()]);
  });
  useSettingsStore.getState().update({ ...DEFAULT_SETTINGS });
  useAppStore.getState().updateSetup({ ...DEFAULT_SETUP });
  await addSampleCollection();
}
