import { describe, expect, it } from 'vitest';
import { answersMatch, editDistance, normalizeAnswer, similarity } from '@/utils/text';

describe('normalizeAnswer', () => {
  it('trims, lowercases and collapses internal whitespace', () => {
    expect(normalizeAnswer('  Look    AFTER \t')).toBe('look after');
  });
  it('unifies curly apostrophes and unicode dashes', () => {
    expect(normalizeAnswer('It’s')).toBe("it's");
    expect(normalizeAnswer('well–known')).toBe('well-known');
  });
  it('normalizes unicode composition (NFC)', () => {
    const decomposed = 'xinh đẹp'; // ẹ as e + combining dot below
    expect(normalizeAnswer(decomposed)).toBe(normalizeAnswer('xinh đẹp'));
  });
});

describe('answersMatch', () => {
  it('matches case-insensitively with surrounding spaces', () => {
    expect(answersMatch(' Environment ', 'environment')).toBe(true);
  });
  it('supports multi-word, hyphen and apostrophe answers', () => {
    expect(answersMatch('take  into account', 'take into account')).toBe(true);
    expect(answersMatch('WELL-KNOWN', 'well-known')).toBe(true);
    expect(answersMatch("it's up to you", 'it’s up to you')).toBe(true);
  });
  it('rejects empty input and wrong words', () => {
    expect(answersMatch('   ', '')).toBe(false);
    expect(answersMatch('enviroment', 'environment')).toBe(false);
    expect(answersMatch('wellknown', 'well-known')).toBe(false);
  });
});

describe('similarity', () => {
  it('computes edit distance', () => {
    expect(editDistance('kitten', 'sitting')).toBe(3);
  });
  it('is high for near misses and low for unrelated words', () => {
    expect(similarity('enviroment', 'environment')).toBeGreaterThan(0.8);
    expect(similarity('apple', 'consequence')).toBeLessThan(0.3);
  });
});
