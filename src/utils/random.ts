import type { Rng } from '@/types';

/** Mulberry32: a tiny seeded PRNG so selection logic is deterministic in tests. */
export function createRng(seed: number): Rng {
  let a = seed >>> 0;
  return {
    next() {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    },
  };
}

export const mathRng: Rng = { next: () => Math.random() };

/** Picks an index proportionally to weights. Returns -1 if every weight is 0. */
export function weightedIndex(weights: readonly number[], rng: Rng): number {
  let total = 0;
  for (const w of weights) total += Math.max(0, w);
  if (total <= 0) return -1;
  let r = rng.next() * total;
  for (let i = 0; i < weights.length; i++) {
    r -= Math.max(0, weights[i] ?? 0);
    if (r < 0) return i;
  }
  return weights.length - 1;
}
