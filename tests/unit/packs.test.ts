import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { IDBFactory, IDBKeyRange } from 'fake-indexeddb';
import { CEFR_LEVELS } from '@/types';
import { createDbForTesting, setDbForTesting, type WordShooterDB } from '@/services/database/db';
import { deleteCollection, listWords } from '@/services/database/repositories';
import { addNewPacks, addPack } from '@/services/database/seed';
import { PRONUNCIATION_PACK, PRONUNCIATION_SLIDES, packWords } from '@/features/vocabulary/packs';

describe('pronunciation pack', () => {
  const words = PRONUNCIATION_PACK.words;
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

describe('built-in packs in the library', () => {
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

  it('adds a pack once, under fixed ids, and never brings back a deleted one', async () => {
    await addNewPacks();
    await addNewPacks();
    expect(await db.collections.count()).toBe(1);
    const saved = await listWords(PRONUNCIATION_PACK.id);
    expect(saved).toHaveLength(166);
    expect(saved.find((w) => w.english === 'potato')?.id).toBe('pack-pronunciation:potato');

    await addPack(PRONUNCIATION_PACK); // already there: no copy
    expect(await db.vocabulary.count()).toBe(166);

    await deleteCollection(PRONUNCIATION_PACK.id);
    await addNewPacks();
    expect(await db.collections.count()).toBe(0);
  });
});
