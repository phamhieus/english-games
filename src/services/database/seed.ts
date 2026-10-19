import { SAMPLE_COLLECTION_NAME, SAMPLE_WORDS } from '@/features/vocabulary/sampleData';
import { getDb } from './db';
import { bulkSaveWords, createCollection } from './repositories';

const SEEDED_KEY = 'seeded-v1';

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

export async function addSampleCollection(): Promise<string> {
  const c = await createCollection(SAMPLE_COLLECTION_NAME, 'Demo words — replace with your own!');
  await bulkSaveWords(c.id, SAMPLE_WORDS, []);
  return c.id;
}
