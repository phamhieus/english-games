import { describe, expect, it } from 'vitest';
import type { SessionRecord } from '@/types';
import { combineRecords, difficultyForLevel, nextAdventureStep, startAdventure } from '@/features/adventure/adventure';
import { GameSession } from '@/game/systems/SessionSystem';
import { createRng } from '@/utils/random';
import { makeWords } from './fixtures';

const start = (level = 1, defeated: ('cloud' | 'crab')[] = []) =>
  startAdventure({ collectionIds: ['c1'], collectionName: 'Test', level, defeated, size: 10, stage: 'meadow', id: 'a1' });

describe('adventure', () => {
  it('gets harder with the player level', () => {
    expect(difficultyForLevel(1)).toBe('easy');
    expect(difficultyForLevel(4)).toBe('normal');
    expect(difficultyForLevel(8)).toBe('hard');
    expect(start(5).difficulty).toBe('normal');
  });

  it('starts with copy typing and picks the boss for the end', () => {
    const c = start(3, ['cloud']);
    expect(c.mode).toBe('copy');
    expect(c.style).toBe('practice');
    expect(c.adventure).toEqual({ id: 'a1', step: 0, boss: 'crab' });
    expect(c.boss).toBeUndefined();
  });

  it('plays the same words in every step, then ends after the boss', () => {
    const words = ['w1', 'w2', 'w3'];
    const recall = nextAdventureStep(start(), words, 'garden')!;
    expect(recall).toMatchObject({ mode: 'recall', style: 'practice', wordIds: words, practiceSize: 'all', stage: 'garden' });
    expect(recall.adventure?.step).toBe(1);
    expect(recall.boss).toBeUndefined();

    const boss = nextAdventureStep(recall, words, 'garden')!;
    expect(boss).toMatchObject({ style: 'endless', wordIds: words, boss: 'cloud', stage: 'meadow' });
    expect(boss.adventure?.step).toBe(2);

    expect(nextAdventureStep(boss, words, 'garden')).toBeNull();
    expect(nextAdventureStep({ ...recall, adventure: undefined }, words, 'garden')).toBeNull();
  });

  it('the recall step uses exactly the words picked by the copy step', () => {
    const all = makeWords(30);
    const first = new GameSession({ config: start(), words: all, progress: new Map(), rng: createRng(7) });
    const picked = first.targetIds;
    expect(picked).toHaveLength(10);
    const recall = new GameSession({ config: nextAdventureStep(start(), picked, 'meadow')!, words: all, progress: new Map(), rng: createRng(8) });
    expect([...recall.targetIds].sort()).toEqual([...picked].sort());
  });

  it('sums the steps and merges their mistakes', () => {
    const rec = (p: Partial<SessionRecord>): SessionRecord =>
      ({ score: 0, correct: 0, incorrect: 0, missed: 0, accuracy: 1, averageResponseTimeMs: 0, bestCombo: 0, mistakes: [], ...p }) as SessionRecord;
    const mistake = { vocabularyId: 'w1', english: 'a', vietnamese: 'b', incorrect: 1, missed: 0 };
    const sum = combineRecords([
      rec({ score: 100, correct: 8, incorrect: 2, averageResponseTimeMs: 1000, bestCombo: 5, mistakes: [mistake] }),
      rec({ score: 50, correct: 2, missed: 1, averageResponseTimeMs: 2000, bestCombo: 2, mistakes: [{ ...mistake, incorrect: 0, missed: 1 }] }),
    ]);
    expect(sum).toMatchObject({ score: 150, correct: 10, incorrect: 2, missed: 1, bestCombo: 5, averageResponseTimeMs: 1200 });
    expect(sum.accuracy).toBeCloseTo(10 / 13);
    expect(sum.mistakes).toEqual([{ ...mistake, incorrect: 1, missed: 1 }]);
  });
});
