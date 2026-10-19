import { useEffect, useMemo, useRef, useState } from 'react';
import { BookOpen, Check, Keyboard, Languages, Lock, Play, Plus, RotateCcw, Shirt, Sparkles, Swords } from 'lucide-react';
import type { Difficulty, GameMode, PracticeSize, SessionStyle } from '@/types';
import { DIFFICULTIES } from '@/game/config/gameConfig';
import { skinById } from '@/game/config/theme';
import { randomStage, STAGES } from '@/game/config/stages';
import { nextStageUnlock, unlockedStages } from '@/features/progression/progression';
import { useProgress } from '@/hooks/useProgress';
import { StageBackdrop } from './StageBackdrop';
import { useAppStore } from '@/stores/appStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { useCollections, useCollectionsWords } from '@/hooks/useLibrary';
import { mistakePool } from '@/features/learning/selection';
import { isDue, isMastered } from '@/features/learning/spacedRepetition';
import { Button, Card, EmptyState, Segmented } from '@/components/common/ui';
import { FlatBalloon, SET_COLORS, Sunburst } from '@/components/common/Art';
import { CannonPreview } from '@/components/common/CannonPreview';

const MODES: { value: GameMode; title: string; desc: string; icon: typeof Keyboard; tile: string; badge?: string }[] = [
  { value: 'copy', title: 'Copy Typing', desc: 'Hear it, type it. Letters show up as you get them right.', icon: Keyboard, tile: 'bg-candy-blue' },
  {
    value: 'recall',
    title: 'Vietnamese → English',
    desc: 'See the meaning, recall the English word.',
    icon: Languages,
    tile: 'bg-candy-sun',
    badge: 'Recommended',
  },
  { value: 'mistakes', title: 'Mistake Review', desc: 'Only the words you missed, until mastered.', icon: RotateCcw, tile: 'bg-[#ff7fb8]' },
];

const DIFF_STYLE: Record<Difficulty, { on: string; off: string; balloons: number }> = {
  easy: { on: 'bg-candy-mint', off: 'bg-tint-mint', balloons: 1 },
  normal: { on: 'bg-candy-sun', off: 'bg-tint-sun', balloons: 2 },
  hard: { on: 'bg-[#ff8a7a]', off: 'bg-tint-coral', balloons: 3 },
};


const SIZES: { value: string; label: string }[] = [
  { value: '10', label: '10 words' },
  { value: '20', label: '20 words' },
  { value: '30', label: '30 words' },
  { value: 'all', label: 'All' },
];

function Step({ n, title, tile, aside, children }: { n: number; title: string; tile: string; aside?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-2.5 flex items-center gap-2.5">
        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border-2 border-line font-display font-bold shadow-[0_2px_0_var(--color-line)] ${tile}`}>
          {n}
        </span>
        <h2 className="text-lg font-bold">{title}</h2>
        {aside && <div className="ml-auto">{aside}</div>}
      </div>
      {children}
    </div>
  );
}

export function HomeScreen() {
  const setup = useAppStore((s) => s.setup);
  const updateSetup = useAppStore((s) => s.updateSetup);
  const startGame = useAppStore((s) => s.startGame);
  const navigate = useAppStore((s) => s.navigate);
  const skin = skinById(useSettingsStore((s) => s.settings.cannonSkin));
  const collections = useCollections();
  const playerLevel = useProgress()?.level ?? 1;
  const openStages = unlockedStages(playerLevel);
  const nextStage = nextStageUnlock(playerLevel);
  const data = useCollectionsWords(setup.collectionIds);
  const playRef = useRef<HTMLDivElement>(null);
  const [playVisible, setPlayVisible] = useState(true);

  // Drop deleted sets from the selection; pick one automatically when nothing is selected.
  useEffect(() => {
    if (!collections) return;
    const valid = setup.collectionIds.filter((id) => collections.some((c) => c.id === id));
    if (valid.length === 0) {
      const first = collections.find((c) => c.wordCount > 0)?.id ?? collections[0]?.id;
      updateSetup({ collectionIds: first ? [first] : [] });
    } else if (valid.length !== setup.collectionIds.length) {
      updateSetup({ collectionIds: valid });
    }
  }, [collections, setup.collectionIds, updateSetup]);

  // Show the floating PLAY bar only while the big PLAY button is scrolled out of view.
  useEffect(() => {
    const el = playRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(([entry]) => setPlayVisible(!!entry?.isIntersecting));
    io.observe(el);
    return () => io.disconnect();
  }, [collections]);

  const selected = collections?.filter((c) => setup.collectionIds.includes(c.id)) ?? [];
  const toggleCollection = (id: string) =>
    updateSetup({
      collectionIds: setup.collectionIds.includes(id) ? setup.collectionIds.filter((x) => x !== id) : [...setup.collectionIds, id],
    });

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
          Add words from a file, a photo or by typing them, then come back to play.
          <div className="mt-4">
            <Button variant="pink" icon={<Plus size={18} />} onClick={() => navigate('library')}>
              Add words
            </Button>
          </div>
        </EmptyState>
      </Card>
    );
  }

  // While loading, `stats` is null — don't flash an "empty" warning.
  const poolEmpty = !!stats && (setup.mode === 'mistakes' ? stats.mistakes === 0 : stats.total === 0);
  const allMastered = !!stats && stats.total > 0 && stats.mastered === stats.total;
  const canStart = selected.length > 0 && !!stats && !poolEmpty;
  const mode = MODES.find((m) => m.value === setup.mode) ?? MODES[1]!;
  const summary = `${mode.title} · ${DIFFICULTIES[setup.difficulty].label} · ${
    setup.style === 'endless' ? 'Endless' : setup.practiceSize === 'all' ? 'All words' : `${setup.practiceSize} words`
  }`;

  const start = () => {
    if (!canStart) return;
    startGame({
      collectionId: selected[0]!.id,
      collectionIds: selected.map((c) => c.id),
      collectionName: selected.map((c) => c.name).join(' + '),
      mode: setup.mode,
      difficulty: setup.difficulty,
      style: setup.style,
      practiceSize: setup.practiceSize,
      stage: setup.stageMode === 'levels' ? openStages[0]!.id : randomStage(openStages).id,
      stageMode: setup.stageMode,
      stagePath: openStages.map((s) => s.id),
    });
  };

  const notice = poolEmpty ? (
    setup.mode === 'mistakes' ? 'No mistakes to review yet. Play another mode first!' : 'These sets are empty. Add some words first.'
  ) : selected.length === 0 ? (
    'Pick at least one word set.'
  ) : allMastered ? (
    'Every word here is mastered! Keep practising to stay sharp.'
  ) : null;

  return (
    <>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        {/* ── Title screen ─────────────────────────────────────── */}
        <section className="card relative overflow-hidden rounded-3xl bg-candy-purple px-5 pt-6 pb-6 text-white lg:sticky lg:top-0 lg:self-start">
          <Sunburst />
          <div className="relative flex flex-col items-center text-center">
            <span className="rounded-full border-2 border-line bg-candy-sun px-3 py-0.5 text-xs font-extrabold tracking-widest text-ink uppercase shadow-[0_2px_0_var(--color-line)]">
              Vocabulary arcade
            </span>
            {/* logo balloon + title, like the header logo */}
            <div className="mt-4 flex items-center justify-center gap-2 sm:gap-4">
              <FlatBalloon
                color="#d6402e"
                shade="#a52e20"
                className="animate-wiggle w-[52px] shrink-0 origin-bottom drop-shadow-[0_5px_0_var(--color-line)] sm:w-[92px]"
              />
              <h1 className="text-left" aria-label="Word Shooter">
                <span className="block font-display text-6xl leading-[0.9] font-bold tracking-tight text-white sm:text-8xl">Word</span>
                <span className="block font-display text-6xl leading-[0.9] font-bold tracking-tight text-brand sm:text-8xl">Shooter</span>
              </h1>
            </div>
            <p className="mt-4 max-w-xs font-semibold text-white/90">Type the word, pop the balloon, level up your English.</p>

            {/* mascot scene */}
            <div className="relative mt-2 h-60 w-full max-w-md sm:h-72" aria-hidden>
              <FlatBalloon color="#7cc4f5" shade="#3f98d6" label="apple" className="animate-bob absolute top-2 left-[2%] w-[70px]" />
              <FlatBalloon color="#ffc43d" shade="#d99a0b" label="sky" className="animate-bob absolute top-0 right-[4%] w-[60px]" style={{ animationDelay: '-1.3s' }} />
              <FlatBalloon color="#ff9fb8" shade="#e5607f" label="_ _ _" className="animate-bob absolute top-28 left-[16%] w-[54px]" style={{ animationDelay: '-2.2s' }} />
              <FlatBalloon color="#6fe0c8" shade="#2fae96" label="hi" className="animate-bob absolute top-32 right-[13%] w-[46px]" style={{ animationDelay: '-0.6s' }} />
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2">
                {/* soft spotlight so the purple barrel doesn't vanish into the purple card */}
                <span className="absolute bottom-6 left-1/2 h-60 w-60 -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgb(255_255_255/0.42)_0%,rgb(255_255_255/0.16)_45%,transparent_70%)] sm:h-72 sm:w-72" />
                <span className="absolute bottom-3 left-1/2 h-6 w-56 -translate-x-1/2 rounded-[50%] bg-candy-purple-dark sm:w-64" />
                <span className="relative block sm:hidden">
                  <CannonPreview skin={skin} size={150} />
                </span>
                <span className="relative hidden sm:block">
                  <CannonPreview skin={skin} size={180} />
                </span>
              </div>
            </div>

            <div ref={playRef} className="mt-4">
              <span className={`inline-block ${canStart ? 'animate-[pulse-soft_1.8s_ease-in-out_infinite]' : ''}`}>
                <button
                  type="button"
                  aria-label="Start game"
                  disabled={!canStart}
                  onClick={start}
                  className="flex items-center gap-3 rounded-2xl border-[3px] border-line bg-candy-sun px-12 py-3.5 font-display text-4xl font-bold tracking-wide text-ink shadow-[0_7px_0_var(--color-line)] transition hover:brightness-105 active:translate-y-1.5 active:shadow-[0_1px_0_var(--color-line)] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Play size={32} fill="currentColor" strokeWidth={2.5} /> PLAY
                </button>
              </span>
            </div>
            <p className="mt-4 text-sm font-bold text-white/90">{summary}</p>
            {notice && (
              <p className="mt-2 rounded-xl border-2 border-line bg-surface px-3 py-1.5 text-sm font-semibold text-ink">{notice}</p>
            )}

            <button
              type="button"
              onClick={() => navigate('bosses')}
              className="btn-candy mt-4 flex items-center gap-2 rounded-2xl bg-candy-pink px-6 py-2.5 font-display text-xl font-bold tracking-wide text-white"
              data-testid="open-bosses"
            >
              <Swords size={22} strokeWidth={2.5} /> BOSS BATTLE
            </button>
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              <Button size="sm" variant="white" icon={<Shirt size={16} />} onClick={() => navigate('skins')}>
                Skin: {skin.name}
              </Button>
              <Button size="sm" variant="white" icon={<Plus size={16} />} onClick={() => navigate('library')}>
                Add words
              </Button>
            </div>
          </div>
        </section>

        {/* ── Game setup ───────────────────────────────────────── */}
        <section className="card overflow-hidden rounded-3xl">
          <div className="flex flex-wrap items-center gap-2 border-b-2 border-line bg-tint-sun px-5 py-3">
            <Sparkles size={20} />
            <h2 className="mr-auto text-xl font-bold">Game setup</h2>
            {stats && (
              <dl className="flex flex-wrap gap-1.5 text-xs font-bold">
                {(
                  [
                    ['Words', stats.total, 'bg-surface'],
                    ['New', stats.fresh, 'bg-tint-blue'],
                    ['Due', stats.due, 'bg-tint-coral'],
                    ['Mastered', stats.mastered, 'bg-tint-mint'],
                  ] as const
                ).map(([label, value, bg]) => (
                  <div key={label} className={`flex items-baseline gap-1 rounded-full border-2 border-line px-2.5 py-0.5 ${bg}`}>
                    <dd className="font-display text-sm">{value}</dd>
                    <dt className="text-ink-soft uppercase">{label}</dt>
                  </div>
                ))}
              </dl>
            )}
          </div>

          <div className="flex flex-col gap-6 p-5">
            <Step
              n={1}
              title="Word sets"
              tile="bg-candy-blue"
              aside={
                <Button size="sm" variant="ghost" icon={<BookOpen size={16} />} onClick={() => navigate('library')}>
                  Manage
                </Button>
              }
            >
              <div className="grid max-h-60 gap-2 overflow-y-auto p-1 sm:grid-cols-2" role="group" aria-label="Word sets">
                {collections?.map((c, i) => {
                  const on = setup.collectionIds.includes(c.id);
                  const [fill, shade] = SET_COLORS[i % SET_COLORS.length]!;
                  return (
                    <label
                      key={c.id}
                      className={`pick flex cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2 ${on ? 'bg-tint-purple' : 'bg-surface'}`}
                    >
                      <input type="checkbox" className="sr-only" checked={on} onChange={() => toggleCollection(c.id)} />
                      <FlatBalloon color={fill} shade={shade} className="w-5 shrink-0" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-display font-semibold">{c.name}</span>
                        <span className="block text-xs text-ink-soft">{c.wordCount} words</span>
                      </span>
                      <span
                        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 border-line ${on ? 'bg-candy-purple text-white' : 'bg-surface'}`}
                      >
                        {on && <Check size={15} strokeWidth={3} />}
                      </span>
                    </label>
                  );
                })}
              </div>
              {selected.length > 1 && <p className="mt-2 text-sm font-bold text-candy-purple-dark">{selected.length} sets mixed together</p>}
            </Step>

            <Step n={2} title="Game mode" tile="bg-[#ff7fb8]">
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
                      className={`pick relative flex flex-col items-start gap-1.5 rounded-2xl p-3.5 text-left ${active ? 'bg-candy-purple text-white' : 'bg-surface'}`}
                    >
                      {m.badge && (
                        <span className="absolute -top-2.5 right-2 rounded-full border-2 border-line bg-candy-sun px-2 py-0.5 text-[10px] font-extrabold tracking-wide text-ink uppercase">
                          {m.badge}
                        </span>
                      )}
                      <span className={`flex h-10 w-10 items-center justify-center rounded-xl border-2 border-line text-ink ${m.tile}`}>
                        <Icon size={22} strokeWidth={2.5} />
                      </span>
                      <span className="font-display leading-tight font-bold">{m.title}</span>
                      <span className={`text-xs leading-snug ${active ? 'text-white/90' : 'text-ink-soft'}`}>{m.desc}</span>
                    </button>
                  );
                })}
              </div>
            </Step>

            <Step n={3} title="Difficulty" tile="bg-candy-sun">
              <div className="grid grid-cols-3 gap-3" role="radiogroup" aria-label="Difficulty">
                {(Object.keys(DIFFICULTIES) as Difficulty[]).map((d) => {
                  const active = setup.difficulty === d;
                  const st = DIFF_STYLE[d];
                  return (
                    <button
                      key={d}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      title={DIFFICULTIES[d].hint}
                      onClick={() => updateSetup({ difficulty: d })}
                      className={`pick flex flex-col items-center gap-1 rounded-2xl px-2 py-2.5 ${active ? st.on : st.off}`}
                    >
                      <span className="flex h-7 items-end gap-0.5" aria-hidden>
                        {Array.from({ length: st.balloons }, (_, i) => (
                          <FlatBalloon key={i} color="#fff" shade="#d8dbe6" className="w-4" />
                        ))}
                      </span>
                      <span className="font-display font-bold">{DIFFICULTIES[d].label}</span>
                    </button>
                  );
                })}
              </div>
              <p className="mt-2 text-sm text-ink-soft">{DIFFICULTIES[setup.difficulty].hint}</p>
            </Step>

            <Step n={4} title="Session" tile="bg-candy-mint">
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
            </Step>

            <Step n={5} title="Stages" tile="bg-[#b7a4f7]">
              <div className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Stages">
                {(
                  [
                    { value: 'levels', title: 'Journey', desc: `Start in ${STAGES[0]!.name} and travel to a new stage every few words.` },
                    { value: 'random', title: 'Random', desc: 'A surprise stage (from the ones you unlocked) every game.' },
                  ] as const
                ).map((o) => {
                  const active = setup.stageMode === o.value;
                  return (
                    <button
                      key={o.value}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      onClick={() => updateSetup({ stageMode: o.value })}
                      className={`pick overflow-hidden rounded-2xl text-left ${active ? 'bg-candy-purple text-white' : 'bg-surface'}`}
                    >
                      <span className="relative flex h-16 border-b-2 border-line">
                        {o.value === 'levels' ? (
                          STAGES.slice(0, 4).map((st, i) => (
                            <span key={st.id} className="relative flex-1 overflow-hidden border-r-2 border-line last:border-r-0">
                              <StageBackdrop stage={st} mini />
                              {st.unlock > playerLevel && (
                                <span className="absolute inset-0 flex items-center justify-center bg-line/55 text-white" title={`Unlocks at level ${st.unlock}`}>
                                  <Lock size={16} strokeWidth={3} />
                                </span>
                              )}
                              <span className="absolute top-1 left-1 rounded-md border-2 border-line bg-surface px-1 font-display text-[10px] leading-tight font-bold text-ink">
                                {i + 1}
                              </span>
                            </span>
                          ))
                        ) : (
                          <span className="grid flex-1 grid-cols-4">
                            {openStages.map((st) => (
                              <span key={st.id} style={{ background: st.sky }} />
                            ))}
                            <span className="title-3d absolute inset-0 flex items-center justify-center text-4xl text-white">?</span>
                          </span>
                        )}
                        {active && (
                          <span className="absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full border-2 border-line bg-candy-sun text-ink">
                            <Check size={12} strokeWidth={3.5} />
                          </span>
                        )}
                      </span>
                      <span className="block px-3 py-2">
                        <span className="block font-display font-bold">{o.title}</span>
                        <span className={`block text-xs leading-snug ${active ? 'text-white/90' : 'text-ink-soft'}`}>{o.desc}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
              <p className="mt-2 text-sm text-ink-soft">
                <b>
                  {openStages.length} of {STAGES.length}
                </b>{' '}
                stages unlocked
                {nextStage ? ` · ${nextStage.name} unlocks at level ${nextStage.unlock}` : ' · all unlocked!'}
              </p>
            </Step>
          </div>
        </section>
      </div>

      {/* Floating PLAY bar while the big button is off screen */}
      {!playVisible && (
        <div className="animate-pop-in sticky bottom-0 z-20 mt-4 flex items-center gap-3 rounded-2xl border-2 border-line bg-line p-2 pl-4 text-white shadow-[0_4px_0_rgb(31_42_68/0.35)]">
          <CannonPreview skin={skin} size={30} />
          <span className="min-w-0 flex-1 truncate text-sm font-bold">{summary}</span>
          <button
            type="button"
            aria-label="Play now"
            disabled={!canStart}
            onClick={start}
            className="flex items-center gap-2 rounded-xl border-2 border-line bg-candy-sun px-5 py-2 font-display text-lg font-bold text-ink shadow-[0_3px_0_#000] active:translate-y-0.5 disabled:opacity-60"
          >
            <Play size={18} fill="currentColor" /> PLAY
          </button>
        </div>
      )}
    </>
  );
}
