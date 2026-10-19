import { useEffect, useMemo } from 'react';
import { BookOpen, Keyboard, Languages, Play, RotateCcw, Sparkles } from 'lucide-react';
import type { Difficulty, GameMode, PracticeSize, SessionStyle } from '@/types';
import { DIFFICULTIES } from '@/game/config/gameConfig';
import { useAppStore } from '@/stores/appStore';
import { useCollections, useCollectionWords } from '@/hooks/useLibrary';
import { mistakePool } from '@/features/learning/selection';
import { isDue, isMastered } from '@/features/learning/spacedRepetition';
import { Button, Card, EmptyState, Segmented } from '@/components/common/ui';

const MODES: { value: GameMode; title: string; desc: string; icon: typeof Keyboard; badge?: string }[] = [
  { value: 'copy', title: 'Copy Typing', desc: 'See the English word, type it. Great for spelling.', icon: Keyboard },
  {
    value: 'recall',
    title: 'Vietnamese → English',
    desc: 'See the meaning, recall and type the English word.',
    icon: Languages,
    badge: 'Recommended',
  },
  { value: 'mistakes', title: 'Mistake Review', desc: 'Only words you missed or got wrong, until mastered.', icon: RotateCcw },
];

const SIZES: { value: string; label: string }[] = [
  { value: '10', label: '10 words' },
  { value: '20', label: '20 words' },
  { value: '30', label: '30 words' },
  { value: 'all', label: 'All' },
];

export function HomeScreen() {
  const setup = useAppStore((s) => s.setup);
  const updateSetup = useAppStore((s) => s.updateSetup);
  const startGame = useAppStore((s) => s.startGame);
  const navigate = useAppStore((s) => s.navigate);
  const collections = useCollections();
  const data = useCollectionWords(setup.collectionId);

  // Pick a collection automatically when none (or a deleted one) is selected.
  useEffect(() => {
    if (!collections) return;
    if (!collections.some((c) => c.id === setup.collectionId)) {
      updateSetup({ collectionId: collections.find((c) => c.wordCount > 0)?.id ?? collections[0]?.id ?? null });
    }
  }, [collections, setup.collectionId, updateSetup]);

  const collection = collections?.find((c) => c.id === setup.collectionId);
  const stats = useMemo(() => {
    if (!data) return null;
    const now = Date.now();
    const words = data.words;
    return {
      total: words.length,
      fresh: words.filter((w) => !data.progress.get(w.id)?.attempts).length,
      due: words.filter((w) => isDue(data.progress.get(w.id), now)).length,
      mastered: words.filter((w) => isMastered(data.progress.get(w.id))).length,
      mistakes: mistakePool(words, data.progress).length,
    };
  }, [data]);

  if (collections && collections.length === 0) {
    return (
      <Card className="p-6">
        <EmptyState icon={<BookOpen size={48} />} title="No vocabulary yet">
          Create a collection or import a spreadsheet in the Library to start playing.
          <div className="mt-4">
            <Button variant="pink" onClick={() => navigate('library')}>
              Open Library
            </Button>
          </div>
        </EmptyState>
      </Card>
    );
  }

  // While loading, `stats` is null — don't flash an "empty" warning.
  const poolEmpty = !!stats && (setup.mode === 'mistakes' ? stats.mistakes === 0 : stats.total === 0);
  const allMastered = !!stats && stats.total > 0 && stats.mastered === stats.total;

  const start = () => {
    if (!collection || !stats || poolEmpty) return;
    startGame({
      collectionId: collection.id,
      collectionName: collection.name,
      mode: setup.mode,
      difficulty: setup.difficulty,
      style: setup.style,
      practiceSize: setup.practiceSize,
    });
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
      <div className="flex flex-col gap-4">
        <Card className="p-5">
          <h1 className="mb-1 text-3xl font-bold text-candy-purple-dark">Pop words, learn words! 🎯</h1>
          <p className="text-ink-soft">Type the English word to pop each balloon before it reaches the bottom.</p>
        </Card>

        <Card className="p-5">
          <h2 className="mb-3 text-lg font-bold">1 · Game mode</h2>
          <div className="grid gap-3 sm:grid-cols-3" role="radiogroup" aria-label="Game mode">
            {MODES.map((m) => {
              const active = setup.mode === m.value;
              const Icon = m.icon;
              return (
                <button
                  key={m.value}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => updateSetup({ mode: m.value })}
                  className={`btn-candy relative flex flex-col items-start gap-1 rounded-3xl p-4 text-left ${
                    active ? 'bg-candy-purple text-white' : 'bg-white'
                  }`}
                  style={{ ['--shadow' as string]: active ? 'var(--color-candy-purple-dark)' : 'rgba(93,80,160,.2)' }}
                >
                  {m.badge && (
                    <span className="absolute right-3 top-3 rounded-full bg-candy-sun px-2 py-0.5 text-xs font-bold text-ink">
                      {m.badge}
                    </span>
                  )}
                  <Icon size={26} />
                  <span className="font-bold">{m.title}</span>
                  <span className={`text-sm ${active ? 'text-white/85' : 'text-ink-soft'}`}>{m.desc}</span>
                </button>
              );
            })}
          </div>
        </Card>

        <Card className="flex flex-col gap-4 p-5">
          <div>
            <h2 className="mb-3 text-lg font-bold">2 · Difficulty</h2>
            <Segmented<Difficulty>
              label="Difficulty"
              value={setup.difficulty}
              onChange={(difficulty) => updateSetup({ difficulty })}
              options={(Object.keys(DIFFICULTIES) as Difficulty[]).map((d) => ({
                value: d,
                label: DIFFICULTIES[d].label,
                hint: DIFFICULTIES[d].hint,
              }))}
            />
            <p className="mt-2 text-sm text-ink-soft">{DIFFICULTIES[setup.difficulty].hint}</p>
          </div>
          <div>
            <h2 className="mb-3 text-lg font-bold">3 · Session</h2>
            <Segmented<SessionStyle>
              label="Session style"
              value={setup.style}
              onChange={(style) => updateSetup({ style })}
              options={[
                { value: 'practice', label: 'Practice session' },
                { value: 'endless', label: 'Endless' },
              ]}
            />
            {setup.style === 'practice' ? (
              <div className="mt-3">
                <Segmented<string>
                  label="Number of words"
                  value={String(setup.practiceSize)}
                  onChange={(v) => updateSetup({ practiceSize: (v === 'all' ? 'all' : Number(v)) as PracticeSize })}
                  options={SIZES}
                />
              </div>
            ) : (
              <p className="mt-2 text-sm text-ink-soft">Keep going until you lose all 3 hearts.</p>
            )}
          </div>
        </Card>
      </div>

      <div className="flex flex-col gap-4">
        <Card className="p-5">
          <h2 className="mb-3 text-lg font-bold">Collection</h2>
          <label className="sr-only" htmlFor="collection-select">
            Collection
          </label>
          <select
            id="collection-select"
            value={setup.collectionId ?? ''}
            onChange={(e) => updateSetup({ collectionId: e.target.value })}
            className="w-full rounded-2xl border-2 border-white bg-white px-3 py-2 font-semibold"
          >
            {collections?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.wordCount})
              </option>
            ))}
          </select>
          {stats && (
            <dl className="mt-4 grid grid-cols-2 gap-2 text-center">
              {[
                ['Words', stats.total, 'bg-white'],
                ['New', stats.fresh, 'bg-[#e3f2ff]'],
                ['Due', stats.due, 'bg-[#fff1d6]'],
                ['Mastered', stats.mastered, 'bg-[#dcf7f2]'],
              ].map(([label, value, bg]) => (
                <div key={label} className={`rounded-2xl p-2 ${bg}`}>
                  <dd className="text-2xl font-bold">{value}</dd>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-ink-soft">{label}</dt>
                </div>
              ))}
            </dl>
          )}
          {stats && setup.mode === 'mistakes' && (
            <p className="mt-3 text-sm text-ink-soft">{stats.mistakes} word(s) waiting in mistake review.</p>
          )}
        </Card>

        <Card className="p-5">
          {poolEmpty ? (
            <p className="mb-3 rounded-2xl bg-candy-sun/40 p-3 text-sm font-medium">
              {setup.mode === 'mistakes'
                ? 'No mistakes to review yet — nice! Play another mode first.'
                : 'This collection is empty. Add some words in the Library.'}
            </p>
          ) : (
            allMastered && (
              <p className="mb-3 flex items-center gap-2 rounded-2xl bg-candy-mint/30 p-3 text-sm font-medium">
                <Sparkles size={18} /> Every word here is mastered! You can still practise to keep them fresh.
              </p>
            )
          )}
          <Button variant="pink" size="lg" className="w-full" icon={<Play size={22} />} disabled={!collection || !stats || poolEmpty} onClick={start}>
            Start game
          </Button>
          {poolEmpty && setup.mode !== 'mistakes' && (
            <Button variant="white" className="mt-2 w-full" onClick={() => navigate('library')}>
              Go to Library
            </Button>
          )}
        </Card>
      </div>
    </div>
  );
}
