/**
 * Normalizes an answer for comparison:
 * - Unicode NFC (so Vietnamese diacritics compare consistently)
 * - curly apostrophes → ', unicode dashes → -
 * - trims and collapses internal whitespace
 * - lowercases
 */
export function normalizeAnswer(input: string): string {
  return input
    .normalize('NFC')
    .replace(/[‘’ʼ`´]/g, "'")
    .replace(/[‐-―−]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/**
 * What the player has to type: the normalized answer without apostrophes, so "oclock"
 * matches "o'clock" (typing the apostrophe still works too).
 */
export function typingKey(input: string): string {
  return normalizeAnswer(input).replace(/'/g, '');
}

export function answersMatch(typed: string, expected: string): boolean {
  const a = typingKey(typed);
  return a.length > 0 && a === typingKey(expected);
}

/** Levenshtein distance; used only to attribute wrong answers to the closest balloon. */
export function editDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      cur[j] = Math.min((prev[j] ?? 0) + 1, (cur[j - 1] ?? 0) + 1, (prev[j - 1] ?? 0) + cost);
    }
    prev = cur;
  }
  return prev[b.length] ?? 0;
}

/** 0..1 similarity based on edit distance of normalized strings. */
export function similarity(a: string, b: string): number {
  const x = normalizeAnswer(a);
  const y = normalizeAnswer(b);
  const longest = Math.max(x.length, y.length);
  if (longest === 0) return 1;
  return 1 - editDistance(x, y) / longest;
}
