import { BookOpen, Brain, Flame, Gamepad2, Gauge, Library, Lock, Map, Shirt, Sparkles, Star, Swords, Target, Trophy, Zap } from 'lucide-react';
import type { AchievementIcon, AchievementState, AchievementTier } from '@/features/achievements/achievements';

const ICONS: Record<AchievementIcon, typeof Star> = {
  target: Target,
  gamepad: Gamepad2,
  sparkles: Sparkles,
  zap: Zap,
  trophy: Trophy,
  book: BookOpen,
  brain: Brain,
  flame: Flame,
  star: Star,
  map: Map,
  shirt: Shirt,
  gauge: Gauge,
  library: Library,
  swords: Swords,
};

export const TIER_STYLE: Record<AchievementTier, { label: string; color: string }> = {
  bronze: { label: 'Bronze', color: '#f0a873' },
  silver: { label: 'Silver', color: '#c9d2e3' },
  gold: { label: 'Gold', color: '#ffc43d' },
};

/** One achievement card: medal, title, description and progress. */
export function AchievementBadge({ a, compact = false }: { a: AchievementState; compact?: boolean }) {
  const Icon = ICONS[a.def.icon];
  const tier = TIER_STYLE[a.def.tier];
  return (
    <div
      className={`flex items-center gap-3 rounded-2xl border-2 p-3 ${a.unlocked ? 'border-line bg-surface shadow-[0_3px_0_var(--color-line)]' : 'border-line/15 bg-surface/70'}`}
      data-testid={`achievement-${a.def.id}`}
    >
      <span
        className={`relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 text-line ${a.unlocked ? 'border-line' : 'border-line/20 bg-tint-purple'}`}
        style={a.unlocked ? { background: tier.color } : undefined}
      >
        {a.unlocked ? <Icon size={22} strokeWidth={2.5} /> : <Lock size={18} className="text-ink-soft" />}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className={`truncate font-display font-bold ${a.unlocked ? '' : 'text-ink-soft'}`}>{a.def.title}</span>
          {!compact && (
            <span className="rounded-full border-2 border-line px-1.5 text-[9px] font-extrabold tracking-wide text-line uppercase" style={{ background: tier.color }}>
              {tier.label}
            </span>
          )}
        </div>
        <p className="text-xs leading-snug text-ink-soft">{a.def.desc}</p>
        {!a.unlocked && !compact && (
          <div className="mt-1 flex items-center gap-2">
            <span className="h-2 flex-1 overflow-hidden rounded-full border border-line/20 bg-tint-purple">
              <span className="block h-full rounded-full bg-candy-mint" style={{ width: `${Math.round(a.progress * 100)}%` }} />
            </span>
            <span className="text-[10px] font-bold text-ink-soft tabular-nums">
              {Math.min(a.value, a.def.target)}/{a.def.target}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
