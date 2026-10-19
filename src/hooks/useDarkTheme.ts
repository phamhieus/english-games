import { useEffect, useState } from 'react';
import { useSettingsStore } from '@/stores/settingsStore';

const query = () => (typeof window !== 'undefined' ? window.matchMedia?.('(prefers-color-scheme: dark)') : undefined);

/** Whether the app is currently in its dark theme (follows the device when set to "system"). */
export function useDarkTheme(): boolean {
  const theme = useSettingsStore((s) => s.settings.theme);
  const [systemDark, setSystemDark] = useState(() => !!query()?.matches);
  useEffect(() => {
    const mq = query();
    if (!mq) return;
    const update = () => setSystemDark(mq.matches);
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);
  return theme === 'dark' || (theme === 'system' && systemDark);
}
