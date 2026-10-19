import { describe, expect, it } from 'vitest';
import {
  applyCorrect,
  applyIncorrect,
  applyMissed,
  createProgress,
  DAY_MS,
  intervalDaysForStep,
  isDue,
  isMastered,
} from '@/features/learning/spacedRepetition';
import { mistakePool, pickNext, selectTargets, wordWeight } from '@/features/learning/selection';
import { createRng } from '@/utils/random';
import type { WordProgress } from '@/types';
import { makeWords } from './fixtures';

const T0 = Date.UTC(2026, 0, 1);

describe('spaced repetition', () => {
  it('uses 1 / 3 / 7 day intervals, then grows', () => {
    expect([1, 2, 3, 4].map(intervalDaysForStep)).toEqual([1, 3, 7, 16]);
    expect(intervalDaysForStep(5)).toBeGreaterThan(16);
    expect(intervalDaysForStep(50)).toBe(180);
  });

  it('schedules the next review after each successful due review', () => {
    let p = createProgress('w');
    p = applyCorrect(p, 2000, T0);
    expect(p.nextReviewAt).toBe(T0 + 1 * DAY_MS);
    const t1 = T0 + 1 * DAY_MS;
    p = applyCorrect(p, 2000, t1);
    expect(p.nextReviewAt).toBe(t1 + 3 * DAY_MS);
    const t2 = t1 + 3 * DAY_MS;
    p = applyCorrect(p, 2000, t2);
    expect(p.nextReviewAt).toBe(t2 + 7 * DAY_MS);
    expect(p.reviewStep).toBe(3);
  });

  it('does not advance the schedule for answers before the word is due', () => {
    let p = applyCorrect(createProgress('w'), 2000, T0);
    const due = p.nextReviewAt;
    p = applyCorrect(p, 2000, T0 + 1000);
    p = applyCorrect(p, 2000, T0 + 2000);
    expect(p.reviewStep).toBe(1);
    expect(p.nextReviewAt).toBe(due);
    expect(p.correctAttempts).toBe(3);
  });

  it('never marks a word mastered after a single correct answer', () => {
    const p = applyCorrect(createProgress('w'), 500, T0);
    expect(isMastered(p)).toBe(false);
    expect(p.masteryScore).toBeLessThan(80);
  });

  it('reaches mastery after several successful spaced reviews', () => {
    let p = createProgress('w');
    let t = T0;
    for (let i = 0; i < 4; i++) {
      p = applyCorrect(p, 1500, t);
      t = p.nextReviewAt ?? t;
    }
    expect(isMastered(p)).toBe(true);
  });

  it('resets on mistakes and makes the word due immediately', () => {
    let p = applyCorrect(createProgress('w'), 1500, T0);
    p = applyIncorrect(p, T0 + 10);
    expect(p.reviewStep).toBe(0);
    expect(p.consecutiveCorrect).toBe(0);
    expect(isDue(p, T0 + 10)).toBe(true);
    p = applyMissed(p, T0 + 20);
    expect(p.missedBalloons).toBe(1);
    expect(p.attempts).toBe(3);
  });

  it('tracks a running average response time', () => {
    let p = applyCorrect(createProgress('w'), 1000, T0);
    p = applyCorrect(p, 3000, T0 + 1);
    expect(p.averageResponseTimeMs).toBe(2000);
  });
});

describe('adaptive selection', () => {
  const words = makeWords(20);

  it('is deterministic with a seeded RNG', () => {
    const a = selectTargets(words, new Map(), 8, createRng(42), T0).map((w) => w.id);
    const b = selectTargets(words, new Map(), 8, createRng(42), T0).map((w) => w.id);
    expect(a).toEqual(b);
    expect(new Set(a).size).toBe(8);
  });

  it('prioritises missed and due words over mastered ones', () => {
    const progress = new Map<string, WordProgress>();
    const missed = applyMissed(applyMissed(createProgress('w0'), T0), T0);
    progress.set('w0', missed);
    let mastered = createProgress('w1');
    let t = T0 - 60 * DAY_MS;
    for (let i = 0; i < 4; i++) {
      mastered = applyCorrect(mastered, 1200, t);
      t = mastered.nextReviewAt ?? t;
    }
    progress.set('w1', { ...mastered, nextReviewAt: T0 + 30 * DAY_MS });
    expect(wordWeight(progress.get('w0'), T0)).toBeGreaterThan(wordWeight(progress.get('w1'), T0) * 5);

    let w0First = 0;
    for (let seed = 0; seed < 200; seed++) {
      const [first] = selectTargets(words.slice(0, 2), progress, 1, createRng(seed), T0);
      if (first?.id === 'w0') w0First++;
    }
    expect(w0First).toBeGreaterThan(170);
  });

  it('avoids recently shown and on-screen words unless they are the only option', () => {
    const rng = createRng(7);
    for (let i = 0; i < 50; i++) {
      const w = pickNext(words.slice(0, 3), new Map(), rng, T0, { exclude: new Set(['w0']), recent: ['w1'] });
      expect(w?.id).toBe('w2');
    }
    expect(pickNext(words.slice(0, 1), new Map(), rng, T0, { recent: ['w0'] })?.id).toBe('w0');
    expect(pickNext(words.slice(0, 1), new Map(), rng, T0, { exclude: new Set(['w0']) })).toBeNull();
  });

  it('builds the mistake pool from words with errors that are not mastered', () => {
    const progress = new Map<string, WordProgress>([
      ['w3', applyIncorrect(createProgress('w3'), T0)],
      ['w4', applyCorrect(createProgress('w4'), 1000, T0)],
    ]);
    expect(mistakePool(words, progress).map((w) => w.id)).toEqual(['w3']);
  });
});
