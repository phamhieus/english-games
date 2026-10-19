import { create } from 'zustand';
import type { Difficulty, GameMode, PracticeSize, SessionConfig, SessionRecord, SessionStyle } from '@/types';
import { getDb } from '@/services/database/db';

export type Screen = 'home' | 'game' | 'results' | 'library' | 'stats' | 'settings';

export interface GameSetup {
  collectionId: string | null;
  mode: GameMode;
  difficulty: Difficulty;
  style: SessionStyle;
  practiceSize: PracticeSize;
}

const SETUP_KEY = 'last-setup';

const DEFAULT_SETUP: GameSetup = {
  collectionId: null,
  mode: 'recall',
  difficulty: 'easy',
  style: 'practice',
  practiceSize: 10,
};

interface AppStore {
  screen: Screen;
  setup: GameSetup;
  activeSession: SessionConfig | null;
  /** Bumped each time a game starts so the game screen remounts cleanly. */
  sessionKey: number;
  lastResult: SessionRecord | null;
  lastConfig: SessionConfig | null;
  navigate(screen: Screen): void;
  loadSetup(): Promise<void>;
  updateSetup(patch: Partial<GameSetup>): void;
  startGame(config: SessionConfig): void;
  finishGame(record: SessionRecord, config: SessionConfig): void;
}

export const useAppStore = create<AppStore>((set, get) => ({
  screen: 'home',
  setup: DEFAULT_SETUP,
  activeSession: null,
  sessionKey: 0,
  lastResult: null,
  lastConfig: null,
  navigate(screen) {
    set({ screen });
  },
  async loadSetup() {
    try {
      const row = await getDb().settings.get(SETUP_KEY);
      if (row?.value) set({ setup: { ...DEFAULT_SETUP, ...(row.value as unknown as Partial<GameSetup>) } });
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
  finishGame(record, config) {
    set({ lastResult: record, lastConfig: config, activeSession: null, screen: 'results' });
  },
}));
