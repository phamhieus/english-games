import { useCallback, useEffect, useRef, useState } from 'react';
import { DoorOpen, Music, Music2, Pause, Play, Volume2, VolumeX } from 'lucide-react';
import type { SessionConfig, SessionStatus } from '@/types';
import { GameBridge, type FeedbackEvent, type HudState } from '@/game/GameBridge';
import { GameSession, type RunState } from '@/game/systems/SessionSystem';
import { DIFFICULTIES } from '@/game/config/gameConfig';
import { normalizeAnswer } from '@/utils/text';
import { filterByLevels } from '@/features/vocabulary/levels';
import { createRng } from '@/utils/random';
import { createId } from '@/utils/id';
import { getProgressMap, listWords, saveSession } from '@/services/database/repositories';
import { ProgressSaver } from '@/services/database/progressSaver';
import { useAppStore } from '@/stores/appStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { Button, Card } from '@/components/common/ui';
import { STAGES, stageById, type StageDef } from '@/game/config/stages';
import { bossById } from '@/game/config/bosses';
import { ADVENTURE_STEPS } from '@/features/adventure/adventure';
import { music } from '@/services/audio/music';
import { sfx } from '@/services/audio/sfx';
import { StageBackdrop } from './StageBackdrop';
import { Logo } from '@/components/common/Art';
import { PhaserCanvas } from './PhaserCanvas';
import { GameHud } from './GameHud';
import { WordPreview } from './WordPreview';
import { AnswerInput, type AnswerInputHandle } from './AnswerInput';
import { useShortViewport } from '@/hooks/useViewportHeight';

const MODE_LABEL = { copy: 'Copy Typing', recall: 'Vietnamese → English', mistakes: 'Mistake Review' } as const;

interface Loaded {
  bridge: GameBridge;
  saver: ProgressSaver;
  recordId: string;
}

async function prepare(config: SessionConfig): Promise<Loaded> {
  const ids = config.collectionIds?.length ? config.collectionIds : [config.collectionId];
  const all = filterByLevels((await Promise.all(ids.map((id) => listWords(id)))).flat(), config.levels);
  // The same English word in two sets would spawn twice; keep the first one that is switched on
  // (keeping a switched-off copy would drop the word from the game altogether).
  const seen = new Set<string>();
  const words = all.filter((w) => {
    if (w.excluded) return false;
    const key = normalizeAnswer(w.english);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  const progress = await getProgressMap(words.map((w) => w.id));
  const saver = new ProgressSaver();
  const session = new GameSession({
    config,
    words,
    progress,
    rng: createRng(config.seed ?? Date.now()),
    onProgress: (p) => saver.add(p),
  });
  const bridge = new GameBridge(session, useSettingsStore.getState().settings);
  return { bridge, saver, recordId: createId() };
}

export default function GameScreen() {
  const config = useAppStore((s) => s.activeSession);
  const navigate = useAppStore((s) => s.navigate);
  const finishGame = useAppStore((s) => s.finishGame);
  const settings = useSettingsStore((s) => s.settings);
  const updateSettings = useSettingsStore((s) => s.update);
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  // The game's words pop up for a moment; the game starts when the pop-up closes.
  const [started, setStarted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hud, setHud] = useState<HudState | null>(null);
  const [paused, setPaused] = useState(false);
  const [feedback, setFeedback] = useState<(FeedbackEvent & { id: number }) | null>(null);
  const [active, setActive] = useState<string[]>([]);
  const inputRef = useRef<AnswerInputHandle>(null);
  const endedRef = useRef(false);
  // Phone with the keyboard open: squeeze the HUD and answer box so the play field stays visible.
  const compact = useShortViewport();

  // Stages: one random stage per game, or a level journey through all of them.
  const levelMode = config?.stageMode === 'levels';
  const total = hud?.completion?.total ?? 0;
  const perLevel = config?.style === 'practice' && total ? Math.max(2, Math.ceil(total / 5)) : 5;
  const path = config?.stagePath?.length ? config.stagePath.map(stageById) : STAGES;
  const level = levelMode && hud ? Math.min(path.length - 1, Math.floor(hud.correct / perLevel)) : 0;
  const stage = levelMode ? path[level]! : stageById(config?.stage);
  const [levelBanner, setLevelBanner] = useState<{ n: number; name: string } | null>(null);
  const lastLevel = useRef(0);
  const prevStage = useRef<StageDef>(stage);
  const [fadingFrom, setFadingFrom] = useState<StageDef | null>(null);

  // Load words + progress and build the session (once per mount).
  useEffect(() => {
    if (!config) {
      navigate('home');
      return;
    }
    let cancelled = false;
    prepare(config)
      .then((l) => {
        if (cancelled) return;
        if (l.bridge.session.poolSize === 0) {
          setError(
            config.mode === 'mistakes'
              ? 'There are no mistakes to review in this collection.'
              : config.levels?.length
                ? `This collection has no ${config.levels.join('/')} words.`
                : 'No words to practise here. Add some, or switch some on in the Library.',
          );
          return;
        }
        setHud(l.bridge.hud());
        setLoaded(l);
      })
      .catch((e: unknown) => !cancelled && setError(e instanceof Error ? e.message : String(e)));
    return () => {
      cancelled = true;
    };
  }, [config, navigate]);

  const finalize = useCallback(
    async (state: RunState | 'interrupted') => {
      if (!loaded || !config || endedRef.current) return;
      endedRef.current = true;
      const status: SessionStatus = state === 'running' ? 'quit' : state;
      const record = loaded.bridge.session.toRecord(loaded.recordId, status);
      await loaded.saver.flush();
      await saveSession(record).catch((e: unknown) => console.warn('[session] save failed', e));
      // Beating a boss unlocks the next one.
      if (config.boss && record.status === 'completed') {
        const s = useSettingsStore.getState();
        if (!s.settings.bossesDefeated.includes(config.boss)) s.update({ bossesDefeated: [...s.settings.bossesDefeated, config.boss] });
      }
      // An adventure plays the same words again in its next step.
      finishGame(record, config, config.adventure ? (config.wordIds ?? loaded.bridge.session.targetIds) : undefined);
    },
    [loaded, config, finishGame],
  );

  // Bridge subscriptions.
  useEffect(() => {
    if (!loaded) return;
    const { bridge } = loaded;
    let fid = 0;
    let timer: number | undefined;
    const offs = [
      bridge.on('hud', setHud),
      bridge.on('active', setActive),
      bridge.on('feedback', (f) => {
        setFeedback({ ...f, id: ++fid });
        window.clearTimeout(timer);
        timer = window.setTimeout(() => setFeedback(null), 1600);
      }),
      bridge.on('end', (state) => void finalize(state)),
    ];
    return () => {
      offs.forEach((off) => off());
      window.clearTimeout(timer);
    };
  }, [loaded, finalize]);

  // Periodically persist progress + an in-progress record (survives refresh as "interrupted").
  useEffect(() => {
    if (!loaded || !started) return;
    const save = () => {
      if (endedRef.current) return;
      void loaded.saver.flush();
      void saveSession(loaded.bridge.session.toRecord(loaded.recordId, 'in_progress')).catch(() => undefined);
    };
    const id = window.setInterval(save, 4000);
    window.addEventListener('pagehide', save);
    return () => {
      window.clearInterval(id);
      window.removeEventListener('pagehide', save);
    };
  }, [loaded, started]);

  // Stage changes: danger-line colour in the scene + the stage's own tune.
  useEffect(() => {
    if (!loaded) return;
    loaded.bridge.setStage(stage.id);
    music.play(stage.id);
  }, [loaded, stage.id]);

  // Cross-fade the backdrop when the stage changes.
  useEffect(() => {
    if (prevStage.current.id === stage.id) return;
    setFadingFrom(prevStage.current);
    prevStage.current = stage;
    const t = window.setTimeout(() => setFadingFrom(null), 1000);
    return () => window.clearTimeout(t);
  }, [stage]);

  // Announce level-ups.
  useEffect(() => {
    if (!levelMode || level <= lastLevel.current) return;
    lastLevel.current = level;
    setLevelBanner({ n: level + 1, name: path[level]!.name });
    sfx.play('complete');
    const t = window.setTimeout(() => setLevelBanner(null), 2300);
    return () => window.clearTimeout(t);
  }, [levelMode, level]);

  // Music pauses with the game; make sure it is running again when we leave.
  useEffect(() => {
    if (paused) music.pause();
    else music.resume();
  }, [paused]);
  useEffect(() => () => music.resume(), []);

  // Keep the scene's settings in sync.
  useEffect(() => {
    loaded?.bridge.updateSettings(settings);
  }, [loaded, settings]);

  const setPause = useCallback(
    (p: boolean) => {
      if (!loaded || endedRef.current) return;
      setPaused(p);
      loaded.bridge.setPaused(p);
      if (!p) window.setTimeout(() => inputRef.current?.focus(), 0);
    },
    [loaded],
  );

  // Auto-pause when the tab is hidden; Escape toggles pause; typing anywhere focuses the input.
  useEffect(() => {
    if (!loaded || !started) return;
    const onVis = () => document.hidden && setPause(true);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setPause(!paused);
        return;
      }
      const el = document.activeElement;
      const typingElsewhere = el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement;
      if (!paused && !typingElsewhere && e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        inputRef.current?.focus();
      }
    };
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('keydown', onKey);
    };
  }, [loaded, started, paused, setPause]);

  useEffect(() => {
    if (loaded && started) inputRef.current?.focus();
  }, [loaded, started]);

  const startGame = useCallback(() => setStarted(true), []);

  const quit = () => {
    if (!loaded) return;
    setPaused(false);
    loaded.bridge.quit();
  };

  if (error) {
    return (
      <div className="flex h-full items-center justify-center p-4">
        <Card className="max-w-md p-6 text-center">
          <p className="mb-4 font-semibold">{error}</p>
          <Button variant="pink" onClick={() => navigate('home')}>
            Back
          </Button>
        </Card>
      </div>
    );
  }
  if (!config || !loaded || !hud) {
    return <div className="flex h-full items-center justify-center font-semibold text-ink-soft">Preparing words…</div>;
  }

  if (!started) {
    return (
      <div className="app-root flex overflow-hidden">
        <StageBackdrop stage={stage} />
        <WordPreview words={loaded.bridge.session.plannedWords} onDone={startGame} />
      </div>
    );
  }

  const placeholder = config.mode === 'copy' ? 'Type the hidden word…' : 'Type the English word…';

  return (
    <div className="app-root flex overflow-hidden">
      {fadingFrom && <StageBackdrop stage={fadingFrom} />}
      <div key={stage.id} className={`absolute inset-0 ${fadingFrom ? 'animate-[fade-in_1s_ease-out]' : ''}`}>
        <StageBackdrop stage={stage} />
      </div>
      {/* Desktop side panel */}
      <aside className="relative z-10 hidden w-64 shrink-0 flex-col gap-3 p-4 lg:flex">
        <div className="self-start rounded-2xl border-2 border-line bg-surface px-3 py-1.5 shadow-[0_3px_0_var(--color-line)]">
          <Logo />
        </div>
        <Card className="flex flex-col gap-2 p-4 text-sm">
          <Info label="Word sets" value={config.collectionName} />
          <Info label="Stage" value={levelMode ? `${level + 1} of ${path.length} · ${stage.name}` : stage.name} />
          <Info
            label="Mode"
            value={
              config.adventure
                ? `Adventure ${config.adventure.step + 1}/3 · ${config.boss ? bossById(config.boss).name : ADVENTURE_STEPS[config.adventure.step]!.title}`
                : config.boss
                  ? `Boss battle · ${bossById(config.boss).name}`
                  : MODE_LABEL[config.mode]
            }
          />
          <Info label="Difficulty" value={DIFFICULTIES[config.difficulty].label} />
          <Info
            label="Session"
            value={config.style === 'endless' ? 'Endless' : `Practice · ${hud.completion?.total ?? 0} words`}
          />
        </Card>
        <Card className="grid grid-cols-3 gap-2 p-3 text-center text-sm">
          <Stat label="Correct" value={hud.correct} />
          <Stat label="Wrong" value={hud.incorrect} />
          <Stat label="Missed" value={hud.missed} />
        </Card>
        <Button variant="sun" icon={<Pause size={18} />} onClick={() => setPause(true)}>
          Pause <kbd className="rounded bg-surface px-1.5 text-xs">Esc</kbd>
        </Button>
        <Button
          variant="white"
          icon={settings.soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
          onClick={() => updateSettings({ soundEnabled: !settings.soundEnabled })}
        >
          {settings.soundEnabled ? 'Sound on' : 'Sound off'}
        </Button>
        <Button
          variant="white"
          icon={settings.musicEnabled ? <Music size={18} /> : <Music2 size={18} className="opacity-40" />}
          onClick={() => updateSettings({ musicEnabled: !settings.musicEnabled })}
        >
          {settings.musicEnabled ? 'Music on' : 'Music off'}
        </Button>
        <Button variant="white" icon={<DoorOpen size={18} />} onClick={quit}>
          End session
        </Button>
      </aside>

      <section className="relative z-10 flex min-w-0 flex-1 flex-col">
        <div className={compact ? 'px-2 pt-1.5' : 'px-3 pt-2 sm:px-4 sm:pt-3'}>
          <GameHud hud={hud} level={levelMode ? level + 1 : null} compact={compact} onPause={() => setPause(true)} />
        </div>
        <div className="relative min-h-0 flex-1">
          <PhaserCanvas bridge={loaded.bridge} onPointerDown={() => inputRef.current?.focus()} />
          {feedback && (
            <div
              key={feedback.id}
              className={`animate-pop-in pointer-events-none absolute top-2 left-1/2 z-10 -translate-x-1/2 rounded-full px-4 py-1.5 text-sm font-bold shadow ${
                feedback.kind === 'combo' ? 'bg-candy-sun' : feedback.kind === 'correct' ? 'bg-candy-mint' : 'bg-surface text-candy-pink-dark'
              }`}
            >
              {feedback.text}
            </div>
          )}
        </div>
        <div className={compact ? 'px-2 pb-1.5' : 'px-3 pb-3 sm:px-4'}>
          <AnswerInput ref={inputRef} bridge={loaded.bridge} disabled={paused} placeholder={placeholder} compact={compact} />
        </div>
      </section>

      {levelBanner && (
        <div className="pointer-events-none absolute inset-x-0 top-1/3 z-30 flex justify-center px-4" role="status">
          <div
            key={levelBanner.n}
            className="animate-[level-pop_2.3s_ease-out_forwards] rounded-3xl border-[3px] border-line bg-candy-purple px-8 py-4 text-center shadow-[0_6px_0_var(--color-line)]"
          >
            <div className="font-display text-sm font-extrabold tracking-widest text-white/90 uppercase">Next stage!</div>
            <div className="title-3d text-5xl text-candy-sun">STAGE {levelBanner.n}</div>
            <div className="mt-1 font-display text-xl font-bold text-white">{levelBanner.name}</div>
          </div>
        </div>
      )}

      <div className="sr-only-live" aria-live="polite" data-testid="active-balloons">
        {active.join(' | ')}
      </div>

      {paused && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-line/25 p-4">
          <Card className="animate-pop-in flex w-full max-w-xs flex-col gap-3 bg-cream p-6 text-center">
            <h2 className="text-2xl font-bold">Paused</h2>
            <p className="text-sm text-ink-soft">Take a breath, time is frozen.</p>
            <Button variant="pink" size="lg" icon={<Play size={20} />} onClick={() => setPause(false)}>
              Resume
            </Button>
            <Button variant="white" icon={<DoorOpen size={18} />} onClick={quit}>
              End session
            </Button>
          </Card>
        </div>
      )}
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs font-semibold uppercase tracking-wide text-ink-soft">{label}</div>
      <div className="truncate font-semibold">{value}</div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="text-xl font-bold">{value}</div>
      <div className="text-xs text-ink-soft">{label}</div>
    </div>
  );
}
