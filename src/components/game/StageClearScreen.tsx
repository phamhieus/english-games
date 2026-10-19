import { useEffect } from 'react';
import { ChevronRight, Languages, Swords } from 'lucide-react';
import { useAppStore } from '@/stores/appStore';
import { useProgress } from '@/hooks/useProgress';
import { bossById } from '@/game/config/bosses';
import { randomStage } from '@/game/config/stages';
import { unlockedStages } from '@/features/progression/progression';
import { ADVENTURE_STEPS } from '@/features/adventure/adventure';
import { Card } from '@/components/common/ui';
import { BrandTitle, Sunburst } from '@/components/common/Art';
import { AdventurePath } from './AdventurePath';
import { BossArt } from './BossArt';

/** Between two steps of an adventure: what was won, and a big button for the next step. */
export function StageClearScreen() {
  const run = useAppStore((s) => s.adventure);
  const last = useAppStore((s) => s.lastResult);
  const startGame = useAppStore((s) => s.startGame);
  const stopAdventure = useAppStore((s) => s.stopAdventure);
  const navigate = useAppStore((s) => s.navigate);
  const level = useProgress()?.level ?? 1;
  const next = run?.next;
  const info = next?.adventure;
  const missing = !run || !next || !info || !last;

  // Nothing to continue (e.g. after a reload): back to the menu.
  useEffect(() => {
    if (missing) navigate('home');
  }, [missing, navigate]);
  if (missing) return null;

  const boss = bossById(info.boss);
  const go = () => startGame({ ...next, stage: next.boss ? next.stage : randomStage(unlockedStages(level)).id });

  return (
    <Card className="animate-pop-in mx-auto max-w-xl overflow-hidden p-0 text-center" data-testid="stage-clear">
      <div className="relative overflow-hidden border-b-2 border-line bg-candy-mint px-6 pt-6 pb-5 text-white">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <Sunburst />
        </div>
        <h1 className="relative text-5xl">
          <BrandTitle onColor>Stage clear!</BrandTitle>
        </h1>
        <p className="relative mt-2 font-display text-lg font-bold text-ink">
          {ADVENTURE_STEPS[info.step - 1]!.title} · {last.correct} correct · {Math.round(last.accuracy * 100)}%
        </p>
      </div>

      <div className="flex flex-col items-center gap-5 p-5">
        <AdventurePath boss={info.boss} done={info.step} current={info.step} />

        <div className="flex w-full items-center gap-3 rounded-2xl border-2 border-line bg-surface p-3 text-left">
          {next.boss ? (
            <BossArt id={boss.id} size={56} />
          ) : (
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border-2 border-line bg-candy-sun text-ink">
              <Languages size={28} strokeWidth={2.5} />
            </span>
          )}
          <span className="min-w-0 flex-1">
            <span className="block text-xs font-extrabold tracking-wide text-ink-soft uppercase">Next · step {info.step + 1} of 3</span>
            <span className="block font-display text-lg leading-tight font-bold">{next.boss ? `Boss fight: ${boss.name}` : ADVENTURE_STEPS[1]!.title}</span>
            <span className="block text-sm text-ink-soft">
              {next.boss ? 'Type its word to attack, a bullet’s word to block.' : 'The same words again, now from their meaning.'}
            </span>
          </span>
        </div>

        <button
          type="button"
          onClick={go}
          autoFocus
          className={`flex w-full max-w-xs items-center justify-center gap-3 rounded-2xl border-[3px] border-line py-3 font-display text-3xl font-bold tracking-wide shadow-[0_7px_0_var(--color-line)] transition hover:brightness-105 active:translate-y-1.5 active:shadow-[0_1px_0_var(--color-line)] ${
            next.boss ? 'bg-candy-pink text-white' : 'bg-candy-sun text-ink'
          }`}
          data-testid="adventure-continue"
        >
          {next.boss ? <Swords size={28} strokeWidth={2.5} /> : <ChevronRight size={32} strokeWidth={3} />}
          {next.boss ? 'FIGHT!' : 'NEXT'}
        </button>
        <button type="button" onClick={stopAdventure} className="text-sm font-bold text-ink-soft underline">
          Stop here
        </button>
      </div>
    </Card>
  );
}
