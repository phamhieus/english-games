import type { AppSettings, SessionRecord, VocabularyCollection, VocabularyItem, WordProgress } from '@/types';
import type { GameSetup } from '@/stores/appStore';

/**
 * The account's saved game: everything needed to continue on another device.
 * The DeepSeek API key is deliberately left out — it never leaves this browser — and so is
 * the keyboard choice, which depends on the device (a phone's choice shouldn't reach a laptop).
 */
export type SyncedSettings = Omit<AppSettings, 'deepseekApiKey' | 'screenKeyboard'>;

export interface SyncSnapshot {
  format: 1;
  collections: VocabularyCollection[];
  vocabulary: VocabularyItem[];
  progress: WordProgress[];
  sessions: SessionRecord[];
  settings: SyncedSettings;
  setup: GameSetup;
}

export function toSyncedSettings(s: AppSettings): SyncedSettings {
  const { deepseekApiKey: _secret, screenKeyboard: _device, ...rest } = s;
  return rest;
}

/** Stable fingerprint of a snapshot (to tell whether anything changed since the last sync). */
export async function snapshotHash(s: SyncSnapshot): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(s)));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * A device that has never been played on: only the seeded starter set, no games.
 * Signing in there should simply load the account instead of merging.
 */
export function isPristine(s: SyncSnapshot): boolean {
  return s.sessions.length === 0 && s.progress.length === 0 && s.collections.length <= 1;
}

function mergeBy<T>(a: readonly T[], b: readonly T[], key: (x: T) => string, pick: (x: T, y: T) => T): T[] {
  const map = new Map<string, T>();
  for (const x of a) map.set(key(x), x);
  for (const y of b) {
    const k = key(y);
    const x = map.get(k);
    map.set(k, x === undefined ? y : pick(x, y));
  }
  return [...map.values()];
}

const newer = <T extends { updatedAt: number }>(x: T, y: T) => (y.updatedAt > x.updatedAt ? y : x);

/**
 * Combines two snapshots changed on different devices since their last sync.
 * Words and sets: newest edit wins. Progress: the record with more practice wins.
 * Games: all kept. Purchases: never lost. Game setup: this device's.
 * (Deletions made on only one side can come back in this rare case.)
 */
export function mergeSnapshots(local: SyncSnapshot, remote: SyncSnapshot): SyncSnapshot {
  return {
    format: 1,
    collections: mergeBy(local.collections, remote.collections, (c) => c.id, newer),
    vocabulary: mergeBy(local.vocabulary, remote.vocabulary, (w) => w.id, newer),
    progress: mergeBy(
      local.progress,
      remote.progress,
      (p) => p.vocabularyId,
      (x, y) => (y.attempts > x.attempts || (y.attempts === x.attempts && (y.lastPracticedAt ?? 0) > (x.lastPracticedAt ?? 0)) ? y : x),
    ),
    sessions: mergeBy(
      local.sessions,
      remote.sessions,
      (s) => s.id,
      (x, y) => {
        if (x.status === 'in_progress' && y.status !== 'in_progress') return y;
        if (y.status === 'in_progress' && x.status !== 'in_progress') return x;
        return y.endedAt > x.endedAt ? y : x;
      },
    ),
    settings: {
      ...remote.settings,
      ownedSkins: [...new Set([...local.settings.ownedSkins, ...remote.settings.ownedSkins])],
      coinsSpent: Math.max(local.settings.coinsSpent, remote.settings.coinsSpent),
      achievementsSeen: [...new Set([...local.settings.achievementsSeen, ...remote.settings.achievementsSeen])],
      bossesDefeated: [...new Set([...local.settings.bossesDefeated, ...remote.settings.bossesDefeated])],
    },
    setup: local.setup,
  };
}
