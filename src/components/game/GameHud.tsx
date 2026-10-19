import { Heart, Pause, Target, Zap } from 'lucide-react';
import type { HudState } from '@/game/GameBridge';
import { SCORING } from '@/game/config/gameConfig';

export function GameHud({ hud, onPause }: { hud: HudState; onPause: () => void }) {
  const c = hud.completion;
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2 sm:gap-3">
        <div className="rounded-2xl bg-white/85 px-3 py-1 shadow-sm">
          <span className="sr-only">Score</span>
          <span className="text-xl font-bold tabular-nums text-candy-purple-dark sm:text-2xl" data-testid="score">
            {hud.score}
          </span>
        </div>
        <div className="flex items-center gap-0.5 rounded-2xl bg-white/85 px-2 py-1.5 shadow-sm" aria-label={`${hud.lives} lives left`}>
          {Array.from({ length: SCORING.startingLives }, (_, i) => (
            <Heart
              key={i}
              size={20}
              className={i < hud.lives ? 'fill-candy-red text-candy-red' : 'text-ink/20'}
              aria-hidden
            />
          ))}
        </div>
        <div
          className={`flex items-center gap-1 rounded-2xl px-2.5 py-1 text-sm font-bold shadow-sm transition ${
            hud.combo >= 5 ? 'bg-candy-sun text-ink' : 'bg-white/85 text-ink-soft'
          }`}
          aria-label={`Combo ${hud.combo}`}
        >
          <Zap size={16} aria-hidden /> {hud.combo}
          {hud.multiplier > 1 && <span className="text-candy-pink-dark">×{hud.multiplier}</span>}
        </div>
        <div className="hidden items-center gap-1 rounded-2xl bg-white/85 px-2.5 py-1 text-sm font-bold text-ink-soft shadow-sm sm:flex">
          <Target size={16} aria-hidden /> {Math.round(hud.accuracy * 100)}%
        </div>
        <button
          type="button"
          onClick={onPause}
          className="ml-auto rounded-2xl bg-white/85 p-2 text-ink-soft shadow-sm hover:bg-white lg:hidden"
          aria-label="Pause"
        >
          <Pause size={20} />
        </button>
      </div>
      {c && (
        <div className="flex items-center gap-2" aria-label={`Session progress ${c.done} of ${c.total}`}>
          <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-white/70">
            <div
              className="h-full rounded-full bg-gradient-to-r from-candy-mint to-candy-purple transition-all duration-300"
              style={{ width: `${c.total ? (c.done / c.total) * 100 : 0}%` }}
            />
          </div>
          <span className="text-xs font-bold tabular-nums text-ink-soft" data-testid="session-progress">
            {c.done}/{c.total}
          </span>
        </div>
      )}
    </div>
  );
}
