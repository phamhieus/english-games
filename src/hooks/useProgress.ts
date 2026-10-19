import { useLiveQuery } from 'dexie-react-hooks';
import { getDb } from '@/services/database/db';
import { useAccountStore } from '@/stores/accountStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { coinBalance, levelFromXp, totalCoins, totalXp, type LevelInfo } from '@/features/progression/progression';

export interface Progress extends LevelInfo {
  xp: number;
  /** Reward coins available to spend. */
  coins: number;
}

/**
 * Player XP, level and coin balance, derived live from the saved game history
 * (plus any coins granted to the signed-in account). `undefined` while loading.
 */
export function useProgress(): Progress | undefined {
  const spent = useSettingsStore((s) => s.settings.coinsSpent);
  const bonus = useAccountStore((s) => s.user?.bonusCoins ?? 0);
  const earned = useLiveQuery(async () => {
    const sessions = await getDb().sessions.toArray();
    return { xp: totalXp(sessions), coins: totalCoins(sessions) };
  }, []);
  if (!earned) return undefined;
  return { xp: earned.xp, coins: coinBalance(earned.coins + bonus, spent), ...levelFromXp(earned.xp) };
}
