import { useState } from 'react';
import { CloudCheck, CloudOff, LogOut, RefreshCw, Trash2, Trophy } from 'lucide-react';
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
import { Avatar, PROVIDER_LABEL, SignInOptions, useSignOut } from './AccountParts';

function timeAgo(ts: number): string {
  const s = Math.round((Date.now() - ts) / 1000);
  if (s < 45) return 'just now';
  const m = Math.round(s / 60);
  return m < 60 ? `${m} min ago` : `${Math.round(m / 60)} h ago`;
}

export function ProfileScreen() {
  const { status, user, sync, lastSyncedAt, error, deleteAccount, syncNow } = useAccountStore();
  const progress = useProgress();
  const achievements = useAchievements();
  const skin = skinById(useSettingsStore((s) => s.settings.cannonSkin));
  const [confirm, setConfirm] = useState<'delete' | null>(null);
  const signOut = useSignOut();
  const unlocked = achievements?.filter((a) => a.unlocked).length ?? 0;

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
            <div className="mt-4 w-full">
              <SignInOptions onColor />
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
                <Button size="sm" variant="white" icon={<LogOut size={16} />} disabled={signOut.busy} onClick={signOut.request}>
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

      {signOut.dialog}
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
