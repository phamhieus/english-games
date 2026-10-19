import { normalizeAnswer, similarity } from '@/utils/text';

/** Minimal view of a balloon that targeting needs — independent of Phaser. */
export interface TargetCandidate {
  id: number;
  answer: string;
  /** 0 at spawn → 1 at the danger line. */
  progress: number;
  /** Already hit by a projectile in flight; can't be targeted or missed again. */
  claimed: boolean;
}

/**
 * Finds the balloon an exact answer destroys. With duplicates, the one closest to
 * the danger zone (largest progress) wins.
 */
export function findExactTarget<T extends TargetCandidate>(typed: string, balloons: readonly T[]): T | null {
  const answer = normalizeAnswer(typed);
  if (!answer) return null;
  let best: T | null = null;
  for (const b of balloons) {
    if (b.claimed || normalizeAnswer(b.answer) !== answer) continue;
    if (!best || b.progress > best.progress) best = b;
  }
  return best;
}

/** Copy-mode live targeting: lowest balloon whose answer starts with what's typed so far. */
export function findPrefixTarget<T extends TargetCandidate>(typed: string, balloons: readonly T[]): T | null {
  const prefix = normalizeAnswer(typed);
  if (!prefix) return null;
  let best: T | null = null;
  for (const b of balloons) {
    if (b.claimed || !normalizeAnswer(b.answer).startsWith(prefix)) continue;
    if (!best || b.progress > best.progress) best = b;
  }
  return best;
}

/** Number of leading characters of `answer` matched by `typed` (normalized, case-insensitive). */
export function matchedPrefixLength(typed: string, answer: string): number {
  const t = normalizeAnswer(typed);
  const a = normalizeAnswer(answer);
  if (!t || !a.startsWith(t)) return 0;
  return t.length;
}

/**
 * For a wrong answer, find which balloon the player was probably attempting so the
 * mistake is recorded against the right word. Returns null when nothing is close.
 */
export function attributeWrongAnswer<T extends TargetCandidate>(
  typed: string,
  balloons: readonly T[],
  minSimilarity = 0.5,
): T | null {
  let best: T | null = null;
  let bestScore = minSimilarity;
  for (const b of balloons) {
    if (b.claimed) continue;
    const s = similarity(typed, b.answer);
    if (s > bestScore || (s === bestScore && best && b.progress > best.progress)) {
      best = b;
      bestScore = s;
    }
  }
  return best;
}
