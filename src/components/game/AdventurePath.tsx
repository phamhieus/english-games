import { Check, ChevronRight, Keyboard, Languages, X } from 'lucide-react';
import type { BossId } from '@/types';
import { bossById } from '@/game/config/bosses';
import { ADVENTURE_STEPS } from '@/features/adventure/adventure';
import { BossArt } from './BossArt';

const TILES = ['bg-candy-blue', 'bg-candy-sun', 'bg-[#b7a4f7]'] as const;

/**
 * The three steps of an adventure as a little map: Learn → Recall → Boss.
 * `done` = steps already won; `current` = the step being played or up next; `failed` marks it lost.
 */
export function AdventurePath({ boss, done = 0, current, failed = false }: { boss: BossId; done?: number; current?: number; failed?: boolean }) {
  return (
    <ol className="flex items-start justify-center gap-1 sm:gap-2" aria-label="Adventure steps">
      {ADVENTURE_STEPS.map((step, i) => {
        const won = i < done;
        const here = i === current;
        const lost = here && failed;
        return (
          <li key={step.short} className="contents">
            {i > 0 && <ChevronRight size={20} strokeWidth={3} className={`mt-6 shrink-0 ${won || here ? 'text-current' : 'opacity-40'}`} aria-hidden />}
            <div className={`flex w-24 flex-col items-center text-center sm:w-28 ${won || here ? '' : 'opacity-60'}`}>
              <span
                className={`relative flex h-16 w-16 items-center justify-center rounded-2xl border-[3px] border-line text-ink shadow-[0_3px_0_var(--color-line)] ${TILES[i]} ${
                  here && !lost ? 'ring-4 ring-candy-sun/70' : ''
                }`}
              >
                {i === 0 && <Keyboard size={28} strokeWidth={2.5} />}
                {i === 1 && <Languages size={28} strokeWidth={2.5} />}
                {i === 2 && <BossArt id={boss} size={58} />}
                {(won || lost) && (
                  <span
                    className={`absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full border-2 border-line ${won ? 'bg-candy-mint' : 'bg-candy-red text-white'}`}
                  >
                    {won ? <Check size={14} strokeWidth={3.5} /> : <X size={14} strokeWidth={3.5} />}
                  </span>
                )}
              </span>
              <span className="mt-1.5 font-display text-sm leading-tight font-bold">{step.short}</span>
              <span className="text-[11px] leading-tight font-semibold opacity-80">{i === 2 ? bossById(boss).name : step.title}</span>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
