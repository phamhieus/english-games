import { useState } from 'react';
import { CEFR_LEVELS, type CefrLevel, type VocabularyItem } from '@/types';
import { addWord, findDuplicate, updateWord, type VocabularyDraft } from '@/services/database/repositories';
import { MAX_ENGLISH_LENGTH } from '@/services/import/importParser';
import { Button, Modal, inputCls } from '@/components/common/ui';

export function WordFormModal({
  collectionId,
  word,
  onClose,
}: {
  collectionId: string;
  word?: VocabularyItem;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<VocabularyDraft>({
    english: word?.english ?? '',
    vietnamese: word?.vietnamese ?? '',
    example: word?.example ?? '',
    pronunciation: word?.pronunciation ?? '',
    partOfSpeech: word?.partOfSpeech ?? '',
    level: word?.level,
    tags: word?.tags ?? [],
  });
  const [tags, setTags] = useState((word?.tags ?? []).join(', '));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const set = <K extends keyof VocabularyDraft>(k: K, v: VocabularyDraft[K]) => setDraft((d) => ({ ...d, [k]: v }));

  const save = async (addAnother: boolean) => {
    const english = draft.english.trim();
    if (!english || !draft.vietnamese.trim()) return setError('English and Vietnamese are required.');
    if (english.length > MAX_ENGLISH_LENGTH) return setError(`English must be at most ${MAX_ENGLISH_LENGTH} characters.`);
    setSaving(true);
    try {
      const dup = await findDuplicate(collectionId, english, word?.id);
      if (dup) {
        setError(`"${dup.english}" already exists in this collection.`);
        return;
      }
      const full = { ...draft, tags: tags.split(',').map((t) => t.trim()).filter(Boolean) };
      if (word) await updateWord(word.id, full);
      else await addWord(collectionId, full);
      if (addAnother) {
        setDraft({ english: '', vietnamese: '', example: '', pronunciation: '', partOfSpeech: '', level: draft.level });
        setError(null);
        document.getElementById('word-english')?.focus();
      } else onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={word ? 'Edit word' : 'Add word'} onClose={onClose}>
      <form
        className="grid gap-3 sm:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          void save(false);
        }}
      >
        <Field label="English *" htmlFor="word-english">
          <input id="word-english" className={inputCls} value={draft.english} onChange={(e) => set('english', e.target.value)} autoComplete="off" />
        </Field>
        <Field label="Vietnamese *" htmlFor="word-vietnamese">
          <input id="word-vietnamese" className={inputCls} value={draft.vietnamese} onChange={(e) => set('vietnamese', e.target.value)} autoComplete="off" />
        </Field>
        <Field label="Example sentence" htmlFor="word-example" wide>
          <input id="word-example" className={inputCls} value={draft.example ?? ''} onChange={(e) => set('example', e.target.value)} />
        </Field>
        <Field label="Pronunciation (IPA)" htmlFor="word-ipa">
          <input id="word-ipa" className={inputCls} value={draft.pronunciation ?? ''} onChange={(e) => set('pronunciation', e.target.value)} />
        </Field>
        <Field label="Part of speech" htmlFor="word-pos">
          <input id="word-pos" className={inputCls} value={draft.partOfSpeech ?? ''} onChange={(e) => set('partOfSpeech', e.target.value)} placeholder="noun, verb…" />
        </Field>
        <Field label="Level" htmlFor="word-level">
          <select
            id="word-level"
            className={inputCls}
            value={draft.level ?? ''}
            onChange={(e) => set('level', (e.target.value || undefined) as CefrLevel | undefined)}
          >
            <option value="">—</option>
            {CEFR_LEVELS.map((l) => (
              <option key={l}>{l}</option>
            ))}
          </select>
        </Field>
        <Field label="Tags (comma separated)" htmlFor="word-tags">
          <input id="word-tags" className={inputCls} value={tags} onChange={(e) => setTags(e.target.value)} />
        </Field>
        {error && <p className="rounded-2xl bg-candy-red/15 px-3 py-2 text-sm font-semibold text-candy-pink-dark sm:col-span-2" role="alert">{error}</p>}
        <div className="flex flex-wrap justify-end gap-2 sm:col-span-2">
          <Button onClick={onClose}>Cancel</Button>
          {!word && (
            <Button variant="mint" disabled={saving} onClick={() => void save(true)}>
              Save & add another
            </Button>
          )}
          <Button variant="pink" type="submit" disabled={saving}>
            Save
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function Field({ label, htmlFor, wide, children }: { label: string; htmlFor: string; wide?: boolean; children: React.ReactNode }) {
  return (
    <div className={wide ? 'sm:col-span-2' : ''}>
      <label htmlFor={htmlFor} className="mb-1 block text-sm font-semibold text-ink-soft">
        {label}
      </label>
      {children}
    </div>
  );
}
