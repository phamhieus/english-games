import { create } from 'zustand';
import type { AppSettings } from '@/types';
import { DEFAULT_SETTINGS, mergeSettings } from '@/features/settings/defaults';
import { getDb } from '@/services/database/db';
import { sfx } from '@/services/audio/sfx';
import { music } from '@/services/audio/music';

const KEY = 'app-settings';

interface SettingsStore {
  settings: AppSettings;
  load(): Promise<void>;
  update(patch: Partial<AppSettings>): void;
}

function applySideEffects(s: AppSettings): void {
  sfx.enabled = s.soundEnabled;
  sfx.volume = s.sfxVolume;
  music.setVolume(s.musicVolume);
  music.setEnabled(s.musicEnabled);
  document.documentElement.dataset.motion = s.reducedMotion || !s.animations ? 'reduced' : 'full';
  const dark = s.theme === 'dark' || (s.theme === 'system' && window.matchMedia?.('(prefers-color-scheme: dark)').matches);
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#121829' : '#cdeaf7');
}

export const useSettingsStore = create<SettingsStore>((set, get) => ({
  settings: DEFAULT_SETTINGS,
  async load() {
    try {
      const row = await getDb().settings.get(KEY);
      const settings = mergeSettings(row?.value as Partial<AppSettings> | undefined);
      applySideEffects(settings);
      set({ settings });
    } catch {
      applySideEffects(get().settings);
    }
  },
  update(patch) {
    const settings = { ...get().settings, ...patch };
    applySideEffects(settings);
    set({ settings });
    void getDb()
      .settings.put({ key: KEY, value: settings })
      .catch((e: unknown) => console.warn('[settings] save failed', e));
  },
}));
