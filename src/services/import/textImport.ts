import type { ColumnMapping } from './importParser';

/** Column layout of rows produced by `parseTextToRows`. */
export const TEXT_MAPPING: ColumnMapping = {
  english: 0,
  vietnamese: 1,
  example: 2,
  level: 3,
  pronunciation: -1,
  partOfSpeech: -1,
  tags: -1,
};

const BULLET = /^\s*(?:[-*•·▪●]|\d+[.)])\s+/;

/** Tried in order; the first one that splits a line into two non-empty parts wins. */
const SEPARATORS = [/\s*\|\s*/, /\s+[-–—]\s+/, /\s*=\s*/, /\s*:\s+/, /\s*;\s*/, /\s{2,}/];

/**
 * Turns pasted / typed / OCR'd text into spreadsheet-like rows, one word per line:
 * `apple - quả táo`, `apple = quả táo`, `apple | quả táo`, `apple<TAB>quả táo<TAB>example`,
 * or two words separated by a wide gap (typical of OCR on a table).
 * Lines without a separator become a one-column row, which the preview flags as missing a meaning.
 */
export function parseTextToRows(text: string): string[][] {
  const rows: string[][] = [];
  for (const raw of text.replace(/^﻿/, '').split(/\r?\n/)) {
    const line = raw.replace(BULLET, '').trim();
    if (!line) continue;
    if (line.includes('\t')) {
      rows.push(line.split(/\t+/).map((c) => c.trim()));
      continue;
    }
    let row: string[] = [line];
    for (const sep of SEPARATORS) {
      const m = sep.exec(line);
      if (!m) continue;
      const left = line.slice(0, m.index).trim();
      const right = line.slice(m.index + m[0].length).trim();
      if (left && right) {
        row = [left, right];
        break;
      }
    }
    rows.push(row);
  }
  return rows;
}
