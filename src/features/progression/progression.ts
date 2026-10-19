import type { CannonSkinId, SessionRecord } from '@/types';
import { CANNON_SKINS, type CannonSkin } from '@/game/config/theme';
import { STAGES, type StageDef } from '@/game/config/stages';

/**
 * Player progression.
 *  - XP raises the player level; levels unlock stages.
 *  - Reward coins buy cannon skins (two starter skins are free).
 *
 * XP and coins earned are derived from the saved game history (nothing extra is stored),
 * so they survive reloads and backups and players keep what they earned before this
 * feature existed. The coin balance is "earned − spent" (spending is stored in settings,
 * because some skins are owned without being bought: starters and the pre-shop skin).
 */

export const XP = {
  perCorrect: 10,
  perComboStep: 2,
  completedBonus: 50,
} as const;

export const COINS = {
  /** One coin per this many points of score. */
  scorePerCoin: 5,
  completedBonus: 20,
} as const;

type Earning = Pick<SessionRecord, 'correct' | 'bestCombo' | 'status' | 'score'>;

/** XP earned in one game. */
export function xpForSession(s: Earning): number {
  return s.correct * XP.perCorrect + s.bestCombo * XP.perComboStep + (s.status === 'completed' ? XP.completedBonus : 0);
}

/** Reward coins earned in one game. */
export function coinsForSession(s: Earning): number {
  return Math.max(0, Math.round(s.score / COINS.scorePerCoin)) + (s.status === 'completed' ? COINS.completedBonus : 0);
}

export const totalXp = (sessions: readonly Earning[]) => sessions.reduce((sum, s) => sum + xpForSession(s), 0);
export const totalCoins = (sessions: readonly Earning[]) => sessions.reduce((sum, s) => sum + coinsForSession(s), 0);

/** XP needed to go from `level` to `level + 1` (100, 150, 200, …). */
export const xpToNext = (level: number) => 100 + (level - 1) * 50;

export interface LevelInfo {
  level: number;
  /** XP earned inside the current level. */
  into: number;
  /** XP the current level takes in total. */
  needed: number;
}

export function levelFromXp(xp: number): LevelInfo {
  let level = 1;
  let rest = Math.max(0, Math.floor(xp));
  while (rest >= xpToNext(level)) {
    rest -= xpToNext(level);
    level++;
  }
  return { level, into: rest, needed: xpToNext(level) };
}

// ── Stages (level unlocks) ──────────────────────────────────────────────────

export const isStageUnlocked = (stage: StageDef, level: number) => stage.unlock <= level;
export const unlockedStages = (level: number): StageDef[] => STAGES.filter((s) => isStageUnlocked(s, level));

/** Stages unlocked by going from level `from` to level `to`. */
export const stagesUnlockedBetween = (from: number, to: number): StageDef[] => STAGES.filter((s) => s.unlock > from && s.unlock <= to);

export const nextStageUnlock = (level: number): StageDef | null => STAGES.find((s) => s.unlock > level) ?? null;

// ── Skins (bought with coins) ───────────────────────────────────────────────

export const FREE_SKINS: readonly CannonSkinId[] = CANNON_SKINS.filter((s) => s.price === 0).map((s) => s.id);

export const isSkinOwned = (skin: CannonSkin, owned: readonly CannonSkinId[]) => skin.price === 0 || owned.includes(skin.id);

export const coinBalance = (earned: number, spent: number) => Math.max(0, earned - spent);
