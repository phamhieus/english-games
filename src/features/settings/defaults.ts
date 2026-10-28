import type { AppSettings } from '@/types';

export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

export const DEFAULT_SETTINGS: AppSettings = {
  theme: 'dark',
  soundEnabled: true,
  musicEnabled: true,
  musicVolume: 0.5,
  sfxVolume: 0.6,
  speechEnabled: true,
  speechRate: 0.8,
  speechRateV2: true,
  announceBeforeSpawn: true,
  recallAnnounce: 'vietnamese',
  speakOnCorrect: false,
  animations: true,
  reducedMotion: false,
  copyModeHighlight: true,
  recallModeHighlight: false,
  deepseekApiKey: '',
  cannonSkin: 'classic',
  ownedSkins: [],
  coinsSpent: 0,
  achievementsSeen: [],
  bossesDefeated: [],
};

export function mergeSettings(stored: Partial<AppSettings> | undefined): AppSettings {
  const merged = { ...DEFAULT_SETTINGS, reducedMotion: prefersReducedMotion(), ...(stored ?? {}) };
  // Saves from before the skin shop: keep the skin the player already had equipped.
  if (!stored?.ownedSkins) merged.ownedSkins = stored?.cannonSkin ? [stored.cannonSkin] : [];
  // The default speed went from 0.9× to 0.8× (slower is clearer); a save still on the old default moves with it.
  if (stored && !stored.speechRateV2) {
    if (stored.speechRate === 0.9) merged.speechRate = 0.8;
    merged.speechRateV2 = true;
  }
  return merged;
}
