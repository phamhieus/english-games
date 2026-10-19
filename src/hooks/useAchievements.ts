import { useLiveQuery } from 'dexie-react-hooks';
import { getDb } from '@/services/database/db';
import { useSettingsStore } from '@/stores/settingsStore';
import { CANNON_SKINS } from '@/game/config/theme';
import { isSkinOwned } from '@/features/progression/progression';
import { achievementStats, evaluateAchievements, type AchievementState } from '@/features/achievements/achievements';

/** All achievements with live progress. `undefined` while loading. */
export function useAchievements(): AchievementState[] | undefined {
  const owned = useSettingsStore((s) => s.settings.ownedSkins);
  const data = useLiveQuery(async () => {
    const db = getDb();
    const [sessions, words, progressRows] = await Promise.all([db.sessions.toArray(), db.vocabulary.toArray(), db.progress.toArray()]);
    return { sessions, words, progress: new Map(progressRows.map((p) => [p.vocabularyId, p])) };
  }, []);
  if (!data) return undefined;
  const skinsOwned = CANNON_SKINS.filter((s) => isSkinOwned(s, owned)).length;
  return evaluateAchievements(achievementStats({ ...data, skinsOwned, now: Date.now() }));
}
