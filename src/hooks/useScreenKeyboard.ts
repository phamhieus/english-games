import { useSettingsStore } from '@/stores/settingsStore';

/** Phones and tablets: no hover and a finger-sized pointer. */
export const isTouchDevice = (): boolean =>
  typeof window !== 'undefined' && !!window.matchMedia?.('(hover: none) and (pointer: coarse)').matches;

/** Whether the game shows its own keyboard instead of the device's (see the `screenKeyboard` setting). */
export function useScreenKeyboard(): boolean {
  const mode = useSettingsStore((s) => s.settings.screenKeyboard);
  return mode === 'on' || (mode === 'auto' && isTouchDevice());
}
