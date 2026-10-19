import { Flag, Flame, Heart, Pause, Skull, Star, Target, Zap } from 'lucide-react';
import type { HudState } from '@/game/GameBridge';
import { SCORING } from '@/game/config/gameConfig';

const CHIP = 'flex items-center gap-1.5 rounded-xl border-2 border-line px-2.5 py-1 shadow-[0_3px_0_var(--color-line)]';

export function GameHud({ hud, level, compact = false, onPause }: { hud: HudState; level: number | null; compact?: boolean; onPause: () => void }) {
  const c = hud.completion;
  const hot = hud.combo >= 5;
  // Narrow + short (phone with keyboard): tighter chips, and the stage number moves to the side panel.
  const chip = compact ? CHIP.replace('px-2.5', 'px-2') : CHIP;
  const heart = compact ? 17 : 20;
  return (
    <div className="flex flex-col gap-2">
      <div className={`flex items-center ${compact ? 'gap-1.5' : 'gap-2 sm:gap-2.5'}`}>
        <div className={`${chip} bg-candy-sun pr-3`}>
          <Star size={18} fill="currentColor" className="text-candy-pink" aria-hidden />
          <span className="sr-only">Score</span>
          <span className="font-display text-xl leading-none font-bold tabular-nums sm:text-2xl" data-testid="score">
            {hud.score}
          </span>
        </div>
        <div className={`${chip} gap-0.5 bg-surface`} aria-label={`${hud.lives} lives left`}>
          {Array.from({ length: SCORING.startingLives }, (_, i) => (
            <Heart key={i} size={heart} strokeWidth={2.5} className={i < hud.lives ? 'fill-candy-red text-line' : 'text-ink/25'} aria-hidden />
          ))}
        </div>
        <div
          className={`${chip} font-display text-sm font-bold transition ${
            hot ? 'animate-[pulse-soft_0.9s_ease-in-out_infinite] bg-candy-pink text-white' : 'bg-surface'
          }`}
          aria-label={`Combo ${hud.combo}`}
        >
          <Zap size={16} fill={hot ? 'currentColor' : 'none'} aria-hidden /> {hud.combo}
          {hud.multiplier > 1 && <span className={hot ? 'text-candy-sun' : 'text-candy-pink'}>×{hud.multiplier}</span>}
        </div>
        {level !== null && !compact && (
          <div className={`${chip} bg-candy-purple font-display text-sm font-bold text-white`} aria-label={`Stage ${level}`}>
            <Flag size={15} fill="currentColor" aria-hidden /> {level}
          </div>
        )}
        {compact && c && (
          <div className={`${chip} bg-surface font-display text-sm font-bold tabular-nums`} data-testid="session-progress">
            {c.done}/{c.total}
          </div>
        )}
        <div className={`${chip} hidden bg-surface font-display text-sm font-bold sm:flex`}>
          <Target size={16} aria-hidden /> {Math.round(hud.accuracy * 100)}%
        </div>
        <button type="button" onClick={onPause} className={`${chip} ml-auto bg-surface p-1.5 lg:hidden`} aria-label="Pause">
          <Pause size={20} />
        </button>
      </div>
      {hud.boss && (
        <div
          className={`flex items-center gap-2 rounded-xl border-2 border-line bg-surface py-1 pr-2 pl-1.5 shadow-[0_3px_0_var(--color-line)] ${hud.boss.enraged ? 'animate-[pulse-soft_1.2s_ease-in-out_infinite]' : ''}`}
          aria-label={`${hud.boss.name}: ${hud.boss.hp} of ${hud.boss.maxHp} health`}
          data-testid="boss-hp"
        >
          <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border-2 border-line ${hud.boss.enraged ? 'bg-candy-pink text-white' : 'bg-[#b7a4f7]'}`}>
            {hud.boss.enraged ? <Flame size={16} fill="currentColor" /> : <Skull size={16} />}
          </span>
          <span className="hidden font-display text-sm font-bold whitespace-nowrap sm:inline">{hud.boss.name}</span>
          <span className="h-4 flex-1 overflow-hidden rounded-full border-2 border-line bg-tint-coral">
            <span
              className="block h-full rounded-full bg-candy-pink transition-all duration-300"
              style={{ width: `${(hud.boss.hp / hud.boss.maxHp) * 100}%` }}
            />
          </span>
          <span className="font-display text-sm font-bold tabular-nums">
            {hud.boss.hp}/{hud.boss.maxHp}
          </span>
        </div>
      )}
      {c && !compact && (
        <div className="flex items-center gap-2 rounded-full border-2 border-line bg-surface py-1 pr-3 pl-1" aria-label={`Session progress ${c.done} of ${c.total}`}>
          <div className="h-3 flex-1 overflow-hidden rounded-full border-2 border-line bg-tint-purple">
            <div className="h-full rounded-full bg-candy-mint transition-all duration-300" style={{ width: `${c.total ? (c.done / c.total) * 100 : 0}%` }} />
          </div>
          <span className="font-display text-xs font-bold tabular-nums" data-testid="session-progress">
            {c.done}/{c.total}
          </span>
        </div>
      )}
    </div>
  );
}
