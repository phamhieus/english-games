import Dexie, { type EntityTable } from 'dexie';
import type {
  AppSettings,
  SessionRecord,
  VocabularyCollection,
  VocabularyItem,
  WordProgress,
} from '@/types';

export interface SettingsRow {
  key: string;
  value: AppSettings | boolean | string | number;
}

export type WordShooterDB = Dexie & {
  collections: EntityTable<VocabularyCollection, 'id'>;
  vocabulary: EntityTable<VocabularyItem, 'id'>;
  progress: EntityTable<WordProgress, 'vocabularyId'>;
  sessions: EntityTable<SessionRecord, 'id'>;
  settings: EntityTable<SettingsRow, 'key'>;
};

export const DB_NAME = 'word-shooter';

/**
 * Schema versions. To change the schema, add a new `db.version(n)` block below with
 * the full new store definition plus an `.upgrade(tx => …)` to migrate existing
 * rows. Never edit a released version in place — Dexie migrates users step by step.
 */
export function defineSchema(db: Dexie): void {
  db.version(1).stores({
    collections: 'id, name, updatedAt',
    vocabulary: 'id, collectionId, english, updatedAt',
    progress: 'vocabularyId, nextReviewAt, masteryScore',
    sessions: 'id, startedAt, collectionId, status',
    settings: 'key',
  });
}

function createDb(options?: ConstructorParameters<typeof Dexie>[1]): WordShooterDB {
  const db = new Dexie(DB_NAME, options) as WordShooterDB;
  defineSchema(db);
  return db;
}

let instance: WordShooterDB | null = null;
let persistent = true;

/** Whether data is saved in the browser (false = in-memory fallback). */
export function isPersistent(): boolean {
  return persistent;
}

/**
 * Opens IndexedDB. If it's unavailable (private mode, disabled storage, corrupted
 * DB), falls back to an in-memory implementation so the game stays playable.
 */
export async function openDatabase(): Promise<WordShooterDB> {
  if (instance) return instance;
  try {
    if (typeof indexedDB === 'undefined') throw new Error('IndexedDB not available');
    const db = createDb();
    await db.open();
    instance = db;
    persistent = true;
  } catch (err) {
    console.warn('[db] IndexedDB unavailable, using in-memory storage', err);
    const fake = await import('fake-indexeddb');
    const db = createDb({ indexedDB: new fake.IDBFactory(), IDBKeyRange: fake.IDBKeyRange });
    await db.open();
    instance = db;
    persistent = false;
  }
  return instance;
}

export function getDb(): WordShooterDB {
  if (!instance) throw new Error('Database not opened yet — call openDatabase() first');
  return instance;
}

/** Test helper: use a specific Dexie instance. */
export function setDbForTesting(db: WordShooterDB | null): void {
  instance = db;
  persistent = true;
}

export function createDbForTesting(name: string, options: ConstructorParameters<typeof Dexie>[1]): WordShooterDB {
  const db = new Dexie(name, options) as WordShooterDB;
  defineSchema(db);
  return db;
}
