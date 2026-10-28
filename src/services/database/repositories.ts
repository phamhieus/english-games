import type {
  SessionRecord,
  VocabularyCollection,
  VocabularyItem,
  WordProgress,
} from '@/types';
import { createId } from '@/utils/id';
import { normalizeAnswer } from '@/utils/text';
import { getDb } from './db';

// ── Collections ─────────────────────────────────────────────────────────────

export async function createCollection(name: string, description?: string): Promise<VocabularyCollection> {
  const now = Date.now();
  const c: VocabularyCollection = { id: createId(), name: name.trim(), description, createdAt: now, updatedAt: now };
  await getDb().collections.add(c);
  return c;
}

export async function renameCollection(id: string, name: string): Promise<void> {
  await getDb().collections.update(id, { name: name.trim(), updatedAt: Date.now() });
}

/**
 * Deletes a collection, its words and their progress. Session history is kept
 * (it stores a snapshot of the collection name).
 */
export async function deleteCollection(id: string): Promise<void> {
  const db = getDb();
  await db.transaction('rw', db.collections, db.vocabulary, db.progress, async () => {
    const ids = (await db.vocabulary.where('collectionId').equals(id).primaryKeys()) as string[];
    await db.progress.bulkDelete(ids);
    await db.vocabulary.bulkDelete(ids);
    await db.collections.delete(id);
  });
}

export async function listCollections(): Promise<VocabularyCollection[]> {
  return getDb().collections.orderBy('updatedAt').reverse().toArray();
}

// ── Vocabulary ──────────────────────────────────────────────────────────────

export type VocabularyDraft = Omit<VocabularyItem, 'id' | 'collectionId' | 'createdAt' | 'updatedAt'>;

export function cleanDraft(d: VocabularyDraft): VocabularyDraft {
  const opt = (s?: string) => {
    const t = s?.replace(/\s+/g, ' ').trim();
    return t ? t : undefined;
  };
  return {
    english: d.english.replace(/\s+/g, ' ').trim(),
    vietnamese: d.vietnamese.replace(/\s+/g, ' ').trim(),
    pronunciation: opt(d.pronunciation),
    example: opt(d.example),
    partOfSpeech: opt(d.partOfSpeech),
    level: d.level,
    tags: d.tags?.map((t) => t.trim()).filter(Boolean),
  };
}

export async function listWords(collectionId: string): Promise<VocabularyItem[]> {
  return getDb().vocabulary.where('collectionId').equals(collectionId).toArray();
}

export async function addWord(collectionId: string, draft: VocabularyDraft): Promise<VocabularyItem> {
  const now = Date.now();
  const item: VocabularyItem = { ...cleanDraft(draft), id: createId(), collectionId, createdAt: now, updatedAt: now };
  const db = getDb();
  await db.transaction('rw', db.vocabulary, db.collections, async () => {
    await db.vocabulary.add(item);
    await db.collections.update(collectionId, { updatedAt: now });
  });
  return item;
}

export async function updateWord(id: string, draft: VocabularyDraft): Promise<void> {
  await getDb().vocabulary.update(id, { ...cleanDraft(draft), updatedAt: Date.now() });
}

export async function deleteWords(ids: string[]): Promise<void> {
  const db = getDb();
  await db.transaction('rw', db.vocabulary, db.progress, async () => {
    await db.vocabulary.bulkDelete(ids);
    await db.progress.bulkDelete(ids);
  });
}

/** Switches words on or off for practice (switched-off words stay in the set but are never played). */
export async function setWordsExcluded(ids: readonly string[], excluded: boolean): Promise<void> {
  if (ids.length === 0) return;
  const now = Date.now();
  await getDb().vocabulary.where(':id').anyOf([...ids]).modify({ excluded, updatedAt: now });
}

/** Finds an existing word in a collection with the same normalized English. */
export async function findDuplicate(collectionId: string, english: string, exceptId?: string): Promise<VocabularyItem | undefined> {
  const key = normalizeAnswer(english);
  const words = await listWords(collectionId);
  return words.find((w) => w.id !== exceptId && normalizeAnswer(w.english) === key);
}

/** Bulk insert/update in one transaction (fast for 1000+ rows). */
export async function bulkSaveWords(
  collectionId: string,
  inserts: VocabularyDraft[],
  updates: { id: string; draft: VocabularyDraft }[],
): Promise<void> {
  const db = getDb();
  const now = Date.now();
  await db.transaction('rw', db.vocabulary, db.collections, async () => {
    await db.vocabulary.bulkAdd(
      inserts.map((d, i) => ({ ...cleanDraft(d), id: createId(), collectionId, createdAt: now + i, updatedAt: now + i })),
    );
    for (const u of updates) await db.vocabulary.update(u.id, { ...cleanDraft(u.draft), updatedAt: now });
    await db.collections.update(collectionId, { updatedAt: now });
  });
}

// ── Progress ────────────────────────────────────────────────────────────────

export async function getProgressMap(ids?: string[]): Promise<Map<string, WordProgress>> {
  const db = getDb();
  const rows = ids ? (await db.progress.bulkGet(ids)).filter((r): r is WordProgress => !!r) : await db.progress.toArray();
  return new Map(rows.map((r) => [r.vocabularyId, r]));
}

export async function saveProgress(rows: WordProgress[]): Promise<void> {
  if (rows.length) await getDb().progress.bulkPut(rows);
}

// ── Sessions ────────────────────────────────────────────────────────────────

export async function saveSession(record: SessionRecord): Promise<void> {
  await getDb().sessions.put(record);
}

export async function listSessions(): Promise<SessionRecord[]> {
  return getDb().sessions.orderBy('startedAt').toArray();
}

/** Sessions left "in_progress" (tab closed / refreshed mid-game) become "interrupted". */
export async function markInterruptedSessions(): Promise<number> {
  return getDb().sessions.where('status').equals('in_progress').modify({ status: 'interrupted' });
}
