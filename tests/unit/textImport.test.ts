import { describe, expect, it } from 'vitest';
import { parseRows } from '@/services/import/importParser';
import { parseTextToRows, TEXT_MAPPING } from '@/services/import/textImport';

describe('text import', () => {
  it('splits lines on common separators and strips bullets', () => {
    const rows = parseTextToRows(
      ['apple - quả táo', '2. reliable = đáng tin cậy', '• look after | chăm sóc', 'achieve: đạt được', 'sustainable      bền vững', 'ambiguous\tmơ hồ\tAn ambiguous answer.\tC1', '', 'lonely'].join('\n'),
    );
    expect(rows).toEqual([
      ['apple', 'quả táo'],
      ['reliable', 'đáng tin cậy'],
      ['look after', 'chăm sóc'],
      ['achieve', 'đạt được'],
      ['sustainable', 'bền vững'],
      ['ambiguous', 'mơ hồ', 'An ambiguous answer.', 'C1'],
      ['lonely'],
    ]);
  });

  it('keeps hyphenated words intact and feeds the normal row validation', () => {
    const rows = parseTextToRows('well-known - nổi tiếng\nlonely');
    expect(rows[0]).toEqual(['well-known', 'nổi tiếng']);
    const res = parseRows(rows, TEXT_MAPPING, [], 1);
    expect(res.counts).toMatchObject({ new: 1, invalid: 1 });
    expect(res.rows[1]?.errors).toContain('Missing Vietnamese meaning');
  });
});
