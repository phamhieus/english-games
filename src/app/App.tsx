import { lazy, Suspense, useEffect, useState } from 'react';
import { BarChart3, BookOpen, Gamepad2, Settings as SettingsIcon, TriangleAlert } from 'lucide-react';
import { isPersistent, openDatabase } from '@/services/database/db';
import { markInterruptedSessions } from '@/services/database/repositories';
import { seedIfFirstRun } from '@/services/database/seed';
import { useSettingsStore } from '@/stores/settingsStore';
import { useAppStore, type Screen } from '@/stores/appStore';
import { useViewportHeight } from '@/hooks/useViewportHeight';
import { HomeScreen } from '@/components/game/HomeScreen';
import { ResultsScreen } from '@/components/game/ResultsScreen';
import { LibraryScreen } from '@/components/vocabulary/LibraryScreen';
import { StatsScreen } from '@/components/statistics/StatsScreen';
import { SettingsScreen } from '@/components/common/SettingsScreen';
import { Clouds } from '@/components/common/Clouds';

// Phaser is large; it's only downloaded when a game starts.
const GameScreen = lazy(() => import('@/components/game/GameScreen'));

const NAV: { screen: Screen; label: string; icon: typeof Gamepad2 }[] = [
  { screen: 'home', label: 'Play', icon: Gamepad2 },
  { screen: 'library', label: 'Library', icon: BookOpen },
  { screen: 'stats', label: 'Stats', icon: BarChart3 },
  { screen: 'settings', label: 'Settings', icon: SettingsIcon },
];

function Loading({ text = 'Loading…' }: { text?: string }) {
  return (
    <div className="flex h-full items-center justify-center text-lg font-semibold text-ink-soft">
      <span className="animate-float">🎈 {text}</span>
    </div>
  );
}

export function App() {
  useViewportHeight();
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const screen = useAppStore((s) => s.screen);
  const navigate = useAppStore((s) => s.navigate);
  const sessionKey = useAppStore((s) => s.sessionKey);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await openDatabase();
      await markInterruptedSessions().catch(() => 0);
      await seedIfFirstRun().catch((e: unknown) => console.warn('[seed]', e));
      await Promise.all([useSettingsStore.getState().load(), useAppStore.getState().loadSetup()]);
      if (!cancelled) setReady(true);
    })().catch((e: unknown) => {
      console.error(e);
      if (!cancelled) setError(e instanceof Error ? e.message : String(e));
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-center">
        <div className="card max-w-md rounded-3xl p-6">
          <h1 className="mb-2 text-xl font-bold">Something went wrong</h1>
          <p className="text-ink-soft">{error}</p>
        </div>
      </div>
    );
  }
  if (!ready) return <Loading />;

  if (screen === 'game') {
    return (
      <Suspense fallback={<Loading text="Inflating balloons…" />}>
        <GameScreen key={sessionKey} />
      </Suspense>
    );
  }

  return (
    <div className="relative flex flex-col overflow-hidden" style={{ height: 'var(--app-height)' }}>
      <Clouds />
      <header className="relative z-10 flex items-center justify-between gap-2 px-4 pt-3 sm:px-6">
        <button type="button" onClick={() => navigate('home')} className="flex items-center gap-2">
          <span className="text-3xl" aria-hidden>
            🎈
          </span>
          <span className="hidden text-2xl font-bold tracking-tight text-candy-purple-dark sm:inline">Word Shooter</span>
        </button>
        <nav className="flex gap-1 rounded-2xl bg-white/70 p-1 shadow-sm" aria-label="Main">
          {NAV.map(({ screen: s, label, icon: Icon }) => {
            const active = screen === s || (s === 'home' && screen === 'results');
            return (
              <button
                key={s}
                type="button"
                onClick={() => navigate(s)}
                aria-label={label}
                aria-current={active ? 'page' : undefined}
                className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold transition ${
                  active ? 'bg-candy-pink text-white shadow' : 'text-ink-soft hover:bg-white'
                }`}
              >
                <Icon size={18} />
                <span className="hidden sm:inline">{label}</span>
              </button>
            );
          })}
        </nav>
      </header>
      {!isPersistent() && (
        <div className="relative z-10 mx-4 mt-3 flex items-center gap-2 rounded-2xl bg-candy-sun/80 px-4 py-2 text-sm font-medium sm:mx-6">
          <TriangleAlert size={18} /> Browser storage is unavailable — your progress will be lost when you close this tab.
        </div>
      )}
      <main className="relative z-10 flex-1 overflow-y-auto px-4 py-4 sm:px-6">
        <div className="mx-auto max-w-6xl">
          {screen === 'home' && <HomeScreen />}
          {screen === 'results' && <ResultsScreen />}
          {screen === 'library' && <LibraryScreen />}
          {screen === 'stats' && <StatsScreen />}
          {screen === 'settings' && <SettingsScreen />}
        </div>
      </main>
    </div>
  );
}
