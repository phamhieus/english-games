import { useCallback } from 'react';
import { useAppStore } from '@/stores/appStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { useProgress } from '@/hooks/useProgress';
import { randomStage } from '@/game/config/stages';
import { unlockedStages } from '@/features/progression/progression';
import { startAdventure } from '@/features/adventure/adventure';
import { createId } from '@/utils/id';

/** Starts a new adventure on the given word sets, tuned to the player's level. */
export function useStartAdventure(): (collectionIds: string[], collectionName: string) => void {
  const startGame = useAppStore((s) => s.startGame);
  const size = useAppStore((s) => s.setup.practiceSize);
  const defeated = useSettingsStore((s) => s.settings.bossesDefeated);
  const level = useProgress()?.level ?? 1;
  return useCallback(
    (collectionIds, collectionName) =>
      startGame(
        startAdventure({
          collectionIds,
          collectionName,
          level,
          defeated,
          size,
          stage: randomStage(unlockedStages(level)).id,
          id: createId(),
        }),
      ),
    [startGame, size, defeated, level],
  );
}
