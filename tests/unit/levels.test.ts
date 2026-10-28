import { describe, expect, it } from 'vitest';
import { filterByLevels } from '@/features/vocabulary/levels';
import { BASIC_PACK } from '@/features/vocabulary/packs';

describe('filterByLevels', () => {
  const words = [{ level: 'A1' as const }, { level: 'A2' as const }, { level: 'B2' as const }, { level: undefined }];

  it('keeps every word when no level is chosen', () => {
    expect(filterByLevels(words, [])).toHaveLength(4);
    expect(filterByLevels(words, undefined)).toHaveLength(4);
  });

  it('keeps only the chosen levels (words without a level drop out)', () => {
    expect(filterByLevels(words, ['A1', 'B2']).map((w) => w.level)).toEqual(['A1', 'B2']);
  });

  it('Basic has words for each pickable level', () => {
    for (const level of ['A1', 'A2', 'B1', 'B2'] as const) expect(filterByLevels(BASIC_PACK.words, [level]).length, level).toBeGreaterThan(0);
  });
});
