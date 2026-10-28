import type { CefrLevel, VocabularyItem } from '@/types';

/** CEFR levels the player can practise by (C1/C2 words are played with "All"). */
export const PICKABLE_LEVELS: readonly CefrLevel[] = ['A1', 'A2', 'B1', 'B2'];

/** Words of the chosen levels; no levels chosen means all words (a word without a level only counts then). */
export function filterByLevels<T extends Pick<VocabularyItem, 'level'>>(words: readonly T[], levels: readonly CefrLevel[] | undefined): T[] {
  if (!levels?.length) return [...words];
  return words.filter((w) => !!w.level && levels.includes(w.level));
}
