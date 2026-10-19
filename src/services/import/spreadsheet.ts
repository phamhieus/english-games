import type { VocabularyItem } from '@/types';

export type SheetRows = unknown[][];

/** SheetJS is loaded on demand so it doesn't weigh down the initial bundle. */
const loadXlsx = () => import('xlsx');

/** Reads the first sheet of an .xlsx/.xls/.csv file into raw rows. */
export async function readSpreadsheet(file: File): Promise<SheetRows> {
  const XLSX = await loadXlsx();
  const isCsv = /\.(csv|tsv|txt)$/i.test(file.name) || file.type === 'text/csv';
  // CSV is read as text so UTF-8 Vietnamese characters survive regardless of BOM.
  const wb = isCsv
    ? XLSX.read((await file.text()).replace(/^﻿/, ''), { type: 'string', raw: true })
    : XLSX.read(await file.arrayBuffer(), { type: 'array' });
  const name = wb.SheetNames[0];
  const sheet = name ? wb.Sheets[name] : undefined;
  if (!sheet) throw new Error('The file has no sheets.');
  return XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, blankrows: false, defval: '', raw: false });
}

const EXPORT_HEADER = ['English', 'Vietnamese', 'Example', 'Level', 'Pronunciation', 'Part of speech', 'Tags'];

function toRow(w: VocabularyItem): string[] {
  return [
    w.english,
    w.vietnamese,
    w.example ?? '',
    w.level ?? '',
    w.pronunciation ?? '',
    w.partOfSpeech ?? '',
    (w.tags ?? []).join(', '),
  ];
}

function csvEscape(v: string): string {
  return /[",\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

export function wordsToCsv(words: readonly VocabularyItem[]): string {
  const lines = [EXPORT_HEADER, ...words.map(toRow)].map((r) => r.map(csvEscape).join(','));
  return lines.join('\r\n');
}

export function downloadBlob(content: BlobPart, filename: string, type: string): void {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function exportCsv(words: readonly VocabularyItem[], filename: string): void {
  // BOM so Excel opens UTF-8 Vietnamese correctly.
  downloadBlob('﻿' + wordsToCsv(words), filename, 'text/csv;charset=utf-8');
}

export async function downloadTemplate(): Promise<void> {
  const XLSX = await loadXlsx();
  const ws = XLSX.utils.aoa_to_sheet([
    ['English', 'Vietnamese', 'Example', 'Level'],
    ['apple', 'quả táo', 'I eat an apple.', 'A1'],
    ['achieve', 'đạt được', 'She achieved her goal.', 'B1'],
    ['reliable', 'đáng tin cậy', 'A reliable source.', 'B2'],
    ['look after', 'chăm sóc', 'She looks after her brother.', 'A2'],
  ]);
  ws['!cols'] = [{ wch: 18 }, { wch: 22 }, { wch: 34 }, { wch: 8 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Vocabulary');
  XLSX.writeFile(wb, 'word-shooter-template.xlsx');
}
