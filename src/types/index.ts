export type CefrLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
export const CEFR_LEVELS: readonly CefrLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

export interface VocabularyCollection {
  id: string;
  name: string;
  description?: string;
  createdAt: number;
  updatedAt: number;
}

export interface VocabularyItem {
  id: string;
  collectionId: string;
  english: string;
  vietnamese: string;
  pronunciation?: string;
  example?: string;
  partOfSpeech?: string;
  level?: CefrLevel;
  tags?: string[];
  createdAt: number;
  updatedAt: number;
}

export interface WordProgress {
  vocabularyId: string;
  attempts: number;
  correctAttempts: number;
  incorrectAttempts: number;
  missedBalloons: number;
  averageResponseTimeMs: number;
  lastPracticedAt?: number;
  lastCorrectAt?: number;
  nextReviewAt?: number;
  consecutiveCorrect: number;
  masteryScore: number;
  /** Number of successful spaced-repetition steps (drives the review interval). */
  reviewStep: number;
}

/** copy = Mode A, recall = Mode B (Vietnamese → English), mistakes = Mode C. */
export type GameMode = 'copy' | 'recall' | 'mistakes';
export type Difficulty = 'easy' | 'normal' | 'hard';
export type SessionStyle = 'endless' | 'practice';
/** Number of target words in a practice session; 'all' = whole collection. */
export type PracticeSize = 10 | 20 | 30 | 'all';

export type StageMode = 'random' | 'levels';
export type BossId = 'cloud' | 'crab' | 'ghost' | 'dragon' | 'robot';
export type StageId =
  | 'meadow'
  | 'garden'
  | 'sunset'
  | 'autumn'
  | 'snow'
  | 'desert'
  | 'candy'
  | 'jungle'
  | 'ocean'
  | 'city'
  | 'night'
  | 'volcano'
  | 'space'
  | 'aurora';

export interface SessionConfig {
  /** Primary collection (first selected); kept for history records. */
  collectionId: string;
  /** Every collection practised together; defaults to just `collectionId`. */
  collectionIds?: string[];
  /** Display name; joined names when several sets are mixed. */
  collectionName: string;
  mode: GameMode;
  difficulty: Difficulty;
  style: SessionStyle;
  practiceSize: PracticeSize;
  /** Backdrop for the play field (visual only); missing = Sunny Meadow. In level mode, the first level's stage. */
  stage?: StageId;
  /** 'levels' moves to the next stage every few correct answers. */
  stageMode?: StageMode;
  /** Set for a boss battle instead of falling balloons. */
  boss?: BossId;
  /** Stages the journey travels through (the player's unlocked ones), in order. */
  stagePath?: StageId[];
  /** Restrict to these words (used by "Review mistakes" on the results screen). */
  wordIds?: string[];
  /** Only words of these CEFR levels; missing or empty = every word. */
  levels?: CefrLevel[];
  seed?: number;
  /** Set when the game is one step of an adventure (copy typing → recall → boss). */
  adventure?: AdventureInfo;
}

export interface AdventureInfo {
  /** Same for every step of one adventure. */
  id: string;
  /** 0 = copy typing, 1 = Vietnamese → English, 2 = boss fight. */
  step: 0 | 1 | 2;
  /** The boss waiting at the end. */
  boss: BossId;
}

export type SessionStatus = 'completed' | 'game_over' | 'quit' | 'interrupted' | 'in_progress';

export interface SessionMistake {
  vocabularyId: string;
  english: string;
  vietnamese: string;
  example?: string;
  incorrect: number;
  missed: number;
}

export interface SessionRecord {
  id: string;
  collectionId: string;
  /** Snapshot so history stays readable after a collection is deleted. */
  collectionName: string;
  mode: GameMode;
  difficulty: Difficulty;
  style: SessionStyle;
  status: SessionStatus;
  startedAt: number;
  endedAt: number;
  /** Active play time (pauses excluded). */
  durationMs: number;
  score: number;
  correct: number;
  incorrect: number;
  missed: number;
  accuracy: number;
  averageResponseTimeMs: number;
  bestCombo: number;
  correctChars: number;
  /** Sum of response times of correct answers (for typing speed). */
  correctResponseMs: number;
  mistakes: SessionMistake[];
  /** The boss fought, for boss battles ('completed' = defeated it). */
  boss?: BossId;
}

export type RecallAnnounce = 'vietnamese' | 'english' | 'off';

export type CannonSkinId =
  | 'classic'
  | 'mint'
  | 'sunny'
  | 'berry'
  | 'midnight'
  | 'robot'
  | 'bunny'
  | 'panda'
  | 'dino'
  | 'shark'
  | 'royal'
  | 'ninja'
  | 'lava'
  | 'angel'
  | 'sakura'
  | 'sunflower'
  | 'rose'
  | 'lotus'
  | 'tulip';

export interface AppSettings {
  /** Colour theme; 'system' follows the device. */
  theme: 'dark' | 'light' | 'system';
  soundEnabled: boolean;
  /** Background music (synthesized, one tune per stage). */
  musicEnabled: boolean;
  musicVolume: number;
  sfxVolume: number;
  speechEnabled: boolean;
  speechRate: number;
  /** Set once the 0.9× → 0.8× default change has been applied to this save. */
  speechRateV2?: boolean;
  /** Read each word aloud right before its balloon appears. */
  announceBeforeSpawn: boolean;
  /** What to read before a balloon appears when the prompt is Vietnamese. */
  recallAnnounce: RecallAnnounce;
  speakOnCorrect: boolean;
  animations: boolean;
  reducedMotion: boolean;
  copyModeHighlight: boolean;
  recallModeHighlight: boolean;
  /** In-game keyboard instead of the device's: 'auto' = on touch screens. */
  screenKeyboard: 'auto' | 'on' | 'off';
  /** Optional DeepSeek API key for AI word-list help; stored only on this device. */
  deepseekApiKey: string;
  cannonSkin: CannonSkinId;
  /** Skins bought with reward coins (free starter skins are always owned). */
  ownedSkins: CannonSkinId[];
  /** Reward coins spent in the skin shop (balance = coins earned from games − this). */
  coinsSpent: number;
  /** Achievement ids the player has already been shown (so new ones can be celebrated once). */
  achievementsSeen: string[];
  /** Bosses beaten at least once (each unlocks the next). */
  bossesDefeated: BossId[];
}

export interface Rng {
  next(): number;
}
