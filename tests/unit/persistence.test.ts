import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { IDBFactory, IDBKeyRange } from 'fake-indexeddb';
import { createDbForTesting, setDbForTesting, type WordShooterDB } from '@/services/database/db';
import {
  addWord,
  bulkSaveWords,
  createCollection,
  deleteCollection,
  findDuplicate,
  getProgressMap,
  listSessions,
  listWords,
  markInterruptedSessions,
  saveProgress,
  saveSession,
} from '@/services/database/repositories';
import { exportBackup, importBackup, parseBackup } from '@/services/database/backup';
import { seedIfFirstRun } from '@/services/database/seed';
import { ProgressSaver } from '@/services/database/progressSaver';
import { GameSession } from '@/game/systems/SessionSystem';
import { applyCorrect, createProgress } from '@/features/learning/spacedRepetition';
import { createRng } from '@/utils/random';
import { makeConfig } from './fixtures';

let db: WordShooterDB;

beforeEach(async () => {
  db = createDbForTesting('test-db', { indexedDB: new IDBFactory(), IDBKeyRange });
  await db.open();
  setDbForTesting(db);
});

afterEach(() => {
  db.close();
  setDbForTesting(null);
});

describe('persistence', () => {
  it('stores collections and words, and detects duplicates', async () => {
    const c = await createCollection('  IELTS  ');
    expect(c.name).toBe('IELTS');
    await addWord(c.id, { english: ' Look   after ', vietnamese: 'chăm sóc' });
    const words = await listWords(c.id);
    expect(words[0]?.english).toBe('Look after');
    expect(await findDuplicate(c.id, 'look after')).toBeDefined();
    expect(await findDuplicate(c.id, 'look')).toBeUndefined();
  });

  it('bulk imports 1,000+ words in one transaction', async () => {
    const c = await createCollection('Big');
    const drafts = Array.from({ length: 1500 }, (_, i) => ({ english: `w${i}`, vietnamese: `t${i}` }));
    await bulkSaveWords(c.id, drafts, []);
    expect(await db.vocabulary.where('collectionId').equals(c.id).count()).toBe(1500);
  });

  it('deleting a collection removes words and progress but keeps session history', async () => {
    const c = await createCollection('Temp');
    const w = await addWord(c.id, { english: 'apple', vietnamese: 'táo' });
    await saveProgress([applyCorrect(createProgress(w.id), 1000, Date.now())]);
    const session = new GameSession({ config: makeConfig({ collectionId: c.id, collectionName: 'Temp' }), words: [w], progress: new Map(), rng: createRng(1) });
    await saveSession(session.toRecord('s1', 'completed'));
    await deleteCollection(c.id);
    expect(await listWords(c.id)).toHaveLength(0);
    expect((await getProgressMap()).size).toBe(0);
    const sessions = await listSessions();
    expect(sessions[0]?.collectionName).toBe('Temp');
  });

  it('persists progress written by a session through the batch saver', async () => {
    const c = await createCollection('Play');
    const w = await addWord(c.id, { english: 'apple', vietnamese: 'táo' });
    const saver = new ProgressSaver();
    const s = new GameSession({
      config: makeConfig({ collectionId: c.id, practiceSize: 'all' }),
      words: [w],
      progress: new Map(),
      rng: createRng(1),
      onProgress: (p) => saver.add(p),
    });
    const next = s.nextWord([])!;
    s.answerCorrect(next.id, 1800, false);
    await saver.flush();
    const p = (await getProgressMap([w.id])).get(w.id);
    expect(p).toMatchObject({ correctAttempts: 1, reviewStep: 1 });
    expect(s.runState).toBe('completed');
  });

  it('marks sessions left in progress as interrupted', async () => {
    const s = new GameSession({ config: makeConfig(), words: [], progress: new Map(), rng: createRng(1) });
    await saveSession(s.toRecord('a', 'in_progress'));
    expect(await markInterruptedSessions()).toBe(1);
    expect((await listSessions())[0]?.status).toBe('interrupted');
  });

  it('seeds demo words only on the very first run', async () => {
    await seedIfFirstRun();
    expect(await db.collections.count()).toBe(1);
    await db.collections.clear();
    await seedIfFirstRun();
    expect(await db.collections.count()).toBe(0);
  });

  it('round-trips a backup', async () => {
    const c = await createCollection('Backup');
    await addWord(c.id, { english: 'apple', vietnamese: 'quả táo' });
    const backup = parseBackup(JSON.stringify(await exportBackup()));
    await db.vocabulary.clear();
    await importBackup(backup, 'merge');
    expect((await listWords(c.id))[0]?.vietnamese).toBe('quả táo');
    expect(() => parseBackup('{"app":"other"}')).toThrow();
  });
});
