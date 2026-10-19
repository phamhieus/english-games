import { useState } from 'react';
import { CloudCheck, CloudOff, FlaskConical, LogOut, RefreshCw, Trash2, Trophy } from 'lucide-react';
import { useAccountStore } from '@/stores/accountStore';
import { useProgress } from '@/hooks/useProgress';
import { useAchievements } from '@/hooks/useAchievements';
import { skinById } from '@/game/config/theme';
import { useSettingsStore } from '@/stores/settingsStore';
import { Button, Card, ConfirmDialog } from '@/components/common/ui';
import { BrandTitle, Coin, Sunburst } from '@/components/common/Art';
import { CannonPreview } from '@/components/common/CannonPreview';
import { AchievementBadge } from './AchievementBadge';
import { WorldMap } from './WorldMap';

const PROVIDER_LABEL = { google: 'Google', facebook: 'Facebook', dev: 'test sign-in' } as const;

function GoogleLogo() {
  return (
    <svg viewBox="0 0 48 48" width="20" height="20" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.3 0-9.7-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}

function FacebookLogo() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden>
      <circle cx="12" cy="12" r="12" fill="#fff" />
      <path fill="#1877F2" d="M13.4 24v-8.4h2.8l.4-3.3h-3.2v-2.1c0-.9.3-1.6 1.6-1.6h1.7V5.7c-.3 0-1.3-.1-2.5-.1-2.5 0-4.2 1.5-4.2 4.3v2.4H7.2v3.3H10V24h3.4z" />
    </svg>
  );
}

function timeAgo(ts: number): string {
  const s = Math.round((Date.now() - ts) / 1000);
  if (s < 45) return 'just now';
  const m = Math.round(s / 60);
  return m < 60 ? `${m} min ago` : `${Math.round(m / 60)} h ago`;
}

function Avatar({ name, url, size = 72 }: { name: string; url: string | null; size?: number }) {
  if (url) return <img src={url} alt="" width={size} height={size} referrerPolicy="no-referrer" className="rounded-full border-[3px] border-line bg-surface object-cover" style={{ width: size, height: size }} />;
  const initials = name.split(/\s+/).map((p) => p[0]).join('').slice(0, 2).toUpperCase();
  return (
    <span className="flex items-center justify-center rounded-full border-[3px] border-line bg-candy-sun font-display font-bold text-ink" style={{ width: size, height: size, fontSize: size * 0.38 }}>
      {initials || '?'}
    </span>
  );
}

export function ProfileScreen() {
  const { status, user, providers, sync, lastSyncedAt, error, signIn, signOut, deleteAccount, syncNow } = useAccountStore();
  const progress = useProgress();
  const achievements = useAchievements();
  const skin = skinById(useSettingsStore((s) => s.settings.cannonSkin));
  const [confirm, setConfirm] = useState<'signout-unsynced' | 'delete' | null>(null);
  const unlocked = achievements?.filter((a) => a.unlocked).length ?? 0;

  const doSignOut = async (force = false) => {
    const ok = await signOut(force);
    if (!ok) setConfirm('signout-unsynced');
    else setConfirm(null);
  };

  return (
    <div className="mx-auto grid max-w-5xl gap-4 lg:grid-cols-[minmax(300px,380px)_1fr]">
      {/* ── Account card ─────────────────────────────── */}
      <section className="card relative self-start overflow-hidden rounded-3xl bg-candy-purple p-5 text-white lg:sticky lg:top-0">
        <Sunburst />
        <div className="relative flex flex-col items-center text-center">
          {status === 'signed-in' && user ? (
            <>
              <Avatar name={user.name} url={user.avatarUrl} size={84} />
              <h1 className="title-3d mt-3 text-3xl text-white">{user.name}</h1>
              <p className="mt-1 text-sm font-semibold text-white/85">
                Signed in with {PROVIDER_LABEL[user.provider]} · since {new Date(user.createdAt).toLocaleDateString()}
              </p>
            </>
          ) : (
            <>
              <span className="animate-bob">
                <CannonPreview skin={skin} size={96} />
              </span>
              <h1 className="mt-2 text-3xl">
                <BrandTitle onColor>Save your progress</BrandTitle>
              </h1>
              <p className="mt-1 max-w-xs text-sm font-semibold text-white/90">
                Sign in to keep your words, coins, skins and trophies safe and play on any device.
              </p>
            </>
          )}

          {progress && (
            <div className="mt-4 grid w-full grid-cols-2 gap-2 text-ink">
              <div className="rounded-xl border-2 border-line bg-surface px-3 py-2 text-left">
                <div className="text-xs font-extrabold text-ink-soft uppercase">Level {progress.level}</div>
                <div className="mt-1 h-2.5 overflow-hidden rounded-full border-2 border-line bg-tint-purple">
                  <div className="h-full rounded-full bg-candy-mint" style={{ width: `${Math.round((progress.into / progress.needed) * 100)}%` }} />
                </div>
                <div className="mt-0.5 text-[10px] font-bold text-ink-soft">
                  {progress.into}/{progress.needed} XP
                </div>
              </div>
              <div className="flex items-center gap-2 rounded-xl border-2 border-line bg-candy-sun px-3 py-2">
                <Coin size={26} />
                <div className="text-left">
                  <div className="font-display text-xl leading-none font-bold tabular-nums">{progress.coins}</div>
                  <div className="text-[10px] font-extrabold uppercase">Coins</div>
                </div>
              </div>
            </div>
          )}

          {status === 'loading' && <p className="mt-4 font-semibold">Checking your account…</p>}

          {status === 'unavailable' && (
            <p className="mt-4 rounded-xl border-2 border-line bg-surface px-3 py-2 text-sm font-semibold text-ink">
              Online accounts need the game server. Locally, run <code>npm run dev:api</code> next to <code>npm run dev</code>.
            </p>
          )}

          {status === 'signed-out' && (
            <div className="mt-4 flex w-full flex-col gap-2.5">
              {error && <p className="rounded-xl border-2 border-line bg-candy-sun px-3 py-2 text-sm font-bold text-ink">{error}</p>}
              {providers.includes('google') && (
                <button
                  type="button"
                  onClick={() => signIn('google')}
                  className="btn-candy flex items-center justify-center gap-3 rounded-xl bg-surface px-4 py-2.5 font-semibold text-ink"
                >
                  <GoogleLogo /> Continue with Google
                </button>
              )}
              {providers.includes('facebook') && (
                <button
                  type="button"
                  onClick={() => signIn('facebook')}
                  className="btn-candy flex items-center justify-center gap-3 rounded-xl bg-[#1877F2] px-4 py-2.5 font-semibold text-white"
                >
                  <FacebookLogo /> Continue with Facebook
                </button>
              )}
              {!providers.includes('google') && !providers.includes('facebook') && (
                <p className="rounded-xl border-2 border-line bg-surface px-3 py-2 text-sm font-semibold text-ink">
                  Google and Facebook sign-in aren’t set up on this server yet.
                </p>
              )}
              {providers.includes('dev') && (
                <div className="rounded-xl border-2 border-dashed border-white/70 p-2.5 text-left">
                  <div className="mb-1.5 flex items-center gap-1.5 text-xs font-extrabold tracking-wide uppercase">
                    <FlaskConical size={14} /> Local testing only
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="white" onClick={() => window.location.assign('/api/auth/dev/start?name=Test%20player')}>
                      Test player
                    </Button>
                    <Button size="sm" variant="sun" onClick={() => window.location.assign('/api/auth/dev/start?name=Skin%20Tester&coins=50000')} data-testid="dev-rich">
                      Tester · 50,000 coins
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {status === 'signed-in' && (
            <div className="mt-4 w-full">
              <div className="flex items-center justify-center gap-2 rounded-xl border-2 border-line bg-surface px-3 py-2 text-sm font-semibold text-ink" data-testid="sync-status">
                {sync === 'syncing' ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" /> Saving to your account…
                  </>
                ) : sync === 'error' ? (
                  <>
                    <CloudOff size={16} className="text-candy-pink" /> {error ?? 'Could not sync.'}
                  </>
                ) : (
                  <>
                    <CloudCheck size={16} className="text-candy-mint-dark" /> Saved to your account {lastSyncedAt ? timeAgo(lastSyncedAt) : ''}
                  </>
                )}
              </div>
              <div className="mt-2.5 flex flex-wrap justify-center gap-2">
                <Button size="sm" variant="white" icon={<RefreshCw size={16} />} disabled={sync === 'syncing'} onClick={() => void syncNow()}>
                  Sync now
                </Button>
                <Button size="sm" variant="white" icon={<LogOut size={16} />} onClick={() => void doSignOut()}>
                  Sign out
                </Button>
                <Button size="sm" variant="danger" icon={<Trash2 size={16} />} onClick={() => setConfirm('delete')}>
                  Delete account
                </Button>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ── Trophies and world map ─────────────────────────────── */}
      <div className="flex min-w-0 flex-col gap-4">
        <Card className="p-4 sm:p-5">
          <div className="mb-3 flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl border-2 border-line bg-candy-sun shadow-[0_2px_0_var(--color-line)]">
              <Trophy size={22} strokeWidth={2.5} />
            </span>
            <div className="mr-auto">
              <h2 className="text-xl font-bold">Achievements</h2>
              <p className="text-sm text-ink-soft">{status === 'signed-in' ? 'Saved with your account.' : 'Sign in to keep them on every device.'}</p>
            </div>
            {achievements && (
              <span className="rounded-full border-2 border-line bg-surface px-3 py-0.5 font-display font-bold" data-testid="achievements-count">
                {unlocked}/{achievements.length}
              </span>
            )}
          </div>
          <div className="grid gap-2.5 sm:grid-cols-2">
            {achievements
              ?.slice()
              .sort((a, b) => Number(b.unlocked) - Number(a.unlocked) || b.progress - a.progress)
              .map((a) => <AchievementBadge key={a.def.id} a={a} />)}
          </div>
        </Card>
        <WorldMap />
      </div>

      {confirm === 'signout-unsynced' && (
        <ConfirmDialog
          title="Sign out without saving?"
          message="Your latest changes couldn't be saved to your account (maybe you're offline). If you sign out now, those changes are lost on this device."
          confirmLabel="Sign out anyway"
          onConfirm={() => void doSignOut(true)}
          onCancel={() => setConfirm(null)}
        />
      )}
      {confirm === 'delete' && (
        <ConfirmDialog
          title="Delete your account?"
          message="Your saved progress in the cloud will be deleted for good. This device keeps what it has now."
          confirmLabel="Delete account"
          onConfirm={() => {
            setConfirm(null);
            void deleteAccount();
          }}
          onCancel={() => setConfirm(null)}
        />
      )}
    </div>
  );
}
