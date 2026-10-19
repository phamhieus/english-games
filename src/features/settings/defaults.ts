import type { AppSettings } from '@/types';

export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

export const DEFAULT_SETTINGS: AppSettings = {
  soundEnabled: true,
  sfxVolume: 0.6,
  speechEnabled: true,
  speechRate: 0.9,
  announceBeforeSpawn: true,
  recallAnnounce: 'vietnamese',
  speakOnCorrect: false,
  animations: true,
  reducedMotion: false,
  copyModeHighlight: true,
  recallModeHighlight: false,
};

export function mergeSettings(stored: Partial<AppSettings> | undefined): AppSettings {
  return { ...DEFAULT_SETTINGS, reducedMotion: prefersReducedMotion(), ...(stored ?? {}) };
}
