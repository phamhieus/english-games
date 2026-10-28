import { normalizeAnswer, similarity, typingKey } from '@/utils/text';

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
  const answer = typingKey(typed);
  if (!answer) return null;
  let best: T | null = null;
  for (const b of balloons) {
    if (b.claimed || typingKey(b.answer) !== answer) continue;
    if (!best || b.progress > best.progress) best = b;
  }
  return best;
}

/** Copy-mode live targeting: lowest balloon whose answer starts with what's typed so far. */
export function findPrefixTarget<T extends TargetCandidate>(typed: string, balloons: readonly T[]): T | null {
  const prefix = typingKey(typed);
  if (!prefix) return null;
  let best: T | null = null;
  for (const b of balloons) {
    if (b.claimed || !typingKey(b.answer).startsWith(prefix)) continue;
    if (!best || b.progress > best.progress) best = b;
  }
  return best;
}

/**
 * Number of leading characters of `answer` matched by `typed` (normalized, case-insensitive).
 * Apostrophes needn't be typed: those inside the matched part count as matched.
 */
export function matchedPrefixLength(typed: string, answer: string): number {
  const t = typingKey(typed);
  const a = normalizeAnswer(answer);
  if (!t) return 0;
  let i = 0;
  for (const ch of t) {
    while (a[i] === "'") i++;
    if (a[i] !== ch) return 0;
    i++;
  }
  return i;
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
