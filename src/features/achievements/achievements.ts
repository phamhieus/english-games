import type { SessionRecord, VocabularyItem, WordProgress } from '@/types';
import { computeOverview, playedSessions } from '@/features/statistics/stats';
import { levelFromXp, totalXp } from '@/features/progression/progression';

/**
 * Achievements are computed from the saved data (games, words, progress), so they follow
 * the player's account automatically when it syncs. Only "already celebrated" ids are stored.
 */

export type AchievementTier = 'bronze' | 'silver' | 'gold';
export type AchievementIcon = 'target' | 'gamepad' | 'sparkles' | 'zap' | 'trophy' | 'book' | 'brain' | 'flame' | 'star' | 'map' | 'shirt' | 'gauge' | 'library' | 'swords';

export interface AchievementStats {
  games: number;
  correct: number;
  bestCombo: number;
  bestScore: number;
  perfectGames: number;
  learned: number;
  mastered: number;
  streak: number;
  level: number;
  skinsOwned: number;
  wpm: number;
  wordsAdded: number;
  /** Different bosses beaten. */
  bossesBeaten: number;
}

export interface AchievementDef {
  id: string;
  title: string;
  desc: string;
  icon: AchievementIcon;
  tier: AchievementTier;
  target: number;
  value: (s: AchievementStats) => number;
}

export const ACHIEVEMENTS: readonly AchievementDef[] = [
  { id: 'first-pop', title: 'First pop', desc: 'Pop your first balloon.', icon: 'target', tier: 'bronze', target: 1, value: (s) => s.correct },
  { id: 'games-10', title: 'Warming up', desc: 'Play 10 games.', icon: 'gamepad', tier: 'bronze', target: 10, value: (s) => s.games },
  { id: 'games-50', title: 'Arcade regular', desc: 'Play 50 games.', icon: 'gamepad', tier: 'silver', target: 50, value: (s) => s.games },
  { id: 'games-200', title: 'Balloon legend', desc: 'Play 200 games.', icon: 'gamepad', tier: 'gold', target: 200, value: (s) => s.games },
  { id: 'perfect', title: 'Flawless', desc: 'Finish a game of 5+ words with no mistakes.', icon: 'sparkles', tier: 'silver', target: 1, value: (s) => s.perfectGames },
  { id: 'combo-10', title: 'Combo starter', desc: 'Reach a 10 combo.', icon: 'zap', tier: 'bronze', target: 10, value: (s) => s.bestCombo },
  { id: 'combo-30', title: 'Combo master', desc: 'Reach a 30 combo.', icon: 'zap', tier: 'gold', target: 30, value: (s) => s.bestCombo },
  { id: 'score-500', title: 'High scorer', desc: 'Score 500 points in one game.', icon: 'trophy', tier: 'silver', target: 500, value: (s) => s.bestScore },
  { id: 'learned-50', title: 'Word collector', desc: 'Answer 50 different words correctly.', icon: 'book', tier: 'bronze', target: 50, value: (s) => s.learned },
  { id: 'learned-300', title: 'Walking dictionary', desc: 'Answer 300 different words correctly.', icon: 'book', tier: 'gold', target: 300, value: (s) => s.learned },
  { id: 'mastered-20', title: 'Memory master', desc: 'Master 20 words.', icon: 'brain', tier: 'silver', target: 20, value: (s) => s.mastered },
  { id: 'streak-3', title: 'On a roll', desc: 'Practise 3 days in a row.', icon: 'flame', tier: 'bronze', target: 3, value: (s) => s.streak },
  { id: 'streak-7', title: 'Week warrior', desc: 'Practise 7 days in a row.', icon: 'flame', tier: 'silver', target: 7, value: (s) => s.streak },
  { id: 'streak-30', title: 'Unstoppable', desc: 'Practise 30 days in a row.', icon: 'flame', tier: 'gold', target: 30, value: (s) => s.streak },
  { id: 'level-5', title: 'Rising star', desc: 'Reach level 5.', icon: 'star', tier: 'bronze', target: 5, value: (s) => s.level },
  { id: 'all-stages', title: 'World traveller', desc: 'Reach level 14 and unlock every stage.', icon: 'map', tier: 'gold', target: 14, value: (s) => s.level },
  { id: 'skins-5', title: 'Fashionista', desc: 'Own 5 cannon skins.', icon: 'shirt', tier: 'silver', target: 5, value: (s) => s.skinsOwned },
  { id: 'wpm-30', title: 'Speedy fingers', desc: 'Type at 30 words per minute.', icon: 'gauge', tier: 'silver', target: 30, value: (s) => s.wpm },
  { id: 'boss-1', title: 'Boss slayer', desc: 'Defeat your first boss.', icon: 'swords', tier: 'silver', target: 1, value: (s) => s.bossesBeaten },
  { id: 'boss-5', title: 'Legend', desc: 'Defeat all five bosses.', icon: 'swords', tier: 'gold', target: 5, value: (s) => s.bossesBeaten },
  { id: 'words-100', title: 'Librarian', desc: 'Have 100 words in your library.', icon: 'library', tier: 'bronze', target: 100, value: (s) => s.wordsAdded },
];

export function achievementStats(input: {
  sessions: readonly SessionRecord[];
  words: readonly VocabularyItem[];
  progress: ReadonlyMap<string, WordProgress>;
  skinsOwned: number;
  now: number;
}): AchievementStats {
  const o = computeOverview(input.words, input.progress, input.sessions, input.now);
  const played = playedSessions(input.sessions);
  return {
    games: played.length,
    correct: played.reduce((a, s) => a + s.correct, 0),
    bestCombo: played.reduce((m, s) => Math.max(m, s.bestCombo), 0),
    bestScore: o.bestScore,
    perfectGames: played.filter((s) => s.status === 'completed' && s.correct >= 5 && s.incorrect === 0 && s.missed === 0).length,
    learned: o.learned,
    mastered: o.mastered,
    streak: o.streak,
    level: levelFromXp(totalXp(input.sessions)).level,
    skinsOwned: input.skinsOwned,
    wpm: Math.round(o.wordsPerMinute ?? 0),
    wordsAdded: input.words.length,
    bossesBeaten: new Set(input.sessions.filter((s) => s.boss && s.status === 'completed').map((s) => s.boss)).size,
  };
}

export interface AchievementState {
  def: AchievementDef;
  value: number;
  unlocked: boolean;
  /** 0..1 towards the target. */
  progress: number;
}

export function evaluateAchievements(stats: AchievementStats): AchievementState[] {
  return ACHIEVEMENTS.map((def) => {
    const value = def.value(stats);
    return { def, value, unlocked: value >= def.target, progress: Math.min(1, value / def.target) };
  });
}
