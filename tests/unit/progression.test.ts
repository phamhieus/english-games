import { describe, expect, it } from 'vitest';
import {
  coinBalance,
  coinsForSession,
  FREE_SKINS,
  isSkinOwned,
  levelFromXp,
  nextStageUnlock,
  stagesUnlockedBetween,
  totalCoins,
  totalXp,
  unlockedStages,
  xpForSession,
} from '@/features/progression/progression';
import { skinById } from '@/game/config/theme';
import { STAGES } from '@/game/config/stages';
import type { SessionRecord } from '@/types';

const session = (patch: Partial<SessionRecord>) => ({ correct: 0, bestCombo: 0, score: 0, status: 'quit', ...patch }) as SessionRecord;

describe('progression', () => {
  it('awards XP for correct answers, combos and finishing', () => {
    expect(xpForSession(session({ correct: 8, bestCombo: 5, status: 'completed' }))).toBe(80 + 10 + 50);
    expect(xpForSession(session({ correct: 3, bestCombo: 2, status: 'game_over' }))).toBe(34);
    expect(totalXp([session({ correct: 1 }), session({ correct: 2 })])).toBe(30);
  });

  it('turns XP into levels with a growing curve', () => {
    expect(levelFromXp(0)).toEqual({ level: 1, into: 0, needed: 100 });
    expect(levelFromXp(99).level).toBe(1);
    expect(levelFromXp(100)).toEqual({ level: 2, into: 0, needed: 150 });
    expect(levelFromXp(260)).toEqual({ level: 3, into: 10, needed: 200 });
  });

  it('unlocks stages by level', () => {
    expect(unlockedStages(1).map((s) => s.id)).toEqual(['meadow']);
    expect(unlockedStages(99)).toHaveLength(STAGES.length);
    expect(stagesUnlockedBetween(1, 3).map((s) => s.id)).toEqual(['garden', 'sunset']);
    expect(stagesUnlockedBetween(3, 3)).toEqual([]);
    expect(nextStageUnlock(3)?.id).toBe('autumn');
    expect(nextStageUnlock(99)).toBeNull();
  });

  it('pays coins from the score and subtracts what was spent', () => {
    expect(coinsForSession(session({ score: 120, status: 'completed' }))).toBe(24 + 20);
    expect(coinsForSession(session({ score: 37 }))).toBe(7);
    expect(totalCoins([session({ score: 50 }), session({ score: 50 })])).toBe(20);
    expect(FREE_SKINS).toEqual(['classic', 'berry']);
    expect(isSkinOwned(skinById('classic'), [])).toBe(true);
    expect(isSkinOwned(skinById('panda'), [])).toBe(false);
    expect(coinBalance(400, 250)).toBe(150);
    expect(coinBalance(100, 250)).toBe(0);
  });
});
