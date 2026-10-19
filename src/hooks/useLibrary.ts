import { useLiveQuery } from 'dexie-react-hooks';
import type { VocabularyCollection, VocabularyItem, WordProgress } from '@/types';
import { getDb } from '@/services/database/db';

export interface CollectionWithCount extends VocabularyCollection {
  wordCount: number;
}

export function useCollections(): CollectionWithCount[] | undefined {
  return useLiveQuery(async () => {
    const db = getDb();
    const collections = await db.collections.orderBy('updatedAt').reverse().toArray();
    return Promise.all(
      collections.map(async (c) => ({ ...c, wordCount: await db.vocabulary.where('collectionId').equals(c.id).count() })),
    );
  }, []);
}

export function useCollectionWords(collectionId: string | null): {
  words: VocabularyItem[];
  progress: Map<string, WordProgress>;
} | undefined {
  return useLiveQuery(async () => {
    if (!collectionId) return { words: [], progress: new Map<string, WordProgress>() };
    const db = getDb();
    const words = await db.vocabulary.where('collectionId').equals(collectionId).toArray();
    words.sort((a, b) => b.createdAt - a.createdAt);
    const rows = await db.progress.bulkGet(words.map((w) => w.id));
    const progress = new Map<string, WordProgress>();
    for (const r of rows) if (r) progress.set(r.vocabularyId, r);
    return { words, progress };
  }, [collectionId]);
}

/** Words and progress for several collections at once (de-duplicated by word id). */
export function useCollectionsWords(collectionIds: readonly string[]): {
  words: VocabularyItem[];
  progress: Map<string, WordProgress>;
} | undefined {
  const key = collectionIds.join('|');
  return useLiveQuery(async () => {
    const db = getDb();
    const ids = key ? key.split('|') : [];
    const words = ids.length ? await db.vocabulary.where('collectionId').anyOf(ids).toArray() : [];
    words.sort((a, b) => b.createdAt - a.createdAt);
    const rows = await db.progress.bulkGet(words.map((w) => w.id));
    const progress = new Map<string, WordProgress>();
    for (const r of rows) if (r) progress.set(r.vocabularyId, r);
    return { words, progress };
  }, [key]);
}
