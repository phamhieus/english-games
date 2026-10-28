import { create } from 'zustand';
import type { CefrLevel, Difficulty, GameMode, PracticeSize, SessionConfig, SessionRecord, SessionStyle, StageMode } from '@/types';
import { getDb } from '@/services/database/db';
import { nextAdventureStep } from '@/features/adventure/adventure';

export type Screen = 'home' | 'game' | 'results' | 'library' | 'skins' | 'stats' | 'settings' | 'profile' | 'bosses' | 'stage-clear';

export interface GameSetup {
  /** PLAY starts an adventure (copy typing → recall → boss) or the custom game below. */
  play: 'adventure' | 'custom';
  /** Word sets practised together. */
  collectionIds: string[];
  /** CEFR levels to practise; empty = all words. */
  levels: CefrLevel[];
  mode: GameMode;
  difficulty: Difficulty;
  style: SessionStyle;
  practiceSize: PracticeSize;
  /** A random backdrop each game, or a level journey through all of them. */
  stageMode: StageMode;
  /** Words shown in boss battles: English (copy) or the Vietnamese meaning (recall). */
  bossMode: 'copy' | 'recall';
}

const SETUP_KEY = 'last-setup';

export const DEFAULT_SETUP: GameSetup = {
  play: 'adventure',
  collectionIds: [],
  levels: [],
  mode: 'recall',
  difficulty: 'easy',
  style: 'practice',
  practiceSize: 10,
  stageMode: 'levels',
  bossMode: 'recall',
};

/** The adventure being played: the steps finished so far and the next one. */
export interface AdventureRun {
  id: string;
  records: SessionRecord[];
  next: SessionConfig | null;
}

interface AppStore {
  screen: Screen;
  setup: GameSetup;
  activeSession: SessionConfig | null;
  /** Bumped each time a game starts so the game screen remounts cleanly. */
  sessionKey: number;
  lastResult: SessionRecord | null;
  lastConfig: SessionConfig | null;
  adventure: AdventureRun | null;
  navigate(screen: Screen): void;
  loadSetup(): Promise<void>;
  updateSetup(patch: Partial<GameSetup>): void;
  startGame(config: SessionConfig): void;
  /** `wordIds`: the words this game used (an adventure plays them again in the next step). */
  finishGame(record: SessionRecord, config: SessionConfig, wordIds?: string[]): void;
  /** Leave an adventure between steps and see its results. */
  stopAdventure(): void;
}

export const useAppStore = create<AppStore>((set, get) => ({
  screen: 'home',
  setup: DEFAULT_SETUP,
  activeSession: null,
  sessionKey: 0,
  lastResult: null,
  lastConfig: null,
  adventure: null,
  navigate(screen) {
    set({ screen });
  },
  async loadSetup() {
    try {
      const row = await getDb().settings.get(SETUP_KEY);
      if (row?.value) {
        const stored = row.value as unknown as Partial<GameSetup> & { collectionId?: string | null };
        // Older saves remembered a single set.
        const collectionIds = stored.collectionIds ?? (stored.collectionId ? [stored.collectionId] : []);
        set({ setup: { ...DEFAULT_SETUP, ...stored, collectionIds } });
      }
    } catch {
      /* defaults */
    }
  },
  updateSetup(patch) {
    const setup = { ...get().setup, ...patch };
    set({ setup });
    void getDb()
      .settings.put({ key: SETUP_KEY, value: setup as never })
      .catch(() => undefined);
  },
  startGame(config) {
    set((s) => ({ activeSession: config, sessionKey: s.sessionKey + 1, screen: 'game' }));
  },
  finishGame(record, config, wordIds) {
    const a = config.adventure;
    if (!a) {
      set({ lastResult: record, lastConfig: config, activeSession: null, screen: 'results' });
      return;
    }
    // A won step leads to the next one on the same words; anything else ends the adventure.
    const prev = get().adventure;
    const records = prev?.id === a.id ? [...prev.records, record] : [record];
    const next = record.status === 'completed' && wordIds ? nextAdventureStep(config, wordIds, config.stage ?? 'meadow') : null;
    set({
      adventure: { id: a.id, records, next },
      lastResult: record,
      lastConfig: config,
      activeSession: null,
      screen: next ? 'stage-clear' : 'results',
    });
  },
  stopAdventure() {
    const a = get().adventure;
    set({ adventure: a ? { ...a, next: null } : null, screen: 'results' });
  },
}));
