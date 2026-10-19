import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { IDBFactory, IDBKeyRange } from 'fake-indexeddb';
import { CEFR_LEVELS } from '@/types';
import { createDbForTesting, setDbForTesting, type WordShooterDB } from '@/services/database/db';
import { addWord, createCollection, listWords } from '@/services/database/repositories';
import { addPack, replaceOldStarterSets, seedIfFirstRun } from '@/services/database/seed';
import { BASIC_PACK, PRONUNCIATION_SLIDES, packWords } from '@/features/vocabulary/packs';
import { OLD_STARTER_NAME } from '@/features/vocabulary/sampleData';

describe('Basic set', () => {
  const words = BASIC_PACK.words;
  const find = (english: string) => words.find((w) => w.english === english)!;

  it('keeps every slide word once', () => {
    const rows = PRONUNCIATION_SLIDES.flatMap((g) => g.rows.map((r) => r[0].toLowerCase()));
    expect(rows).toHaveLength(174);
    expect(words).toHaveLength(new Set(rows).size);
    expect(words).toHaveLength(166);
    expect(new Set(words.map((w) => w.english.toLowerCase())).size).toBe(words.length);
  });

  it('a repeated word carries every sound it appears under, and its fullest pronunciation', () => {
    expect(find('potato').tags).toEqual(['sound /p/', 'sound /t/']);
    expect(find('boy').tags).toEqual(['sound /b/', 'sound /ɔɪ/']);
    expect(find('tour').pronunciation).toBe('/tʊə/ or /tɔː/');
    expect(find('tour').tags).toEqual(['sound /ʊə/']);
    expect(find('pen').tags).toEqual(['sound /p/']);
  });

  it('every word has a meaning, a pronunciation and a CEFR level', () => {
    for (const w of words) {
      expect(w.vietnamese.trim(), w.english).not.toBe('');
      expect(w.pronunciation, w.english).toMatch(/^\/.+\/$/);
      expect(CEFR_LEVELS, w.english).toContain(w.level);
    }
  });

  it('dedupes regardless of case', () => {
    const out = packWords([
      { sound: '/x/', rows: [['Apple', 'táo', '/a/', 'noun', 'A1']] },
      { sound: '/y/', rows: [['apple', 'táo', '/a/', 'noun', 'A1']] },
    ]);
    expect(out).toHaveLength(1);
    expect(out[0]!.tags).toEqual(['sound /x/', 'sound /y/']);
  });
});

describe('Basic in the library', () => {
  let db: WordShooterDB;
  beforeEach(async () => {
    db = createDbForTesting('packs-db', { indexedDB: new IDBFactory(), IDBKeyRange });
    await db.open();
    setDbForTesting(db);
  });
  afterEach(() => {
    db.close();
    setDbForTesting(null);
  });

  it('is the set a new player starts with, under fixed ids', async () => {
    await seedIfFirstRun();
    const sets = await db.collections.toArray();
    expect(sets.map((c) => c.name)).toEqual(['Basic']);
    const saved = await listWords(BASIC_PACK.id);
    expect(saved).toHaveLength(166);
    expect(saved.find((w) => w.english === 'potato')?.id).toBe('basic:potato');
    await addPack(BASIC_PACK); // already there: no second copy
    expect(await db.vocabulary.count()).toBe(166);
  });

  it('replaces an untouched old Starter Pack and the earlier pronunciation copy', async () => {
    const starter = await createCollection(OLD_STARTER_NAME);
    await addWord(starter.id, { english: 'apple', vietnamese: 'quả táo' });
    await db.collections.put({ id: 'pack-pronunciation', name: 'Pronunciation Pack', createdAt: 0, updatedAt: 0 });

    expect(await replaceOldStarterSets()).toBe(true);
    expect((await db.collections.toArray()).map((c) => c.name)).toEqual(['Basic']);
    // Nothing left to replace the next time.
    expect(await replaceOldStarterSets()).toBe(false);
  });

  it('keeps a Starter Pack the player added their own words to', async () => {
    const starter = await createCollection(OLD_STARTER_NAME);
    await addWord(starter.id, { english: 'apple', vietnamese: 'quả táo' });
    await addWord(starter.id, { english: 'dragonfruit', vietnamese: 'thanh long' });
    expect(await replaceOldStarterSets()).toBe(false);
    expect((await db.collections.toArray()).map((c) => c.name)).toEqual([OLD_STARTER_NAME]);
  });
});
