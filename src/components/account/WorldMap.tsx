import { Lock, Map as MapIcon } from 'lucide-react';
import { STAGES } from '@/game/config/stages';
import { useProgress } from '@/hooks/useProgress';
import { Card } from '@/components/common/ui';
import { StageBackdrop } from '@/components/game/StageBackdrop';

/** Every stage in journey order: unlocked ones in full colour, the rest with the level that opens them. */
export function WorldMap() {
  const level = useProgress()?.level ?? 1;
  const open = STAGES.filter((s) => s.unlock <= level).length;
  return (
    <Card className="p-4 sm:p-5">
      <div className="mb-3 flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl border-2 border-line bg-candy-blue shadow-[0_2px_0_var(--color-line)]">
          <MapIcon size={22} strokeWidth={2.5} />
        </span>
        <div className="mr-auto">
          <h2 className="text-xl font-bold">World map</h2>
          <p className="text-sm text-ink-soft">Level up to travel to new stages, each with its own music.</p>
        </div>
        <span className="rounded-full border-2 border-line bg-surface px-3 py-0.5 font-display font-bold" data-testid="stages-count">
          {open}/{STAGES.length}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-4">
        {STAGES.map((st, i) => {
          const locked = st.unlock > level;
          return (
            <div key={st.id} className={`overflow-hidden rounded-xl border-2 ${locked ? 'border-line/30' : 'border-line shadow-[0_3px_0_var(--color-line)]'}`} data-testid={`stage-${st.id}`}>
              <span className="relative block h-20 border-b-2 border-line">
                <StageBackdrop stage={st} mini />
                <span className="absolute top-1 left-1 rounded-md border-2 border-line bg-surface px-1.5 font-display text-[11px] font-bold">{i + 1}</span>
                {locked && (
                  <span className="absolute inset-0 flex flex-col items-center justify-center gap-0.5 bg-line/60 text-white">
                    <Lock size={18} strokeWidth={3} />
                    <span className="font-display text-xs font-bold">Level {st.unlock}</span>
                  </span>
                )}
              </span>
              <span className={`block truncate bg-surface px-2 py-1 font-display text-sm font-semibold ${locked ? 'text-ink-soft' : ''}`}>{st.name}</span>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
