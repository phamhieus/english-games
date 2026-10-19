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

export interface SessionConfig {
  collectionId: string;
  collectionName: string;
  mode: GameMode;
  difficulty: Difficulty;
  style: SessionStyle;
  practiceSize: PracticeSize;
  /** Restrict to these words (used by "Review mistakes" on the results screen). */
  wordIds?: string[];
  seed?: number;
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
}

export type RecallAnnounce = 'vietnamese' | 'english' | 'off';

export interface AppSettings {
  soundEnabled: boolean;
  sfxVolume: number;
  speechEnabled: boolean;
  speechRate: number;
  /** Read each word aloud right before its balloon appears. */
  announceBeforeSpawn: boolean;
  /** What to read before a balloon appears when the prompt is Vietnamese. */
  recallAnnounce: RecallAnnounce;
  speakOnCorrect: boolean;
  animations: boolean;
  reducedMotion: boolean;
  copyModeHighlight: boolean;
  recallModeHighlight: boolean;
}

export interface Rng {
  next(): number;
}
