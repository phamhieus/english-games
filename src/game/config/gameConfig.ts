import type { Difficulty } from '@/types';

/** Central, tweakable scoring rules. */
export const SCORING = {
  correct: 10,
  speedBonus: 5,
  speedBonusWindowMs: 3000,
  comboBonusEvery: 5,
  comboBonus: 10,
  incorrect: -2,
  missed: -5,
  startingLives: 3,
  /** Multiplier applied to base + speed points, by the combo reached with this hit. */
  comboMultipliers: [
    { minCombo: 0, multiplier: 1 },
    { minCombo: 10, multiplier: 1.5 },
    { minCombo: 20, multiplier: 2 },
  ],
  /** Identical wrong answers repeated within this window are only penalised once. */
  repeatWrongGraceMs: 1000,
} as const;

export interface DifficultyProfile {
  label: string;
  hint: string;
  /** Seconds for a short balloon to fall from the top to the danger line. */
  fallSeconds: number;
  /** Extra fall seconds per character, so long phrases remain typeable. */
  fallSecondsPerChar: number;
  spawnIntervalMs: number;
  maxBalloons: number;
  /** How much faster balloons may fall at full intensity (0.4 = +40%). */
  maxSpeedBoost: number;
  /** How much shorter spawn intervals may get at full intensity. */
  maxSpawnReduction: number;
}

export const DIFFICULTIES: Record<Difficulty, DifficultyProfile> = {
  easy: {
    label: 'Easy',
    hint: 'A1–A2 · slow, up to 2 balloons',
    fallSeconds: 15,
    fallSecondsPerChar: 0.35,
    spawnIntervalMs: 3800,
    maxBalloons: 2,
    maxSpeedBoost: 0.25,
    maxSpawnReduction: 0.25,
  },
  normal: {
    label: 'Normal',
    hint: 'A2–B1 · medium, up to 4 balloons',
    fallSeconds: 11,
    fallSecondsPerChar: 0.3,
    spawnIntervalMs: 2600,
    maxBalloons: 4,
    maxSpeedBoost: 0.35,
    maxSpawnReduction: 0.3,
  },
  hard: {
    label: 'Hard',
    hint: 'B1–C1 · fast, up to 6 balloons',
    fallSeconds: 8,
    fallSecondsPerChar: 0.22,
    spawnIntervalMs: 1800,
    maxBalloons: 6,
    maxSpeedBoost: 0.45,
    maxSpawnReduction: 0.35,
  },
};

export const GAMEPLAY = {
  /** Delay before the very first balloon. */
  firstSpawnDelayMs: 900,
  /** When words are announced, the balloon appears this long after speech starts. */
  announceLeadMs: 750,
  /** Practice sessions: a word is shown at most this many times per session. */
  maxAppearancesPerWord: 3,
  /** A replayed mistake waits for at least this many other spawns (when others are available). */
  replayGapSpawns: 2,
  /** Words shown in the last N spawns are strongly de-prioritised. */
  recentWindow: 4,
  projectileMs: 170,
  /** Seconds over which time-based difficulty ramps to its maximum. */
  rampSeconds: 240,
} as const;

export const MASTERY_THRESHOLD = 80;
