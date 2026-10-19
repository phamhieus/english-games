import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import { BarChart3, BookOpen, Gamepad2, Settings as SettingsIcon, Shirt, TriangleAlert } from 'lucide-react';
import { isPersistent, openDatabase } from '@/services/database/db';
import { markInterruptedSessions } from '@/services/database/repositories';
import { replaceOldStarterSets, seedIfFirstRun } from '@/services/database/seed';
import { useSettingsStore } from '@/stores/settingsStore';
import { useAppStore, type Screen } from '@/stores/appStore';
import { useViewportHeight } from '@/hooks/useViewportHeight';
import { music } from '@/services/audio/music';
import { HomeScreen } from '@/components/game/HomeScreen';
import { ResultsScreen } from '@/components/game/ResultsScreen';
import { LibraryScreen } from '@/components/vocabulary/LibraryScreen';
import { StatsScreen } from '@/components/statistics/StatsScreen';
import { SettingsScreen } from '@/components/common/SettingsScreen';
import { SkinsScreen } from '@/components/skins/SkinsScreen';
import { ProfileScreen } from '@/components/account/ProfileScreen';
import { BossSelectScreen } from '@/components/game/BossSelectScreen';
import { StageClearScreen } from '@/components/game/StageClearScreen';
import { useAccountStore } from '@/stores/accountStore';
import { Clouds } from '@/components/common/Clouds';
import { FlatBalloon, Logo, Wordmark } from '@/components/common/Art';
import { PlayerBadge } from '@/components/common/PlayerBadge';
import { SignInMenu } from '@/components/account/SignInMenu';

// "Play as guest" hides the sign-in menu until the browser tab is closed.
const GUEST_KEY = 'ws.signin.guest';
function guestChosen(): boolean {
  try {
    return sessionStorage.getItem(GUEST_KEY) === '1';
  } catch {
    return false;
  }
}

// Phaser is large; it's only downloaded when a game starts.
const GameScreen = lazy(() => import('@/components/game/GameScreen'));

/** Game-style menu: each entry has its own colour tile. */
const NAV: { screen: Screen; label: string; icon: typeof Gamepad2; color: string }[] = [
  { screen: 'home', label: 'Play', icon: Gamepad2, color: 'bg-candy-pink text-white' },
  { screen: 'library', label: 'Library', icon: BookOpen, color: 'bg-candy-blue text-ink' },
  { screen: 'skins', label: 'Skins', icon: Shirt, color: 'bg-[#ff7fb8] text-ink' },
  { screen: 'stats', label: 'Stats', icon: BarChart3, color: 'bg-candy-mint text-ink' },
  { screen: 'settings', label: 'Settings', icon: SettingsIcon, color: 'bg-candy-sun text-ink' },
];

function Loading({ text = 'Loading…' }: { text?: string }) {
  return (
    <div className="flex h-full items-center justify-center text-lg font-semibold text-ink-soft">
      <span className="flex flex-col items-center gap-3">
        <span className="flex items-center gap-3">
          <FlatBalloon color="#d6402e" shade="#a52e20" className="animate-bob w-12" />
          <Wordmark className="text-5xl" />
        </span>
        {text}
      </span>
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
  const [askSignIn, setAskSignIn] = useState(false);
  const playAsGuest = useCallback(() => {
    try {
      sessionStorage.setItem(GUEST_KEY, '1');
    } catch {
      /* the menu just shows again next time */
    }
    setAskSignIn(false);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await openDatabase();
      await markInterruptedSessions().catch(() => 0);
      await seedIfFirstRun().catch((e: unknown) => console.warn('[seed]', e));
      await replaceOldStarterSets().catch((e: unknown) => console.warn('[basic]', e));
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

  // Account: check the session, then sync. After a Google/Facebook redirect, open the profile.
  useEffect(() => {
    if (!ready) return;
    const params = new URLSearchParams(window.location.search);
    const returned = params.has('signedIn') || params.has('signInError');
    if (returned) window.history.replaceState(null, '', window.location.pathname);
    void useAccountStore
      .getState()
      .init()
      .then(() => {
        if (!returned) {
          // Nobody signed in: offer the sign-in menu (only when the server can sign people in).
          const { status, providers } = useAccountStore.getState();
          if (status === 'signed-out' && providers.length > 0 && !guestChosen()) setAskSignIn(true);
          return;
        }
        navigate('profile');
        const err = params.get('signInError');
        if (err) {
          useAccountStore.setState({
            error: err === 'cancelled' ? 'Sign-in was cancelled.' : err === 'expired' ? 'Sign-in took too long. Please try again.' : 'Sign-in failed. Please try again.',
          });
        }
      });
  }, [ready, navigate]);

  // Keep the account in sync: after games and screen changes, settings changes (skins, coins),
  // every few minutes, and when the tab is hidden.
  useEffect(() => {
    if (ready && screen !== 'game') useAccountStore.getState().requestSync();
  }, [ready, screen]);
  useEffect(() => {
    if (!ready) return;
    const unsub = useSettingsStore.subscribe(() => useAccountStore.getState().requestSync());
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') useAccountStore.getState().requestSync();
    }, 5 * 60_000);
    const onHide = () => {
      if (document.visibilityState === 'hidden') void useAccountStore.getState().syncNow();
    };
    document.addEventListener('visibilitychange', onHide);
    return () => {
      unsub();
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onHide);
    };
  }, [ready]);

  // Menu music everywhere except in a game (the game screen plays its stage's tune).
  useEffect(() => {
    if (ready && screen !== 'game') music.play('menu');
  }, [ready, screen]);

  // Browsers only start audio after a user gesture.
  useEffect(() => {
    const unlock = () => music.unlock();
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, []);

  if (error) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-center">
        <div className="card max-w-md rounded-2xl p-6">
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
    <div className="app-root flex flex-col overflow-hidden">
      <Clouds />
      <header className="relative z-10 flex items-center justify-between gap-2 px-3 pt-3 sm:px-6">
        {/* On phones the Play tab doubles as "home", so the logo makes room for the menu. */}
        <button type="button" onClick={() => navigate('home')} aria-label="Word Shooter home" className="hidden rounded-xl sm:block">
          <Logo />
        </button>
        <div className="mr-auto">
          <PlayerBadge />
        </div>
        <nav
          className="flex shrink-0 gap-0.5 rounded-2xl border-2 border-line bg-line p-1 shadow-[0_4px_0_rgb(31_42_68/0.35)] sm:gap-1 sm:p-1.5"
          aria-label="Main"
        >
          {NAV.map(({ screen: s, label, icon: Icon, color }) => {
            const active = screen === s || (s === 'home' && (screen === 'results' || screen === 'bosses' || screen === 'stage-clear'));
            return (
              <button
                key={s}
                type="button"
                onClick={() => navigate(s)}
                aria-label={label}
                aria-current={active ? 'page' : undefined}
                className={`group flex items-center gap-2 rounded-xl px-1 py-1 text-sm font-semibold transition sm:px-1.5 xl:pr-3 ${
                  active ? 'bg-surface text-ink' : 'text-white/80 hover:bg-white/10 hover:text-white'
                }`}
              >
                <span
                  className={`flex h-7 w-7 items-center justify-center rounded-lg border-2 border-line transition-transform sm:h-8 sm:w-8 group-hover:-rotate-6 ${color} ${
                    active ? 'shadow-[0_2px_0_var(--color-line)]' : ''
                  }`}
                >
                  <Icon size={17} strokeWidth={2.5} />
                </span>
                <span className="hidden xl:inline">{label}</span>
              </button>
            );
          })}
        </nav>
      </header>
      {!isPersistent() && (
        <div className="relative z-10 mx-4 mt-3 flex items-center gap-2 rounded-2xl border-2 border-line bg-candy-sun px-4 py-2 text-sm font-medium sm:mx-6">
          <TriangleAlert size={18} /> Browser storage is unavailable — your progress will be lost when you close this tab.
        </div>
      )}
      <main className="relative z-10 flex-1 overflow-y-auto px-4 py-4 sm:px-6">
        <div className="mx-auto max-w-6xl">
          {screen === 'home' && <HomeScreen />}
          {screen === 'results' && <ResultsScreen />}
          {screen === 'library' && <LibraryScreen />}
          {screen === 'skins' && <SkinsScreen />}
          {screen === 'stats' && <StatsScreen />}
          {screen === 'settings' && <SettingsScreen />}
          {screen === 'profile' && <ProfileScreen />}
          {screen === 'bosses' && <BossSelectScreen />}
          {screen === 'stage-clear' && <StageClearScreen />}
        </div>
      </main>
      {askSignIn && <SignInMenu onGuest={playAsGuest} />}
    </div>
  );
}
