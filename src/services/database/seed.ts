import { OLD_STARTER_NAME, OLD_STARTER_WORDS } from '@/features/vocabulary/sampleData';
import { BASIC_ADDED_SOUNDS, BASIC_PACK, OLD_PACK_IDS, packWordId, type WordPack } from '@/features/vocabulary/packs';
import { getDb } from './db';
import { cleanDraft, deleteCollection } from './repositories';

const SEEDED_KEY = 'seeded-v1';

/**
 * Adds the Basic set on first launch only. A flag is stored so a user who deletes it
 * doesn't get it back on the next refresh.
 */
export async function seedIfFirstRun(): Promise<void> {
  const db = getDb();
  if (await db.settings.get(SEEDED_KEY)) return;
  if ((await db.collections.count()) === 0) await addPack(BASIC_PACK);
  await db.settings.put({ key: SEEDED_KEY, value: true });
  // A fresh library already has every sound.
  for (const { key } of BASIC_ADDED_SOUNDS) await db.settings.put({ key, value: true });
}

/** The Basic set (for "add starter words" and a fresh guest after signing out); returns its id. */
export async function addSampleCollection(): Promise<string> {
  await addPack(BASIC_PACK);
  return BASIC_PACK.id;
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

/**
 * Basic replaced the old demo sets. An untouched "Starter Pack" (nothing but its demo words)
 * and earlier built-in copies of Basic's words are swapped for Basic; a set the player added
 * words to is kept. Safe to run on every start. Returns whether anything was replaced.
 */
export async function replaceOldStarterSets(): Promise<boolean> {
  const db = getDb();
  const demo = new Set(OLD_STARTER_WORDS);
  const old: string[] = [];
  for (const c of await db.collections.toArray()) {
    if (OLD_PACK_IDS.includes(c.id)) {
      old.push(c.id);
      continue;
    }
    if (c.name !== OLD_STARTER_NAME) continue;
    const words = await db.vocabulary.where('collectionId').equals(c.id).toArray();
    if (words.every((w) => demo.has(w.english))) old.push(c.id);
  }
  if (old.length === 0) return false;
  for (const id of old) await deleteCollection(id);
  await addPack(BASIC_PACK);
  return true;
}

/**
 * Gives a player who already has Basic the words of sounds added to it later, once per
 * addition (so a word they delete afterwards stays deleted). A word Basic already had gets
 * the new sound tag. Players who deleted Basic get nothing. Returns how many words were added.
 */
export async function addNewBasicWords(): Promise<number> {
  const db = getDb();
  let added = 0;
  for (const { key, sounds } of BASIC_ADDED_SOUNDS) {
    if (await db.settings.get(key)) continue;
    const now = Date.now();
    await db.transaction('rw', db.collections, db.vocabulary, db.settings, async () => {
      if (await db.collections.get(BASIC_PACK.id)) {
        const tags = new Set(sounds.map((s) => `sound ${s}`));
        const drafts = BASIC_PACK.words.filter((d) => d.tags?.some((t) => tags.has(t)));
        for (const [i, d] of drafts.entries()) {
          const id = packWordId(BASIC_PACK, d.english);
          const seen = await db.vocabulary.get(id);
          if (!seen) {
            await db.vocabulary.put({ ...cleanDraft(d), id, collectionId: BASIC_PACK.id, createdAt: now + i, updatedAt: now + i });
            added++;
          } else if (d.tags?.some((t) => !(seen.tags ?? []).includes(t))) {
            await db.vocabulary.update(id, { tags: [...new Set([...(seen.tags ?? []), ...(d.tags ?? [])])], updatedAt: now + i });
          }
        }
        await db.collections.update(BASIC_PACK.id, { description: BASIC_PACK.description, updatedAt: now });
      }
      await db.settings.put({ key, value: true });
    });
  }
  return added;
}
