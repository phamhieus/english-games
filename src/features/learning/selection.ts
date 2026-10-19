import type { Rng, VocabularyItem, WordProgress } from '@/types';
import { weightedIndex } from '@/utils/random';
import { isDue, isMastered } from './spacedRepetition';

export type ProgressMap = ReadonlyMap<string, WordProgress>;

/**
 * Learning priority weight of a word. Higher = more likely to be picked.
 *  - never practiced            → strong boost
 *  - due for review             → strong boost, more when overdue
 *  - frequent errors / misses   → boost proportional to error rate & count
 *  - slow average response      → small boost
 *  - mastered and not due       → strongly reduced (still possible)
 */
export function wordWeight(progress: WordProgress | undefined, now: number): number {
  if (!progress || progress.attempts === 0) return 5;
  let w = 1;
  if (isDue(progress, now)) {
    const overdueDays = Math.max(0, now - (progress.nextReviewAt ?? now)) / 86_400_000;
    w += 4 + Math.min(3, overdueDays * 0.5);
  }
  const errors = progress.incorrectAttempts + progress.missedBalloons;
  const total = progress.correctAttempts + errors;
  if (total > 0) {
    const errorRate = errors / total;
    w += errorRate * 4 + Math.min(3, errors * 0.5);
  }
  if (progress.correctAttempts > 0) {
    w += Math.min(1.5, Math.max(0, (progress.averageResponseTimeMs - 3000) / 4000));
  }
  if (isMastered(progress) && !isDue(progress, now)) w *= 0.15;
  return w;
}

/** Weight used by Mode C (mistake review): only words with errors that aren't mastered. */
export function mistakeWeight(progress: WordProgress | undefined): number {
  if (!progress) return 0;
  const errors = progress.incorrectAttempts + progress.missedBalloons;
  if (errors === 0 || isMastered(progress)) return 0;
  const total = progress.correctAttempts + errors;
  return 1 + errors * 1.5 + (errors / total) * 4 + Math.max(0, 3 - progress.consecutiveCorrect);
}

export function mistakePool(words: readonly VocabularyItem[], progress: ProgressMap): VocabularyItem[] {
  return words.filter((w) => mistakeWeight(progress.get(w.id)) > 0);
}

/**
 * Picks `count` distinct words using weighted random sampling without replacement.
 * Deterministic for a seeded `rng`.
 */
export function selectTargets(
  words: readonly VocabularyItem[],
  progress: ProgressMap,
  count: number,
  rng: Rng,
  now: number,
  weightFn: (p: WordProgress | undefined, now: number) => number = wordWeight,
): VocabularyItem[] {
  const pool = [...words];
  const weights = pool.map((w) => weightFn(progress.get(w.id), now));
  const picked: VocabularyItem[] = [];
  while (picked.length < count && pool.length > 0) {
    let idx = weightedIndex(weights, rng);
    if (idx < 0) idx = Math.floor(rng.next() * pool.length);
    const [item] = pool.splice(idx, 1);
    weights.splice(idx, 1);
    if (item) picked.push(item);
  }
  return picked;
}

/**
 * Picks the next word for a continuous (endless) stream.
 * Words currently on screen are excluded; recently shown words are strongly
 * de-prioritised, unless they are the only option.
 */
export function pickNext(
  words: readonly VocabularyItem[],
  progress: ProgressMap,
  rng: Rng,
  now: number,
  opts: {
    exclude?: ReadonlySet<string>;
    recent?: readonly string[];
    boost?: ReadonlyMap<string, number>;
    weightFn?: (p: WordProgress | undefined, now: number) => number;
  } = {},
): VocabularyItem | null {
  const exclude = opts.exclude ?? new Set<string>();
  const recent = new Set(opts.recent ?? []);
  const weightFn = opts.weightFn ?? wordWeight;
  const candidates = words.filter((w) => !exclude.has(w.id));
  if (candidates.length === 0) return null;
  const fresh = candidates.filter((w) => !recent.has(w.id));
  const pool = fresh.length > 0 ? fresh : candidates;
  const weights = pool.map((w) => {
    const base = Math.max(0.05, weightFn(progress.get(w.id), now));
    return base * (opts.boost?.get(w.id) ?? 1);
  });
  const idx = weightedIndex(weights, rng);
  return pool[idx < 0 ? 0 : idx] ?? null;
}
