import type { SessionRecord, VocabularyCollection, VocabularyItem, WordProgress } from '@/types';
import { getDb } from './db';

export interface BackupFile {
  app: 'word-shooter';
  version: 1;
  exportedAt: number;
  collections: VocabularyCollection[];
  vocabulary: VocabularyItem[];
  progress: WordProgress[];
  sessions: SessionRecord[];
}

export async function exportBackup(): Promise<BackupFile> {
  const db = getDb();
  const [collections, vocabulary, progress, sessions] = await Promise.all([
    db.collections.toArray(),
    db.vocabulary.toArray(),
    db.progress.toArray(),
    db.sessions.toArray(),
  ]);
  return { app: 'word-shooter', version: 1, exportedAt: Date.now(), collections, vocabulary, progress, sessions };
}

export function parseBackup(text: string): BackupFile {
  const data = JSON.parse(text) as Partial<BackupFile>;
  if (data.app !== 'word-shooter' || data.version !== 1) throw new Error('This is not a Word Shooter backup file.');
  for (const key of ['collections', 'vocabulary', 'progress', 'sessions'] as const) {
    if (!Array.isArray(data[key])) throw new Error(`Backup is missing "${key}".`);
  }
  return data as BackupFile;
}

/** Restores a backup. Merge keeps existing data and overwrites rows with the same id. */
export async function importBackup(backup: BackupFile, mode: 'merge' | 'replace'): Promise<void> {
  const db = getDb();
  await db.transaction('rw', [db.collections, db.vocabulary, db.progress, db.sessions], async () => {
    if (mode === 'replace') {
      await Promise.all([db.collections.clear(), db.vocabulary.clear(), db.progress.clear(), db.sessions.clear()]);
    }
    await db.collections.bulkPut(backup.collections);
    await db.vocabulary.bulkPut(backup.vocabulary);
    await db.progress.bulkPut(backup.progress);
    await db.sessions.bulkPut(backup.sessions);
  });
}
