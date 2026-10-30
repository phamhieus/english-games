import { useEffect, useMemo, useState } from 'react';
import {
  BookOpen,
  Download,
  Pencil,
  Play,
  Plus,
  Search,
  Sparkles,
  Trash2,
  Upload,
  Volume2,
} from 'lucide-react';
import { CEFR_LEVELS, type VocabularyItem, type WordProgress } from '@/types';
import { useCollections, useCollectionWords } from '@/hooks/useLibrary';
import { createCollection, deleteCollection, deleteWords, renameCollection, setWordsExcluded } from '@/services/database/repositories';
import { addSampleCollection } from '@/services/database/seed';
import { exportCsv } from '@/services/import/spreadsheet';
import { isDue, isMastered } from '@/features/learning/spacedRepetition';
import { mistakeWeight } from '@/features/learning/selection';
import { speech } from '@/services/speech/speech';
import { useAppStore } from '@/stores/appStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { Button, Card, ConfirmDialog, EmptyState, Modal, Switch, inputCls } from '@/components/common/ui';
import { FlatBalloon, SET_COLORS } from '@/components/common/Art';

import { WordFormModal } from './WordFormModal';
import { ImportDialog } from './ImportDialog';

type StatusFilter = 'all' | 'new' | 'due' | 'mistakes' | 'mastered';
const PAGE = 100;

function statusOf(p: WordProgress | undefined, now: number): { label: string; cls: string } {
  if (!p || p.attempts === 0) return { label: 'New', cls: 'bg-[#e3f2ff]' };
  if (isMastered(p)) return { label: 'Mastered', cls: 'bg-candy-mint/40' };
  if (isDue(p, now)) return { label: 'Due', cls: 'bg-candy-sun/50' };
  return { label: `${p.masteryScore}%`, cls: 'bg-candy-purple/20' };
}

export function LibraryScreen() {
  const collections = useCollections();
  const setup = useAppStore((s) => s.setup);
  const updateSetup = useAppStore((s) => s.updateSetup);
  const navigate = useAppStore((s) => s.navigate);
  const speechRate = useSettingsStore((s) => s.settings.speechRate);
  const [selectedId, setSelectedId] = useState<string | null>(setup.collectionIds[0] ?? null);
  const data = useCollectionWords(selectedId);
  const [query, setQuery] = useState('');
  const [level, setLevel] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [limit, setLimit] = useState(PAGE);
  const [editing, setEditing] = useState<VocabularyItem | 'new' | null>(null);
  const [importing, setImporting] = useState(false);
  const [naming, setNaming] = useState<{ mode: 'create' | 'rename'; value: string } | null>(null);
  const [confirm, setConfirm] = useState<{ kind: 'collection' } | { kind: 'word'; word: VocabularyItem } | null>(null);

  useEffect(() => {
    if (!collections) return;
    if (!collections.some((c) => c.id === selectedId)) setSelectedId(collections[0]?.id ?? null);
  }, [collections, selectedId]);

  const selected = collections?.find((c) => c.id === selectedId);

  const filtered = useMemo(() => {
    if (!data) return [];
    const now = Date.now();
    const q = query.trim().toLowerCase();
    return data.words.filter((w) => {
      if (q && !w.english.toLowerCase().includes(q) && !w.vietnamese.toLowerCase().includes(q) && !(w.tags ?? []).some((t) => t.toLowerCase().includes(q))) return false;
      if (level && w.level !== level) return false;
      const p = data.progress.get(w.id);
      switch (status) {
        case 'new':
          return !p || p.attempts === 0;
        case 'due':
          return isDue(p, now);
        case 'mastered':
          return isMastered(p);
        case 'mistakes':
          return mistakeWeight(p) > 0;
        default:
          return true;
      }
    });
  }, [data, query, level, status]);

  const saveName = async () => {
    if (!naming) return;
    const name = naming.value.trim();
    if (!name) return;
    if (naming.mode === 'create') {
      const c = await createCollection(name);
      setSelectedId(c.id);
    } else if (selectedId) await renameCollection(selectedId, name);
    setNaming(null);
  };

  const onConfirm = async () => {
    if (!confirm) return;
    if (confirm.kind === 'collection' && selectedId) {
      await deleteCollection(selectedId);
      setSelectedId(null);
    } else if (confirm.kind === 'word') await deleteWords([confirm.word.id]);
    setConfirm(null);
  };

  const now = Date.now();
  const practised = data ? data.words.filter((w) => !w.excluded).length : 0;
  const shownOn = filtered.filter((w) => !w.excluded).length;
  const allShownOn = filtered.length > 0 && shownOn === filtered.length;

  return (
    <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
      <Card className="flex flex-col gap-2 p-4 lg:self-start">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">Word sets</h2>
          <Button size="sm" variant="mint" icon={<Plus size={16} />} onClick={() => setNaming({ mode: 'create', value: '' })}>
            New
          </Button>
        </div>
        <ul className="flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible" aria-label="Collections">
          {collections?.map((c, i) => (
            <li key={c.id} className="shrink-0">
              <button
                type="button"
                onClick={() => {
                  setSelectedId(c.id);
                  setLimit(PAGE);
                }}
                aria-current={c.id === selectedId}
                className={`flex w-full items-center justify-between gap-3 rounded-xl border-2 px-3 py-2 text-left font-semibold transition ${
                  c.id === selectedId ? 'border-line bg-candy-purple text-white shadow-[0_3px_0_var(--color-line)]' : 'border-line/15 bg-surface hover:border-line'
                }`}
              >
                <span className="flex min-w-0 items-center gap-2">
                  <FlatBalloon color={SET_COLORS[i % SET_COLORS.length]![0]} shade={SET_COLORS[i % SET_COLORS.length]![1]} className="w-4 shrink-0" />
                  <span className="truncate font-display">{c.name}</span>
                </span>
                <span className={`text-sm ${c.id === selectedId ? 'text-white/80' : 'text-ink-soft'}`}>{c.wordCount}</span>
              </button>
            </li>
          ))}
        </ul>
        {collections?.length === 0 && (
          <div className="flex flex-col gap-2 text-sm text-ink-soft">
            No collections yet.
            <Button size="sm" icon={<Sparkles size={16} />} onClick={() => void addSampleCollection().then(setSelectedId)}>
              Add the Basic set
            </Button>
          </div>
        )}
      </Card>

      <Card className="min-w-0 p-4 sm:p-5">
        {!selected ? (
          <EmptyState icon={<BookOpen size={48} />} title="Create your first collection">
            Collections group your vocabulary, e.g. “IELTS Topic: Environment”.
            <div className="mt-4">
              <Button variant="sun" icon={<Upload size={18} />} onClick={() => setImporting(true)}>
                Import words
              </Button>
            </div>
          </EmptyState>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h1 className="min-w-0 truncate text-3xl font-bold">
                {selected.name}
                <span className="ml-2 align-middle text-base font-semibold text-ink-soft">
                  {selected.wordCount} words{data && practised < data.words.length ? ` · ${practised} practised` : ''}
                </span>
              </h1>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="pink"
                  icon={<Play size={16} />}
                  disabled={!data?.words.length}
                  onClick={() => {
                    updateSetup({ collectionIds: [selected.id] });
                    navigate('home');
                  }}
                >
                  Play this
                </Button>
                <Button size="sm" icon={<Pencil size={16} />} onClick={() => setNaming({ mode: 'rename', value: selected.name })}>
                  Rename
                </Button>
                <Button size="sm" variant="ghost" icon={<Trash2 size={16} />} onClick={() => setConfirm({ kind: 'collection' })}>
                  Delete
                </Button>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button variant="purple" icon={<Plus size={18} />} onClick={() => setEditing('new')}>
                Add word
              </Button>
              <Button variant="sun" icon={<Upload size={18} />} onClick={() => setImporting(true)}>
                Import words
              </Button>
              <Button icon={<Download size={18} />} disabled={!data?.words.length} onClick={() => data && exportCsv(data.words, `${selected.name}.csv`)}>
                Export CSV
              </Button>
            </div>

            <div className="flex flex-wrap gap-2">
              <div className="relative min-w-[180px] flex-1">
                <Search size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft" />
                <input
                  className={`${inputCls} pl-9`}
                  placeholder="Search English, Vietnamese or tag…"
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setLimit(PAGE);
                  }}
                  aria-label="Search words"
                />
              </div>
              <select className={`${inputCls} w-auto!`} value={level} onChange={(e) => setLevel(e.target.value)} aria-label="Filter by level">
                <option value="">All levels</option>
                {CEFR_LEVELS.map((l) => (
                  <option key={l}>{l}</option>
                ))}
              </select>
              <select className={`${inputCls} w-auto!`} value={status} onChange={(e) => setStatus(e.target.value as StatusFilter)} aria-label="Filter by status">
                <option value="all">All words</option>
                <option value="new">Not practiced</option>
                <option value="due">Due for review</option>
                <option value="mistakes">Mistakes</option>
                <option value="mastered">Mastered</option>
              </select>
            </div>

            {data && data.words.length === 0 ? (
              <EmptyState icon={<Sparkles size={44} />} title="No words yet">
                Add words one by one or import a spreadsheet.
              </EmptyState>
            ) : (
              <>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm text-ink-soft">
                    Showing {Math.min(limit, filtered.length)} of {filtered.length} word(s)
                  </p>
                  {/* switch every shown word on or off for practice (follows the search and filters) */}
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <span className="rounded-full border-2 border-line bg-surface px-2 py-0.5 text-xs font-bold tabular-nums">
                      {shownOn}/{filtered.length} on
                    </span>
                    <span>Select all</span>
                    <Switch
                      checked={allShownOn}
                      onChange={(on) => void setWordsExcluded(filtered.map((w) => w.id), !on)}
                      label="Practise all shown words"
                    />
                  </div>
                </div>
                <ul className="flex flex-col gap-2" data-testid="word-list">
                  {filtered.slice(0, limit).map((w) => {
                    const st = statusOf(data?.progress.get(w.id), now);
                    return (
                      <li
                        key={w.id}
                        className={`tile flex items-center gap-3 rounded-xl bg-surface px-3 py-2 transition hover:border-line/40 ${w.excluded ? 'opacity-55' : ''}`}
                      >
                        <Switch checked={!w.excluded} onChange={(on) => void setWordsExcluded([w.id], !on)} label={`Practise ${w.english}`} />
                        <button
                          type="button"
                          aria-label={`Pronounce ${w.english}`}
                          onClick={() => speech.speak(w.english, { rate: speechRate })}
                          className="rounded-full border-2 border-line bg-candy-mint p-1.5 transition hover:-rotate-12"
                        >
                          <Volume2 size={16} />
                        </button>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-baseline gap-x-2">
                            <span className="font-bold">{w.english}</span>
                            {w.pronunciation && <span className="text-sm text-ink-soft">{w.pronunciation}</span>}
                            {w.partOfSpeech && <span className="text-xs italic text-ink-soft">{w.partOfSpeech}</span>}
                          </div>
                          <div className="truncate text-sm text-ink-soft">{w.vietnamese}</div>
                        </div>
                        {w.level && <span className="hidden rounded-full bg-cream px-2 py-0.5 text-xs font-bold sm:inline">{w.level}</span>}
                        <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${st.cls}`}>{st.label}</span>
                        <button type="button" aria-label={`Edit ${w.english}`} onClick={() => setEditing(w)} className="rounded-full p-2 text-ink-soft hover:bg-cream">
                          <Pencil size={16} />
                        </button>
                        <button type="button" aria-label={`Delete ${w.english}`} onClick={() => setConfirm({ kind: 'word', word: w })} className="rounded-full p-2 text-ink-soft hover:bg-cream">
                          <Trash2 size={16} />
                        </button>
                      </li>
                    );
                  })}
                </ul>
                {filtered.length > limit && (
                  <Button className="self-center" onClick={() => setLimit((l) => l + PAGE)}>
                    Show more
                  </Button>
                )}
              </>
            )}
          </div>
        )}
      </Card>

      {editing && selectedId && (
        <WordFormModal collectionId={selectedId} word={editing === 'new' ? undefined : editing} onClose={() => setEditing(null)} />
      )}
      {importing && (
        <ImportDialog
          collectionId={selectedId ?? ''}
          collectionName={selected?.name ?? ''}
          existing={data?.words ?? []}
          onImported={(id) => {
            setSelectedId(id);
            updateSetup({ collectionIds: [id] });
          }}
          onClose={() => setImporting(false)}
        />
      )}
      {naming && (
        <Modal title={naming.mode === 'create' ? 'New collection' : 'Rename collection'} onClose={() => setNaming(null)}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void saveName();
            }}
            className="flex flex-col gap-3"
          >
            <input
              className={inputCls}
              value={naming.value}
              onChange={(e) => setNaming({ ...naming, value: e.target.value })}
              placeholder="e.g. IELTS – Environment"
              aria-label="Collection name"
              maxLength={60}
            />
            <div className="flex justify-end gap-2">
              <Button onClick={() => setNaming(null)}>Cancel</Button>
              <Button variant="pink" type="submit" disabled={!naming.value.trim()}>
                Save
              </Button>
            </div>
          </form>
        </Modal>
      )}
      {confirm && (
        <ConfirmDialog
          title={confirm.kind === 'collection' ? 'Delete collection?' : 'Delete word?'}
          message={
            confirm.kind === 'collection'
              ? `“${selected?.name}” and its ${selected?.wordCount ?? 0} word(s) and learning progress will be deleted. Past game history is kept.`
              : `“${confirm.word.english}” and its learning progress will be deleted.`
          }
          onConfirm={() => void onConfirm()}
          onCancel={() => setConfirm(null)}
        />
      )}
    </div>
  );
}
