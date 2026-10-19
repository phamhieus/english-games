import { SAMPLE_COLLECTION_NAME, SAMPLE_WORDS } from '@/features/vocabulary/sampleData';
import { WORD_PACKS, packWordId, type WordPack } from '@/features/vocabulary/packs';
import { getDb } from './db';
import { bulkSaveWords, cleanDraft, createCollection } from './repositories';

const SEEDED_KEY = 'seeded-v1';
const packKey = (pack: WordPack) => `pack-added:${pack.id}`;

/**
 * Adds the demo collection on first launch only. A flag is stored so a user who
 * deletes the demo doesn't get it back on the next refresh.
 */
export async function seedIfFirstRun(): Promise<void> {
  const db = getDb();
  if (await db.settings.get(SEEDED_KEY)) return;
  if ((await db.collections.count()) === 0) {
    const c = await createCollection(SAMPLE_COLLECTION_NAME, 'Demo words — replace with your own!');
    await bulkSaveWords(c.id, SAMPLE_WORDS, []);
  }
  await db.settings.put({ key: SEEDED_KEY, value: true });
}

/** Demo words for a fresh guest (after signing out), with the built-in packs. */
export async function addSampleCollection(): Promise<string> {
  const c = await createCollection(SAMPLE_COLLECTION_NAME, 'Demo words — replace with your own!');
  await bulkSaveWords(c.id, SAMPLE_WORDS, []);
  for (const pack of WORD_PACKS) await addPack(pack);
  return c.id;
}

/** Puts a built-in pack in the library under its fixed ids (if it isn't there already). */
export async function addPack(pack: WordPack): Promise<void> {
  const db = getDb();
  const now = Date.now();
  await db.transaction('rw', db.collections, db.vocabulary, async () => {
    if (await db.collections.get(pack.id)) return;
    await db.collections.put({ id: pack.id, name: pack.name, description: pack.description, createdAt: now, updatedAt: now });
    await db.vocabulary.bulkPut(
      pack.words.map((d, i) => ({ ...cleanDraft(d), id: packWordId(pack, d.english), collectionId: pack.id, createdAt: now + i, updatedAt: now + i })),
    );
  });
}

/** Adds each built-in pack once per browser; a pack the player deleted stays deleted. */
export async function addNewPacks(): Promise<void> {
  const db = getDb();
  for (const pack of WORD_PACKS) {
    if (await db.settings.get(packKey(pack))) continue;
    await addPack(pack);
    await db.settings.put({ key: packKey(pack), value: true });
  }
}
