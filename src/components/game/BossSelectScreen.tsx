import { useState } from 'react';
import { Check, Heart, Lock, Swords, Zap } from 'lucide-react';
import { BOSSES } from '@/game/config/bosses';
import { stageById } from '@/game/config/stages';
import { useAppStore } from '@/stores/appStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { useCollections } from '@/hooks/useLibrary';
import { Button, Card, Segmented } from '@/components/common/ui';
import { BrandTitle, Sunburst } from '@/components/common/Art';
import { StageBackdrop } from './StageBackdrop';
import { BossArt } from './BossArt';

/**
 * Boss rematches (custom play). New bosses are met at the end of an adventure; once beaten,
 * they can be fought again here at any time.
 */
export function BossSelectScreen() {
  const setup = useAppStore((s) => s.setup);
  const updateSetup = useAppStore((s) => s.updateSetup);
  const startGame = useAppStore((s) => s.startGame);
  const navigate = useAppStore((s) => s.navigate);
  const defeated = useSettingsStore((s) => s.settings.bossesDefeated);
  const collections = useCollections();
  const beaten = BOSSES.filter((b) => defeated.includes(b.id));
  const [pickedId, setPickedId] = useState(beaten[beaten.length - 1]?.id ?? BOSSES[0]!.id);
  const boss = BOSSES.find((b) => b.id === pickedId) ?? BOSSES[0]!;
  const open = defeated.includes(boss.id);

  const sets = collections?.filter((c) => setup.collectionIds.includes(c.id)) ?? [];
  const words = sets.reduce((n, c) => n + c.wordCount, 0);
  const canFight = open && sets.length > 0 && words > 0;

  const fight = () => {
    if (!canFight) return;
    startGame({
      collectionId: sets[0]!.id,
      collectionIds: sets.map((c) => c.id),
      collectionName: sets.map((c) => c.name).join(' + '),
      mode: setup.bossMode,
      difficulty: setup.difficulty,
      style: 'endless',
      practiceSize: setup.practiceSize,
      stage: boss.stage,
      stageMode: 'random',
      boss: boss.id,
      levels: setup.levels,
    });
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(320px,420px)_1fr]">
      {/* Selected boss */}
      <section className="card relative flex flex-col items-center overflow-hidden rounded-3xl bg-candy-purple p-5 text-white lg:sticky lg:top-0 lg:self-start">
        <Sunburst />
        <h1 className="relative self-start text-3xl">
          <BrandTitle onColor>Boss rematch</BrandTitle>
        </h1>
        <div className="relative mt-3 flex h-56 w-full items-center justify-center overflow-hidden rounded-2xl border-2 border-line">
          <StageBackdrop stage={stageById(boss.stage)} mini />
          <span className={`relative ${open ? 'animate-bob' : 'opacity-60 grayscale'}`}>
            <BossArt id={boss.id} size={190} />
          </span>
          {!open && (
            <span className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-line/55 px-4">
              <Lock size={30} strokeWidth={3} />
              <span className="font-display font-bold">Meet it at the end of an adventure</span>
              <span className="rounded-full border-2 border-line bg-surface px-2.5 text-sm font-bold text-ink">Level {boss.minLevel}+</span>
            </span>
          )}
        </div>
        <h2 className="relative mt-3 font-display text-3xl font-bold">{boss.name}</h2>
        <p className="relative font-semibold text-white/85">{boss.tagline}</p>
        <div className="relative mt-3 grid w-full grid-cols-2 gap-2 text-sm text-ink">
          <div className="flex items-center gap-2 rounded-xl border-2 border-line bg-surface px-3 py-2">
            <Heart size={18} className="shrink-0 fill-candy-red text-line" />
            <span>
              <b className="font-display">{boss.hp}</b> hits to win
            </span>
          </div>
          <div className="flex items-center gap-2 rounded-xl border-2 border-line bg-surface px-3 py-2">
            <Zap size={18} className="shrink-0" />
            <span className="leading-tight">{boss.attack}</span>
          </div>
        </div>

        {open && (
          <div className="relative mt-4 w-full rounded-2xl border-2 border-line bg-surface p-3 text-ink">
            <div className="mb-2 text-sm font-bold">Words on the boss and its bullets</div>
            <Segmented<'copy' | 'recall'>
              label="Words shown"
              value={setup.bossMode}
              onChange={(bossMode) => updateSetup({ bossMode })}
              options={[
                { value: 'recall', label: 'Vietnamese' },
                { value: 'copy', label: 'English' },
              ]}
            />
            <p className="mt-2 text-xs text-ink-soft">
              {sets.length ? `${sets.map((c) => c.name).join(' + ')} · ${words} words` : 'No word set picked'} ·{' '}
              <button type="button" className="font-bold text-candy-purple-dark underline" onClick={() => navigate('home')}>
                change
              </button>
            </p>
          </div>
        )}

        <Button variant="sun" size="lg" className="relative mt-4 w-full" icon={<Swords size={22} />} disabled={!canFight} onClick={fight} data-testid="fight-boss">
          {open ? 'FIGHT!' : 'Locked'}
        </Button>
      </section>

      {/* All bosses */}
      <Card className="p-4 sm:p-5">
        <h2 className="mb-1 text-xl font-bold">Choose your opponent</h2>
        <p className="mb-4 text-sm text-ink-soft">
          {beaten.length
            ? 'Fight any boss you have beaten again. New bosses wait at the end of your adventures.'
            : 'Beat your first boss at the end of an adventure to unlock rematches.'}
        </p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3" role="radiogroup" aria-label="Boss">
          {BOSSES.map((b, i) => {
            const won = defeated.includes(b.id);
            const active = b.id === boss.id;
            return (
              <button
                key={b.id}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setPickedId(b.id)}
                className={`pick relative flex flex-col items-center overflow-hidden rounded-2xl pb-2 ${active ? 'bg-tint-purple' : 'bg-surface'}`}
                data-testid={`boss-${b.id}`}
              >
                <span className="relative flex h-28 w-full items-center justify-center border-b-2 border-line">
                  <StageBackdrop stage={stageById(b.stage)} mini />
                  <span className={`relative ${won ? '' : 'opacity-50 grayscale'}`}>
                    <BossArt id={b.id} size={96} />
                  </span>
                  <span className="absolute top-1.5 left-1.5 rounded-md border-2 border-line bg-surface px-1.5 font-display text-xs font-bold">{i + 1}</span>
                  <span
                    className={`absolute top-1.5 right-1.5 flex h-6 w-6 items-center justify-center rounded-full border-2 border-line ${won ? 'bg-candy-mint' : 'bg-surface'}`}
                  >
                    {won ? <Check size={14} strokeWidth={3} /> : <Lock size={13} strokeWidth={3} />}
                  </span>
                </span>
                <span className="mt-1.5 font-display font-bold">{b.name}</span>
                <span className="text-xs text-ink-soft">{won ? 'Beaten · rematch' : `Adventure · level ${b.minLevel}+`}</span>
              </button>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
