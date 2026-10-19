import type { AdventureInfo, BossId, Difficulty, GameMode, PracticeSize, SessionConfig, SessionMistake, SessionRecord, StageId } from '@/types';
import { adventureBoss, bossById } from '@/game/config/bosses';

/**
 * An adventure is three games on the same words: copy typing (meet them), Vietnamese →
 * English (recall them), then a boss fight. Difficulty and the boss follow the player's
 * level. Losing a step ends the adventure.
 */

export const ADVENTURE_STEPS: readonly { title: string; short: string; mode: GameMode }[] = [
  { title: 'Copy Typing', short: 'Learn', mode: 'copy' },
  { title: 'Vietnamese → English', short: 'Recall', mode: 'recall' },
  { title: 'Boss fight', short: 'Boss', mode: 'recall' },
];

/** Easy for new players, harder as they level up. */
export function difficultyForLevel(level: number): Difficulty {
  return level >= 8 ? 'hard' : level >= 4 ? 'normal' : 'easy';
}

/** The first game of a new adventure. */
export function startAdventure(opts: {
  collectionIds: string[];
  collectionName: string;
  level: number;
  defeated: readonly BossId[];
  size: PracticeSize;
  stage: StageId;
  id: string;
}): SessionConfig {
  const adventure: AdventureInfo = { id: opts.id, step: 0, boss: adventureBoss(opts.level, opts.defeated).id };
  return {
    collectionId: opts.collectionIds[0] ?? '',
    collectionIds: opts.collectionIds,
    collectionName: opts.collectionName,
    mode: 'copy',
    difficulty: difficultyForLevel(opts.level),
    style: 'practice',
    practiceSize: opts.size,
    stage: opts.stage,
    stageMode: 'random',
    adventure,
  };
}

/**
 * The next game after a step is won, on the same words; null after the boss.
 * `stage` is the backdrop for the recall step (the boss brings its own arena).
 */
export function nextAdventureStep(config: SessionConfig, wordIds: string[], stage: StageId): SessionConfig | null {
  const a = config.adventure;
  if (!a || a.step >= 2 || wordIds.length === 0) return null;
  const base = { ...config, wordIds, practiceSize: 'all' as const, seed: undefined };
  if (a.step === 0) {
    return { ...base, mode: 'recall', style: 'practice', stage, stageMode: 'random', boss: undefined, adventure: { ...a, step: 1 } };
  }
  return { ...base, mode: 'recall', style: 'endless', stage: bossById(a.boss).stage, stageMode: 'random', boss: a.boss, adventure: { ...a, step: 2 } };
}

/** One summary for all the steps played (score, answers, merged mistakes). */
export function combineRecords(records: readonly SessionRecord[]): Pick<
  SessionRecord,
  'score' | 'correct' | 'incorrect' | 'missed' | 'accuracy' | 'averageResponseTimeMs' | 'bestCombo' | 'mistakes'
> {
  let score = 0;
  let correct = 0;
  let incorrect = 0;
  let missed = 0;
  let bestCombo = 0;
  let responseMs = 0;
  const mistakes = new Map<string, SessionMistake>();
  for (const r of records) {
    score += r.score;
    correct += r.correct;
    incorrect += r.incorrect;
    missed += r.missed;
    bestCombo = Math.max(bestCombo, r.bestCombo);
    responseMs += r.averageResponseTimeMs * r.correct;
    for (const m of r.mistakes) {
      const prev = mistakes.get(m.vocabularyId);
      mistakes.set(m.vocabularyId, prev ? { ...prev, incorrect: prev.incorrect + m.incorrect, missed: prev.missed + m.missed } : { ...m });
    }
  }
  const attempts = correct + incorrect + missed;
  return {
    score,
    correct,
    incorrect,
    missed,
    accuracy: attempts ? correct / attempts : 1,
    averageResponseTimeMs: correct ? Math.round(responseMs / correct) : 0,
    bestCombo,
    mistakes: [...mistakes.values()],
  };
}
