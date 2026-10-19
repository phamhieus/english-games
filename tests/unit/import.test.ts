import { describe, expect, it } from 'vitest';
import { detectMapping, parseRows, planImport } from '@/services/import/importParser';
import { wordsToCsv } from '@/services/import/spreadsheet';
import type { VocabularyItem } from '@/types';

const header = ['English', 'Vietnamese', 'Example', 'Level'];

describe('import parser', () => {
  it('auto-detects English/Vietnamese headers (including Vietnamese header names)', () => {
    expect(detectMapping(header).mapping).toMatchObject({ english: 0, vietnamese: 1, example: 2, level: 3 });
    expect(detectMapping(['Nghĩa', 'Từ vựng']).mapping).toMatchObject({ english: 1, vietnamese: 0 });
    const noHeader = detectMapping(['apple', 'quả táo']);
    expect(noHeader.hasHeader).toBe(false);
    expect(noHeader.mapping).toMatchObject({ english: 0, vietnamese: 1 });
  });

  it('validates rows and keeps Vietnamese text intact', () => {
    const { mapping } = detectMapping(header);
    const res = parseRows(
      [
        ['apple', 'quả táo', 'I eat an apple.', 'a1'],
        ['', 'thiếu', '', ''],
        ['reliable', '', '', 'B2'],
        ['achieve', 'đạt được', '', 'Z9'],
        ['', '', '', ''],
      ],
      mapping,
      [],
    );
    expect(res.counts).toEqual({ new: 2, 'duplicate-existing': 0, 'duplicate-file': 0, invalid: 2 });
    expect(res.rows[0]?.draft).toMatchObject({ english: 'apple', vietnamese: 'quả táo', level: 'A1' });
    expect(res.rows[1]?.errors).toContain('Missing English word');
    expect(res.rows[1]?.rowNumber).toBe(3);
    expect(res.rows[3]?.warnings[0]).toMatch(/Unknown level/);
    expect(res.rows).toHaveLength(4); // blank row skipped
  });

  it('detects duplicates in the file and against the collection', () => {
    const { mapping } = detectMapping(header);
    const existing = [{ id: 'x1', english: 'Apple' }];
    const res = parseRows(
      [
        ['apple ', 'táo'],
        ['banana', 'chuối'],
        ['BANANA', 'quả chuối'],
      ],
      mapping,
      existing,
    );
    expect(res.rows.map((r) => r.status)).toEqual(['duplicate-existing', 'new', 'duplicate-file']);
    expect(res.rows[0]?.existingId).toBe('x1');
    expect(planImport(res, 'skip')).toMatchObject({ inserts: [{ english: 'banana' }], updates: [] });
    expect(planImport(res, 'update').updates).toEqual([{ id: 'x1', draft: expect.objectContaining({ vietnamese: 'táo' }) }]);
  });

  it('handles 1,000+ rows quickly', () => {
    const rows = Array.from({ length: 2000 }, (_, i) => [`word ${i}`, `từ ${i}`]);
    const t = performance.now();
    const res = parseRows(rows, detectMapping(header).mapping, []);
    expect(res.counts.new).toBe(2000);
    expect(performance.now() - t).toBeLessThan(1000);
  });
});

describe('CSV export', () => {
  it('escapes commas and quotes', () => {
    const w: VocabularyItem = {
      id: '1',
      collectionId: 'c',
      english: 'say "hi"',
      vietnamese: 'chào, xin chào',
      createdAt: 0,
      updatedAt: 0,
    };
    const csv = wordsToCsv([w]).split('\r\n');
    expect(csv[1]).toBe('"say ""hi""","chào, xin chào",,,,,');
  });
});
