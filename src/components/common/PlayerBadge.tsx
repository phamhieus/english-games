import { useProgress } from '@/hooks/useProgress';
import { useAccountStore } from '@/stores/accountStore';
import { useAppStore } from '@/stores/appStore';
import { Coin } from './Art';

/** Header badge: player level with an XP bar, and the coin balance. */
export function PlayerBadge() {
  const p = useProgress();
  const user = useAccountStore((s) => s.user);
  const navigate = useAppStore((s) => s.navigate);
  if (!p) return null;
  const pct = Math.round((p.into / p.needed) * 100);
  const coins = p.coins >= 10_000 ? `${(p.coins / 1000).toFixed(p.coins >= 100_000 ? 0 : 1)}k` : String(p.coins);
  return (
    <div className="flex min-w-0 items-center gap-1.5 sm:gap-2">
      <button
        type="button"
        onClick={() => navigate('profile')}
        className="flex items-center gap-2 rounded-2xl border-2 border-line bg-surface py-1 pr-1 pl-1 shadow-[0_3px_0_var(--color-line)] transition hover:-translate-y-0.5 sm:pr-3"
        title={`${user ? user.name : 'Profile'} · ${p.into} / ${p.needed} XP to level ${p.level + 1}`}
        aria-label={`Profile and achievements, level ${p.level}`}
        data-testid="player-level"
      >
        {user?.avatarUrl ? (
          <img src={user.avatarUrl} alt="" referrerPolicy="no-referrer" className="h-8 w-8 rounded-xl border-2 border-line object-cover" />
        ) : null}
        <span className="flex h-8 min-w-8 items-center justify-center rounded-xl border-2 border-line bg-candy-purple px-1 font-display text-sm font-bold text-white">
          {p.level}
        </span>
        <span className="hidden sm:block">
          <span className="block max-w-24 truncate text-left text-[10px] leading-none font-extrabold tracking-wide text-ink-soft uppercase">
            {user ? user.name : `Level ${p.level}`}
          </span>
          <span className="mt-1 block h-2.5 w-24 overflow-hidden rounded-full border-2 border-line bg-tint-purple">
            <span className="block h-full rounded-full bg-candy-mint" style={{ width: `${pct}%` }} />
          </span>
        </span>
      </button>
      <div
        className="flex items-center gap-1.5 rounded-2xl border-2 border-line bg-surface py-1 pr-3 pl-1.5 shadow-[0_3px_0_var(--color-line)]"
        title="Reward coins: earn them by playing, spend them on skins"
        data-testid="coin-balance"
      >
        <Coin size={22} />
        <span className="font-display font-bold tabular-nums" title={`${p.coins} coins`}>
          {coins}
        </span>
      </div>
    </div>
  );
}
