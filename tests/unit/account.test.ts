import { describe, expect, it } from 'vitest';
import { isPristine, mergeSnapshots, toSyncedSettings, type SyncSnapshot } from '@/services/account/snapshot';
import { achievementStats, evaluateAchievements } from '@/features/achievements/achievements';
import { DEFAULT_SETTINGS } from '@/features/settings/defaults';
import { DEFAULT_SETUP } from '@/stores/appStore';
import type { SessionRecord, WordProgress } from '@/types';
import { makeWords } from './fixtures';

const snap = (patch: Partial<SyncSnapshot> = {}): SyncSnapshot => ({
  format: 1,
  collections: [],
  vocabulary: [],
  progress: [],
  sessions: [],
  settings: toSyncedSettings(DEFAULT_SETTINGS),
  setup: DEFAULT_SETUP,
  ...patch,
});

const session = (id: string, patch: Partial<SessionRecord> = {}) =>
  ({ id, status: 'completed', endedAt: 1, startedAt: 1, correct: 5, incorrect: 0, missed: 0, bestCombo: 5, score: 50, correctChars: 20, correctResponseMs: 8000, mistakes: [], ...patch }) as SessionRecord;

const progress = (id: string, attempts: number): WordProgress =>
  ({ vocabularyId: id, attempts, correctAttempts: attempts, incorrectAttempts: 0, missedBalloons: 0, averageResponseTimeMs: 1000, consecutiveCorrect: 1, masteryScore: 10, reviewStep: 0 }) as WordProgress;

describe('account sync snapshot', () => {
  it('never syncs the DeepSeek key', () => {
    expect(toSyncedSettings({ ...DEFAULT_SETTINGS, deepseekApiKey: 'sk-secret' })).not.toHaveProperty('deepseekApiKey');
  });

  it('merges two devices without losing games, edits or purchases', () => {
    const [w1, w2] = makeWords(2);
    const local = snap({
      vocabulary: [{ ...w1!, vietnamese: 'old', updatedAt: 1 }, w2!],
      progress: [progress('w0', 5)],
      sessions: [session('a')],
      settings: { ...toSyncedSettings(DEFAULT_SETTINGS), ownedSkins: ['panda'], coinsSpent: 250, achievementsSeen: ['first-pop'] },
      setup: { ...DEFAULT_SETUP, difficulty: 'hard' },
    });
    const remote = snap({
      vocabulary: [{ ...w1!, vietnamese: 'new', updatedAt: 9 }],
      progress: [progress('w0', 2)],
      sessions: [session('b'), session('a', { status: 'in_progress', endedAt: 99 })],
      settings: { ...toSyncedSettings(DEFAULT_SETTINGS), ownedSkins: ['robot'], coinsSpent: 450, achievementsSeen: ['games-10'], musicVolume: 0.2 },
    });
    const m = mergeSnapshots(local, remote);
    expect(m.vocabulary.find((w) => w.id === w1!.id)?.vietnamese).toBe('new');
    expect(m.vocabulary).toHaveLength(2);
    expect(m.progress[0]?.attempts).toBe(5);
    expect(m.sessions.map((s) => s.id).sort()).toEqual(['a', 'b']);
    expect(m.sessions.find((s) => s.id === 'a')?.status).toBe('completed');
    expect(m.settings.ownedSkins.sort()).toEqual(['panda', 'robot']);
    expect(m.settings.coinsSpent).toBe(450);
    expect(m.settings.achievementsSeen.sort()).toEqual(['first-pop', 'games-10']);
    expect(m.settings.musicVolume).toBe(0.2);
    expect(m.setup.difficulty).toBe('hard');
  });

  it('treats a never-played device as pristine', () => {
    expect(isPristine(snap({ collections: [{ id: 'c', name: 'Starter', createdAt: 0, updatedAt: 0 }] }))).toBe(true);
    expect(isPristine(snap({ sessions: [session('a')] }))).toBe(false);
  });
});

describe('achievements', () => {
  it('computes progress from games and words', () => {
    const words = makeWords(3);
    const stats = achievementStats({
      sessions: [session('a', { bestCombo: 12, score: 520 }), session('b', { incorrect: 1 })],
      words,
      progress: new Map([['w0', progress('w0', 3)]]),
      skinsOwned: 2,
      now: Date.now(),
    });
    const byId = new Map(evaluateAchievements(stats).map((a) => [a.def.id, a]));
    expect(byId.get('first-pop')?.unlocked).toBe(true);
    expect(byId.get('combo-10')?.unlocked).toBe(true);
    expect(byId.get('combo-30')?.unlocked).toBe(false);
    expect(byId.get('score-500')?.unlocked).toBe(true);
    expect(byId.get('perfect')?.unlocked).toBe(true);
    expect(byId.get('games-10')?.progress).toBeCloseTo(0.2);
    expect(byId.get('skins-5')?.value).toBe(2);
  });
});
