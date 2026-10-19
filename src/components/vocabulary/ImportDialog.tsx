import { useMemo, useState, type ReactNode } from 'react';
import { Download, FileSpreadsheet, FileText, Image as ImageIcon, Keyboard, Sparkles, Upload, X } from 'lucide-react';
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
import { parseTextToRows, TEXT_MAPPING } from '@/services/import/textImport';
import { recognizeImages } from '@/services/import/ocr';
import { tidyWordsWithDeepSeek } from '@/services/ai/deepseek';
import { bulkSaveWords, createCollection } from '@/services/database/repositories';
import { useSettingsStore } from '@/stores/settingsStore';
import { useAppStore } from '@/stores/appStore';
import { Button, Modal, Segmented, inputCls } from '@/components/common/ui';

const STATUS_STYLE: Record<ParsedRow['status'], { label: string; cls: string }> = {
  new: { label: 'New', cls: 'bg-candy-mint/40' },
  'duplicate-existing': { label: 'Already in collection', cls: 'bg-candy-sun/50' },
  'duplicate-file': { label: 'Duplicate in file', cls: 'bg-line/10' },
  invalid: { label: 'Invalid', cls: 'bg-candy-red/25' },
};

const PREVIEW_LIMIT = 200;

type Source = 'sheet' | 'text' | 'image';
type Target = 'new' | 'current';

const baseName = (name: string) => name.replace(/\.[^.]+$/, '');
const isTextFile = (f: File) => /\.txt$/i.test(f.name) || f.type === 'text/plain';

export function ImportDialog({
  collectionId,
  collectionName,
  existing,
  onImported,
  onClose,
}: {
  collectionId: string;
  collectionName: string;
  existing: VocabularyItem[];
  /** Called with the id of the set the words were saved into. */
  onImported: (collectionId: string) => void;
  onClose: () => void;
}) {
  const apiKey = useSettingsStore((s) => s.settings.deepseekApiKey);
  const navigate = useAppStore((s) => s.navigate);
  const [source, setSource] = useState<Source>('sheet');
  const [target, setTarget] = useState<Target>('new');
  const [setName, setSetName] = useState('');
  const [fileNames, setFileNames] = useState<string[]>([]);
  const [rows, setRows] = useState<SheetRows>([]);
  const [hasHeader, setHasHeader] = useState(true);
  const [mapping, setMapping] = useState<ColumnMapping | null>(null);
  const [text, setText] = useState('');
  const [policy, setPolicy] = useState<DuplicatePolicy>('skip');
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);

  const reset = () => {
    setDone(null);
    setError(null);
  };

  const appendText = (chunk: string) => setText((t) => (t.trim() ? `${t.replace(/\s+$/, '')}\n${chunk.trim()}` : chunk.trim()));

  const addTextFiles = async (files: File[]) => {
    for (const f of files) appendText(await f.text());
    setFileNames((n) => [...n, ...files.map((f) => f.name)]);
    setSource('text');
  };

  /** Excel / CSV: any number of files, stacked into one table. `.txt` files go to the text tab. */
  const onSheetFiles = async (files: File[]) => {
    if (files.length === 0) return;
    reset();
    setBusy(true);
    try {
      const sheets = files.filter((f) => !isTextFile(f));
      const texts = files.filter(isTextFile);
      if (texts.length) await addTextFiles(texts);
      if (sheets.length) {
        let all: SheetRows = rows;
        let header = hasHeader;
        let map = mapping;
        for (const file of sheets) {
          const data = await readSpreadsheet(file);
          if (data.length === 0) continue;
          const detected = detectMapping(data[0] ?? []);
          if (all.length === 0) {
            all = data;
            header = detected.hasHeader;
            map = detected.mapping;
          } else {
            // Later files share the first file's column layout; drop their own header row.
            all = [...all, ...(detected.hasHeader ? data.slice(1) : data)];
          }
        }
        if (all.length === 0) throw new Error('The files are empty.');
        setRows(all);
        setHasHeader(header);
        setMapping(map);
        setFileNames((n) => [...n, ...sheets.map((f) => f.name)]);
      }
    } catch (e) {
      setError(e instanceof Error ? `Could not read the file: ${e.message}` : 'Could not read the file.');
    } finally {
      setBusy(false);
    }
  };

  const onTextFiles = async (files: File[]) => {
    if (files.length === 0) return;
    reset();
    setBusy(true);
    try {
      await addTextFiles(files);
    } catch {
      setError('Could not read the text file.');
    } finally {
      setBusy(false);
    }
  };

  /** Images: OCR each one (one or many), then drop the text in the editor so it can be corrected. */
  const onImages = async (files: File[]) => {
    if (files.length === 0) return;
    reset();
    setBusy(true);
    setStatus('Loading text recognition (the first time downloads language data)…');
    try {
      const blocks = await recognizeImages(files, ({ index, total, fraction }) =>
        setStatus(`Reading image ${index + 1} of ${total}… ${Math.round(fraction * 100)}%`),
      );
      if (blocks.every((b) => !b.trim())) throw new Error('No text was found in the image(s).');
      blocks.forEach(appendText);
      setFileNames((n) => [...n, ...files.map((f) => f.name)]);
      setSource('text');
    } catch (e) {
      setError(e instanceof Error ? `Could not read the image: ${e.message}` : 'Could not read the image.');
    } finally {
      setStatus(null);
      setBusy(false);
    }
  };

  /** DeepSeek: fix OCR slips, translate missing meanings, add examples/levels. Result stays editable. */
  const onTidy = async () => {
    if (!apiKey) return;
    reset();
    setBusy(true);
    setStatus('Asking DeepSeek to tidy the list…');
    try {
      setText(await tidyWordsWithDeepSeek(text, apiKey));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'DeepSeek request failed.');
    } finally {
      setStatus(null);
      setBusy(false);
    }
  };

  const textRows = useMemo(() => (source === 'text' ? parseTextToRows(text) : []), [source, text]);
  const activeRows: SheetRows = source === 'text' ? textRows : source === 'sheet' ? rows : [];
  const activeMapping = source === 'text' ? TEXT_MAPPING : mapping;
  const activeHasHeader = source === 'text' ? false : hasHeader;

  const columns = useMemo(() => {
    const width = rows.reduce((m, r) => Math.max(m, r.length), 0);
    const header = hasHeader ? (rows[0] ?? []) : [];
    return Array.from({ length: width }, (_, i) => {
      const letter = String.fromCharCode(65 + (i % 26));
      const h = String(header[i] ?? '').trim();
      return { index: i, label: h ? `${letter} · ${h}` : `Column ${letter}` };
    });
  }, [rows, hasHeader]);

  const compareWith = useMemo(() => (target === 'current' ? existing : []), [target, existing]);
  const result = useMemo(() => {
    if (!activeMapping || activeRows.length === 0) return null;
    const body = activeHasHeader ? activeRows.slice(1) : activeRows;
    return parseRows(body, activeMapping, compareWith, activeHasHeader ? 2 : 1);
  }, [activeRows, activeMapping, activeHasHeader, compareWith]);

  const plan = result ? planImport(result, policy) : null;
  const mappingValid =
    !!activeMapping && activeMapping.english >= 0 && activeMapping.vietnamese >= 0 && activeMapping.english !== activeMapping.vietnamese;
  const defaultName = fileNames[0] ? baseName(fileNames[0]) : `Word set ${new Date().toLocaleDateString()}`;

  const doImport = async () => {
    if (!plan) return;
    setBusy(true);
    try {
      let id = collectionId;
      let label = `“${collectionName}”`;
      if (target === 'new') {
        const name = setName.trim() || defaultName;
        id = (await createCollection(name)).id;
        label = `the new set “${name}”`;
      }
      await bulkSaveWords(id, plan.inserts, plan.updates);
      setDone(
        `Saved ${plan.inserts.length} word(s)${plan.updates.length ? `, updated ${plan.updates.length}` : ''} to ${label}. Pick it on the Play screen to practise.`,
      );
      setRows([]);
      setMapping(null);
      setText('');
      setFileNames([]);
      onImported(id);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Import failed.');
    } finally {
      setBusy(false);
    }
  };

  const picker = (icon: ReactNode, label: string, accept: string, onPick: (f: File[]) => void, testId: string) => (
    <label className="btn-candy inline-flex cursor-pointer items-center gap-2 rounded-xl bg-candy-purple px-4 py-2 font-semibold text-white">
      {icon} {label}
      <input
        type="file"
        multiple
        accept={accept}
        className="sr-only"
        data-testid={testId}
        onChange={(e) => {
          onPick(Array.from(e.target.files ?? []));
          e.target.value = '';
        }}
      />
    </label>
  );

  const clearFiles = () => {
    setFileNames([]);
    setRows([]);
    setMapping(null);
    setText('');
  };

  return (
    <Modal title="Add words" onClose={onClose} wide>
      <div className="flex flex-col gap-4">
        <Segmented<Source>
          label="Where do the words come from?"
          value={source}
          onChange={(s) => {
            setSource(s);
            reset();
          }}
          options={[
            { value: 'sheet', label: 'Excel / CSV' },
            { value: 'text', label: 'Type or text file' },
            { value: 'image', label: 'Images' },
          ]}
        />

        <div className="flex flex-wrap items-center gap-2">
          {source === 'sheet' &&
            picker(
              <Upload size={18} />,
              'Choose Excel / CSV files',
              '.xlsx,.xls,.csv,.tsv,.ods,.txt,text/csv,text/plain,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
              (f) => void onSheetFiles(f),
              'import-file',
            )}
          {source === 'sheet' && (
            <Button variant="white" icon={<Download size={18} />} onClick={() => void downloadTemplate()}>
              Download template
            </Button>
          )}
          {source === 'text' && picker(<FileText size={18} />, 'Choose .txt files', '.txt,text/plain', (f) => void onTextFiles(f), 'import-text-file')}
          {source === 'image' && picker(<ImageIcon size={18} />, 'Choose images', 'image/*', (f) => void onImages(f), 'import-image')}
          {fileNames.length > 0 && (
            <span className="flex flex-wrap items-center gap-1 text-sm font-semibold text-ink-soft">
              <FileSpreadsheet size={16} /> {fileNames.length <= 2 ? fileNames.join(', ') : `${fileNames.length} files`}
              <button type="button" aria-label="Clear files" className="rounded-full p-0.5 hover:bg-surface" onClick={clearFiles}>
                <X size={14} />
              </button>
            </span>
          )}
        </div>

        {source === 'sheet' && (
          <p className="text-sm text-ink-soft">
            You can pick several files at once. Columns: <b>English</b>, <b>Vietnamese</b> (required), and optional Example, Level (A1–C2),
            Pronunciation, Part of speech, Tags. Headers are detected automatically.
          </p>
        )}
        {source === 'image' && (
          <p className="text-sm text-ink-soft">
            Choose one or more photos or screenshots of a word list. The text is read on your device, then shown in the next step so you can fix
            any mistakes. Lines like <b>apple - quả táo</b> work best.
          </p>
        )}
        {source === 'text' && (
          <div>
            <label htmlFor="import-text" className="mb-1 flex items-center gap-1 text-sm font-semibold">
              <Keyboard size={16} /> One word per line
            </label>
            <textarea
              id="import-text"
              data-testid="import-text"
              rows={7}
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                reset();
              }}
              placeholder={'apple - quả táo\nreliable = đáng tin cậy\nlook after | chăm sóc'}
              className={`${inputCls} font-mono text-sm`}
              spellCheck={false}
            />
            <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm text-ink-soft">
                Separate English and Vietnamese with <b>-</b>, <b>=</b>, <b>:</b>, <b>|</b>, a tab or a wide gap. Text from .txt files and images
                lands here so you can edit it before saving.
              </p>
              {apiKey ? (
                <Button size="sm" variant="sun" icon={<Sparkles size={16} />} disabled={busy || !text.trim()} onClick={() => void onTidy()} data-testid="import-ai">
                  Tidy with DeepSeek AI
                </Button>
              ) : (
                <Button size="sm" variant="white" icon={<Sparkles size={16} />} onClick={() => navigate('settings')}>
                  Add a DeepSeek key for AI help
                </Button>
              )}
            </div>
          </div>
        )}

        {busy && <p className="font-semibold text-ink-soft">{status ?? 'Working…'}</p>}
        {error && (
          <p role="alert" className="rounded-xl bg-candy-red/15 px-3 py-2 font-semibold text-candy-pink-dark">
            {error}
          </p>
        )}
        {done && (
          <p role="status" className="rounded-xl bg-candy-mint/40 px-3 py-2 font-semibold">
            {done}
          </p>
        )}

        {!done && result && activeMapping && (
          <>
            <div className="rounded-xl border-2 border-line bg-surface p-3">
              <h3 className="mb-2 font-bold">Save to</h3>
              <Segmented<Target>
                label="Save to"
                value={target}
                onChange={setTarget}
                options={[
                  { value: 'new', label: 'A new word set' },
                  ...(collectionId ? [{ value: 'current' as const, label: `Add to “${collectionName}”` }] : []),
                ]}
              />
              {target === 'new' && (
                <label className="mt-2 block text-sm">
                  <span className="mb-0.5 block font-semibold text-ink-soft">Name of the set</span>
                  <input
                    className={inputCls}
                    value={setName}
                    maxLength={60}
                    placeholder={defaultName}
                    data-testid="import-set-name"
                    onChange={(e) => setSetName(e.target.value)}
                  />
                </label>
              )}
            </div>

            {source === 'sheet' && mapping && (
              <div className="rounded-xl border-2 border-line bg-surface p-3">
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
                      <select className={inputCls} value={mapping[f]} onChange={(e) => setMapping({ ...mapping, [f]: Number(e.target.value) })}>
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
                {!mappingValid && (
                  <p className="mt-2 text-sm font-semibold text-candy-pink-dark">Map both English and Vietnamese to different columns.</p>
                )}
              </div>
            )}

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

            <div className="max-h-72 overflow-auto rounded-xl border-2 border-line bg-surface">
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
                Save {plan ? plan.inserts.length + plan.updates.length : 0} word(s)
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
