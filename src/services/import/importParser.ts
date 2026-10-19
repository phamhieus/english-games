import { CEFR_LEVELS, type CefrLevel, type VocabularyItem } from '@/types';
import type { VocabularyDraft } from '@/services/database/repositories';
import { normalizeAnswer } from '@/utils/text';

export type FieldKey = 'english' | 'vietnamese' | 'example' | 'level' | 'pronunciation' | 'partOfSpeech' | 'tags';

export const FIELD_LABELS: Record<FieldKey, string> = {
  english: 'English *',
  vietnamese: 'Vietnamese *',
  example: 'Example',
  level: 'Level',
  pronunciation: 'Pronunciation',
  partOfSpeech: 'Part of speech',
  tags: 'Tags',
};

export const FIELD_KEYS = Object.keys(FIELD_LABELS) as FieldKey[];

/** Column index for each field, or -1 when not mapped. */
export type ColumnMapping = Record<FieldKey, number>;

const ALIASES: Record<FieldKey, string[]> = {
  english: ['english', 'word', 'term', 'vocabulary', 'vocab', 'tiếng anh', 'tieng anh', 'từ', 'tu vung', 'từ vựng', 'en'],
  vietnamese: ['vietnamese', 'meaning', 'translation', 'definition', 'tiếng việt', 'tieng viet', 'nghĩa', 'nghia', 'vi', 'vn'],
  example: ['example', 'example sentence', 'sentence', 'ví dụ', 'vi du'],
  level: ['level', 'cefr', 'cấp độ', 'trình độ'],
  pronunciation: ['pronunciation', 'ipa', 'phonetic', 'phát âm', 'phat am'],
  partOfSpeech: ['part of speech', 'pos', 'type', 'word type', 'từ loại', 'tu loai'],
  tags: ['tags', 'tag', 'topic', 'category', 'chủ đề', 'chu de'],
};

export const MAX_ENGLISH_LENGTH = 60;

function headerKey(h: unknown): string {
  return String(h ?? '').normalize('NFC').trim().toLowerCase().replace(/[_*]/g, ' ').replace(/\s+/g, ' ');
}

/** Guesses a mapping from the header row; falls back to "column A = English, B = Vietnamese". */
export function detectMapping(header: readonly unknown[]): { mapping: ColumnMapping; hasHeader: boolean } {
  const mapping = Object.fromEntries(FIELD_KEYS.map((k) => [k, -1])) as ColumnMapping;
  const keys = header.map(headerKey);
  let found = 0;
  for (const field of FIELD_KEYS) {
    const idx = keys.findIndex((k) => ALIASES[field].includes(k));
    if (idx >= 0 && !Object.values(mapping).includes(idx)) {
      mapping[field] = idx;
      found++;
    }
  }
  const hasHeader = mapping.english >= 0 || mapping.vietnamese >= 0 || found >= 2;
  if (!hasHeader) {
    mapping.english = 0;
    mapping.vietnamese = header.length > 1 ? 1 : -1;
  }
  return { mapping, hasHeader };
}

export type RowStatus = 'new' | 'duplicate-existing' | 'duplicate-file' | 'invalid';

export interface ParsedRow {
  /** 1-based row number in the source sheet (for error messages). */
  rowNumber: number;
  draft: VocabularyDraft;
  status: RowStatus;
  errors: string[];
  warnings: string[];
  /** Existing word id when status = duplicate-existing. */
  existingId?: string;
}

export interface ParseResult {
  rows: ParsedRow[];
  counts: Record<RowStatus, number>;
}

function cell(row: readonly unknown[], idx: number): string {
  if (idx < 0) return '';
  const v = row[idx];
  if (v === null || v === undefined) return '';
  return String(v).normalize('NFC').replace(/\s+/g, ' ').trim();
}

function parseLevel(raw: string): CefrLevel | undefined {
  const up = raw.toUpperCase();
  return (CEFR_LEVELS as readonly string[]).includes(up) ? (up as CefrLevel) : undefined;
}

/**
 * Validates spreadsheet rows (header row excluded) against a mapping and detects
 * duplicates both within the file and against the existing collection.
 * Blank rows are silently skipped.
 */
export function parseRows(
  rows: readonly (readonly unknown[])[],
  mapping: ColumnMapping,
  existing: readonly Pick<VocabularyItem, 'id' | 'english'>[],
  firstRowNumber = 2,
): ParseResult {
  const existingByKey = new Map(existing.map((w) => [normalizeAnswer(w.english), w.id]));
  const seen = new Set<string>();
  const out: ParsedRow[] = [];
  rows.forEach((row, i) => {
    if (!row || row.every((c) => String(c ?? '').trim() === '')) return;
    const errors: string[] = [];
    const warnings: string[] = [];
    const english = cell(row, mapping.english);
    const vietnamese = cell(row, mapping.vietnamese);
    const levelRaw = cell(row, mapping.level);
    const level = levelRaw ? parseLevel(levelRaw) : undefined;
    if (!english) errors.push('Missing English word');
    else if (english.length > MAX_ENGLISH_LENGTH) errors.push(`English is longer than ${MAX_ENGLISH_LENGTH} characters`);
    if (!vietnamese) errors.push('Missing Vietnamese meaning');
    if (levelRaw && !level) warnings.push(`Unknown level "${levelRaw}" ignored`);
    const tagsRaw = cell(row, mapping.tags);
    const draft: VocabularyDraft = {
      english,
      vietnamese,
      example: cell(row, mapping.example) || undefined,
      pronunciation: cell(row, mapping.pronunciation) || undefined,
      partOfSpeech: cell(row, mapping.partOfSpeech) || undefined,
      level,
      tags: tagsRaw ? tagsRaw.split(/[,;]/).map((t) => t.trim()).filter(Boolean) : undefined,
    };
    let status: RowStatus = 'new';
    let existingId: string | undefined;
    if (errors.length) status = 'invalid';
    else {
      const key = normalizeAnswer(english);
      if (seen.has(key)) status = 'duplicate-file';
      else if (existingByKey.has(key)) {
        status = 'duplicate-existing';
        existingId = existingByKey.get(key);
      }
      seen.add(key);
    }
    out.push({ rowNumber: firstRowNumber + i, draft, status, errors, warnings, existingId });
  });
  const counts: Record<RowStatus, number> = { new: 0, 'duplicate-existing': 0, 'duplicate-file': 0, invalid: 0 };
  for (const r of out) counts[r.status]++;
  return { rows: out, counts };
}

export type DuplicatePolicy = 'skip' | 'update';

/** Turns a parse result into the inserts/updates to apply. */
export function planImport(result: ParseResult, policy: DuplicatePolicy) {
  const inserts: VocabularyDraft[] = [];
  const updates: { id: string; draft: VocabularyDraft }[] = [];
  for (const r of result.rows) {
    if (r.status === 'new') inserts.push(r.draft);
    else if (r.status === 'duplicate-existing' && policy === 'update' && r.existingId) {
      updates.push({ id: r.existingId, draft: r.draft });
    }
  }
  return { inserts, updates };
}
