import { useMemo, useState } from 'react';
import { Download, FileSpreadsheet, Upload } from 'lucide-react';
import type { VocabularyItem } from '@/types';
import {
  detectMapping,
  FIELD_KEYS,
  FIELD_LABELS,
  parseRows,
  planImport,
  type ColumnMapping,
  type DuplicatePolicy,
  type ParsedRow,
} from '@/services/import/importParser';
import { downloadTemplate, readSpreadsheet, type SheetRows } from '@/services/import/spreadsheet';
import { bulkSaveWords } from '@/services/database/repositories';
import { Button, Modal, Segmented, inputCls } from '@/components/common/ui';

const STATUS_STYLE: Record<ParsedRow['status'], { label: string; cls: string }> = {
  new: { label: 'New', cls: 'bg-candy-mint/40' },
  'duplicate-existing': { label: 'Already in collection', cls: 'bg-candy-sun/50' },
  'duplicate-file': { label: 'Duplicate in file', cls: 'bg-ink/10' },
  invalid: { label: 'Invalid', cls: 'bg-candy-red/25' },
};

const PREVIEW_LIMIT = 200;

export function ImportDialog({
  collectionId,
  existing,
  onClose,
}: {
  collectionId: string;
  existing: VocabularyItem[];
  onClose: () => void;
}) {
  const [fileName, setFileName] = useState<string | null>(null);
  const [rows, setRows] = useState<SheetRows>([]);
  const [hasHeader, setHasHeader] = useState(true);
  const [mapping, setMapping] = useState<ColumnMapping | null>(null);
  const [policy, setPolicy] = useState<DuplicatePolicy>('skip');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    setDone(null);
    setBusy(true);
    try {
      const data = await readSpreadsheet(file);
      if (data.length === 0) throw new Error('The file is empty.');
      const detected = detectMapping(data[0] ?? []);
      setRows(data);
      setHasHeader(detected.hasHeader);
      setMapping(detected.mapping);
      setFileName(file.name);
    } catch (e) {
      setError(e instanceof Error ? `Could not read the file: ${e.message}` : 'Could not read the file.');
    } finally {
      setBusy(false);
    }
  };

  const columns = useMemo(() => {
    const width = rows.reduce((m, r) => Math.max(m, r.length), 0);
    const header = hasHeader ? (rows[0] ?? []) : [];
    return Array.from({ length: width }, (_, i) => {
      const letter = String.fromCharCode(65 + (i % 26));
      const h = String(header[i] ?? '').trim();
      return { index: i, label: h ? `${letter} · ${h}` : `Column ${letter}` };
    });
  }, [rows, hasHeader]);

  const result = useMemo(() => {
    if (!mapping) return null;
    const body = hasHeader ? rows.slice(1) : rows;
    return parseRows(body, mapping, existing, hasHeader ? 2 : 1);
  }, [rows, mapping, hasHeader, existing]);

  const plan = result ? planImport(result, policy) : null;
  const mappingValid = !!mapping && mapping.english >= 0 && mapping.vietnamese >= 0 && mapping.english !== mapping.vietnamese;

  const doImport = async () => {
    if (!plan) return;
    setBusy(true);
    try {
      await bulkSaveWords(collectionId, plan.inserts, plan.updates);
      setDone(`Imported ${plan.inserts.length} new word(s)${plan.updates.length ? `, updated ${plan.updates.length}` : ''}.`);
      setRows([]);
      setMapping(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Import failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title="Import vocabulary" onClose={onClose} wide>
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <label className="btn-candy inline-flex cursor-pointer items-center gap-2 rounded-2xl bg-candy-purple px-4 py-2 font-semibold text-white" style={{ ['--shadow' as string]: 'var(--color-candy-purple-dark)' }}>
            <Upload size={18} /> Choose Excel / CSV file
            <input
              type="file"
              accept=".xlsx,.xls,.csv,.tsv,.ods,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              className="sr-only"
              data-testid="import-file"
              onChange={(e) => {
                void onFile(e.target.files?.[0]);
                e.target.value = '';
              }}
            />
          </label>
          <Button variant="white" icon={<Download size={18} />} onClick={() => void downloadTemplate()}>
            Download template
          </Button>
          {fileName && (
            <span className="flex items-center gap-1 text-sm font-semibold text-ink-soft">
              <FileSpreadsheet size={16} /> {fileName}
            </span>
          )}
        </div>
        <p className="text-sm text-ink-soft">
          Columns: <b>English</b>, <b>Vietnamese</b> (required), and optional Example, Level (A1–C2), Pronunciation, Part of speech, Tags.
          Headers are detected automatically; you can change the mapping below.
        </p>
        {busy && <p className="font-semibold text-ink-soft">Working…</p>}
        {error && <p role="alert" className="rounded-2xl bg-candy-red/15 px-3 py-2 font-semibold text-candy-pink-dark">{error}</p>}
        {done && <p role="status" className="rounded-2xl bg-candy-mint/40 px-3 py-2 font-semibold">{done}</p>}

        {mapping && result && (
          <>
            <div className="rounded-2xl bg-white p-3">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-bold">Column mapping</h3>
                <label className="flex items-center gap-2 text-sm font-semibold">
                  <input type="checkbox" checked={hasHeader} onChange={(e) => setHasHeader(e.target.checked)} /> First row is a header
                </label>
              </div>
              <div className="grid gap-2 sm:grid-cols-4">
                {FIELD_KEYS.map((f) => (
                  <label key={f} className="text-sm">
                    <span className="mb-0.5 block font-semibold text-ink-soft">{FIELD_LABELS[f]}</span>
                    <select
                      className={inputCls}
                      value={mapping[f]}
                      onChange={(e) => setMapping({ ...mapping, [f]: Number(e.target.value) })}
                    >
                      <option value={-1}>— not used —</option>
                      {columns.map((c) => (
                        <option key={c.index} value={c.index}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </label>
                ))}
              </div>
              {!mappingValid && <p className="mt-2 text-sm font-semibold text-candy-pink-dark">Map both English and Vietnamese to different columns.</p>}
            </div>

            <div className="flex flex-wrap gap-2 text-sm font-semibold">
              {(Object.keys(STATUS_STYLE) as ParsedRow['status'][]).map((s) => (
                <span key={s} className={`rounded-full px-3 py-1 ${STATUS_STYLE[s].cls}`}>
                  {STATUS_STYLE[s].label}: {result.counts[s]}
                </span>
              ))}
            </div>

            {result.counts['duplicate-existing'] > 0 && (
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-sm font-semibold">Words already in the collection:</span>
                <Segmented<DuplicatePolicy>
                  label="Duplicate handling"
                  value={policy}
                  onChange={setPolicy}
                  options={[
                    { value: 'skip', label: 'Skip' },
                    { value: 'update', label: 'Update them' },
                  ]}
                />
              </div>
            )}

            <div className="max-h-72 overflow-auto rounded-2xl bg-white">
              <table className="w-full text-left text-sm">
                <thead className="sticky top-0 bg-cream">
                  <tr>
                    <th className="px-3 py-2">Row</th>
                    <th className="px-3 py-2">English</th>
                    <th className="px-3 py-2">Vietnamese</th>
                    <th className="hidden px-3 py-2 sm:table-cell">Level</th>
                    <th className="px-3 py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {result.rows.slice(0, PREVIEW_LIMIT).map((r) => (
                    <tr key={r.rowNumber} className="border-t border-cream align-top">
                      <td className="px-3 py-1.5 tabular-nums text-ink-soft">{r.rowNumber}</td>
                      <td className="px-3 py-1.5 font-semibold">{r.draft.english || '—'}</td>
                      <td className="px-3 py-1.5">{r.draft.vietnamese || '—'}</td>
                      <td className="hidden px-3 py-1.5 sm:table-cell">{r.draft.level ?? ''}</td>
                      <td className="px-3 py-1.5">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_STYLE[r.status].cls}`}>
                          {STATUS_STYLE[r.status].label}
                        </span>
                        {[...r.errors, ...r.warnings].map((m) => (
                          <div key={m} className="text-xs text-candy-pink-dark">
                            {m}
                          </div>
                        ))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {result.rows.length > PREVIEW_LIMIT && (
                <p className="px-3 py-2 text-sm text-ink-soft">…and {result.rows.length - PREVIEW_LIMIT} more rows.</p>
              )}
            </div>

            <div className="flex justify-end gap-2">
              <Button onClick={onClose}>Cancel</Button>
              <Button
                variant="pink"
                disabled={busy || !mappingValid || !plan || plan.inserts.length + plan.updates.length === 0}
                onClick={() => void doImport()}
                data-testid="import-confirm"
              >
                Import {plan ? plan.inserts.length + plan.updates.length : 0} word(s)
              </Button>
            </div>
          </>
        )}
        {done && (
          <div className="flex justify-end">
            <Button variant="pink" onClick={onClose}>
              Done
            </Button>
          </div>
        )}
      </div>
    </Modal>
  );
}
