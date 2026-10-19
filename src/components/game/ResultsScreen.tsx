import { useEffect, useState } from 'react';
import { BookOpen, Play, RotateCcw, ShoppingBag, Swords, Trophy, Volume2 } from 'lucide-react';
import { useAppStore } from '@/stores/appStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { speech } from '@/services/speech/speech';
import { CANNON_SKINS, skinById } from '@/game/config/theme';
import { BOSSES, bossById } from '@/game/config/bosses';
import { coinsForSession, isSkinOwned, levelFromXp, stagesUnlockedBetween, xpForSession } from '@/features/progression/progression';
import { useProgress } from '@/hooks/useProgress';
import { useAchievements } from '@/hooks/useAchievements';
import type { AchievementState } from '@/features/achievements/achievements';
import { AchievementBadge } from '@/components/account/AchievementBadge';
import { StageBackdrop } from './StageBackdrop';
import { Button, Card, EmptyState } from '@/components/common/ui';
import { BrandTitle, Coin, FlatBalloon, Sunburst } from '@/components/common/Art';
import { CannonPreview } from '@/components/common/CannonPreview';
import { combineRecords } from '@/features/adventure/adventure';
import { useStartAdventure } from '@/hooks/useAdventure';
import { AdventurePath } from './AdventurePath';

const TITLES = {
  completed: 'Session complete!',
  game_over: 'Game over',
  quit: 'Session ended',
  interrupted: 'Session interrupted',
  in_progress: 'Session ended',
} as const;

function fmtMs(ms: number): string {
  return ms ? `${(ms / 1000).toFixed(1)}s` : '—';
}

export function ResultsScreen() {
  const result = useAppStore((s) => s.lastResult);
  const config = useAppStore((s) => s.lastConfig);
  const startGame = useAppStore((s) => s.startGame);
  const navigate = useAppStore((s) => s.navigate);
  const speechRate = useSettingsStore((s) => s.settings.speechRate);
  const skin = skinById(useSettingsStore((s) => s.settings.cannonSkin));
  const owned = useSettingsStore((s) => s.settings.ownedSkins);
  const seen = useSettingsStore((s) => s.settings.achievementsSeen);
  const updateSettings = useSettingsStore((s) => s.update);
  const progress = useProgress();
  const achievements = useAchievements();
  const run = useAppStore((s) => s.adventure);
  const startAdventure = useStartAdventure();
  const [fresh, setFresh] = useState<AchievementState[] | null>(null);

  // Celebrate achievements unlocked since they were last shown, once.
  useEffect(() => {
    if (!achievements || fresh) return;
    const newly = achievements.filter((a) => a.unlocked && !seen.includes(a.def.id));
    setFresh(newly);
    if (newly.length) updateSettings({ achievementsSeen: [...new Set([...seen, ...newly.map((a) => a.def.id)])] });
  }, [achievements, fresh, seen, updateSettings]);

  if (!result || !config) {
    return (
      <Card className="p-6">
        <EmptyState icon={<Trophy size={48} />} title="No results yet">
          <Button variant="pink" onClick={() => navigate('home')}>
            Play a game
          </Button>
        </EmptyState>
      </Card>
    );
  }

  // An adventure shows all its steps together.
  const adventure = config.adventure && run?.id === config.adventure.id ? config.adventure : undefined;
  const records = adventure && run ? run.records : [result];
  const shown = adventure ? { ...result, ...combineRecords(records) } : result;
  const advComplete = !!adventure && adventure.step === 2 && result.status === 'completed';
  // Steps won; the next one is where the adventure stopped (lost, quit or "stop here").
  const stepsWon = records.filter((r) => r.status === 'completed').length;
  const title = adventure
    ? advComplete
      ? 'Adventure complete!'
      : result.status === 'game_over'
        ? 'Out of hearts'
        : 'Adventure ended'
    : result.boss
      ? result.status === 'completed'
        ? `${bossById(result.boss).name} defeated!`
        : `${bossById(result.boss).name} wins`
      : TITLES[result.status];

  const stats: [string, string | number][] = [
    ['Final score', shown.score],
    ['Correct', shown.correct],
    ['Wrong attempts', shown.incorrect],
    ['Missed balloons', shown.missed],
    ['Accuracy', `${Math.round(shown.accuracy * 100)}%`],
    ['Avg. response', fmtMs(shown.averageResponseTimeMs)],
    ['Best combo', shown.bestCombo],
  ];

  // Rewards: the sessions are already saved, so `progress` includes them.
  const xpGain = records.reduce((n, r) => n + xpForSession(r), 0);
  const coinGain = records.reduce((n, r) => n + coinsForSession(r), 0);
  const after = progress ? levelFromXp(progress.xp) : null;
  const before = progress ? levelFromXp(progress.xp - xpGain) : null;
  const leveledUp = !!before && !!after && after.level > before.level;
  const newStages = leveledUp ? stagesUnlockedBetween(before.level, after.level) : [];
  const bossIndex = result.boss ? BOSSES.findIndex((b) => b.id === result.boss) : -1;
  const nextBoss = bossIndex >= 0 ? BOSSES[bossIndex + 1] : undefined;
  const affordable = progress ? CANNON_SKINS.filter((s) => !isSkinOwned(s, owned) && s.price <= progress.coins) : [];

  const reviewMistakes = () =>
    startGame({
      ...config,
      mode: config.mode === 'copy' && !adventure ? 'copy' : 'recall',
      style: 'practice',
      practiceSize: 'all',
      wordIds: shown.mistakes.map((m) => m.vocabularyId),
      seed: undefined,
      boss: undefined,
      adventure: undefined,
    });
  const playAgain = () =>
    adventure ? startAdventure(config.collectionIds ?? [config.collectionId], config.collectionName) : startGame({ ...config, seed: undefined });

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <Card className="animate-pop-in overflow-hidden p-0 text-center">
        <div className={`relative overflow-hidden border-b-2 border-line px-6 pt-6 pb-4 ${result.status === 'game_over' ? 'bg-[#ff8a7a]' : 'bg-candy-purple'}`}>
          <Sunburst />
          <div className="relative flex items-end justify-center gap-4">
            <FlatBalloon color="#ffc43d" shade="#d99a0b" className="animate-bob hidden w-12 sm:block" />
            <CannonPreview skin={skin} size={110} happy={result.status !== 'game_over'} />
            <FlatBalloon color="#7cc4f5" shade="#3f98d6" className="animate-bob hidden w-10 sm:block" style={{ animationDelay: '-1.4s' }} />
          </div>
          <h1 className="relative mt-3 text-4xl sm:text-5xl" data-testid="results-title">
            <BrandTitle onColor>{title}</BrandTitle>
          </h1>
          <p className="relative mt-2 font-semibold text-white/90">{result.collectionName}</p>
          {adventure && (
            <div className="relative mt-4 text-white" data-testid="adventure-summary">
              <AdventurePath
                boss={adventure.boss}
                done={stepsWon}
                current={advComplete ? undefined : stepsWon}
                failed={!advComplete && result.status !== 'completed'}
              />
            </div>
          )}
        </div>
        <div className="p-6 pt-5">
          {/* rewards */}
          <div className="mb-4 flex flex-wrap items-center justify-center gap-3" data-testid="rewards">
            <span className="flex items-center gap-1.5 rounded-2xl border-2 border-line bg-candy-purple px-4 py-1.5 font-display text-xl font-bold text-white shadow-[0_3px_0_var(--color-line)]">
              +{xpGain} XP
            </span>
            <span className="flex items-center gap-1.5 rounded-2xl border-2 border-line bg-candy-sun px-4 py-1.5 font-display text-xl font-bold shadow-[0_3px_0_var(--color-line)]">
              +{coinGain} <Coin size={22} />
            </span>
            {after && (
              <span className="flex min-w-48 flex-1 items-center gap-2 text-left sm:flex-none">
                <span className="font-display text-sm font-bold whitespace-nowrap">Level {after.level}</span>
                <span className="h-3 w-full overflow-hidden rounded-full border-2 border-line bg-tint-purple sm:w-40">
                  <span className="block h-full rounded-full bg-candy-mint" style={{ width: `${Math.round((after.into / after.needed) * 100)}%` }} />
                </span>
              </span>
            )}
          </div>
          {leveledUp && after && (
            <div className="animate-pop-in mb-4 rounded-2xl border-2 border-line bg-tint-sun p-4 shadow-[0_3px_0_var(--color-line)]">
              <div className="title-3d text-3xl text-candy-sun">LEVEL UP!</div>
              <p className="mt-1 font-bold">You reached level {after.level}.</p>
              {newStages.length > 0 && (
                <div className="mt-3 flex flex-wrap justify-center gap-3">
                  {newStages.map((st) => (
                    <div key={st.id} className="w-36 overflow-hidden rounded-xl border-2 border-line bg-surface">
                      <span className="relative block h-16 border-b-2 border-line">
                        <StageBackdrop stage={st} mini />
                      </span>
                      <span className="block px-2 py-1 text-xs font-bold">New stage: {st.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          {fresh && fresh.length > 0 && (
            <div className="animate-pop-in mb-4 rounded-2xl border-2 border-line bg-tint-purple p-3 text-left shadow-[0_3px_0_var(--color-line)]" data-testid="new-achievements">
              <div className="mb-2 text-center font-display text-lg font-bold">
                {fresh.length === 1 ? 'Achievement unlocked!' : `${fresh.length} achievements unlocked!`}
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {fresh.slice(0, 4).map((a) => (
                  <AchievementBadge key={a.def.id} a={a} compact />
                ))}
              </div>
              {fresh.length > 4 && (
                <button type="button" onClick={() => navigate('profile')} className="mt-2 w-full text-center text-sm font-bold text-candy-purple-dark underline">
                  and {fresh.length - 4} more · see all
                </button>
              )}
            </div>
          )}
          {result.boss && result.status === 'completed' && nextBoss && (
            <button
              type="button"
              onClick={() => navigate('home')}
              className="pick mb-4 flex w-full items-center gap-3 rounded-2xl bg-tint-coral px-4 py-3 text-left"
              data-testid="next-boss"
            >
              <Swords size={24} />
              <span className="min-w-0 flex-1">
                <span className="block font-display font-bold">Next boss: {nextBoss.name}</span>
                <span className="block text-sm text-ink-soft">
                  {after && after.level < nextBoss.minLevel
                    ? `Reach level ${nextBoss.minLevel} to meet it in an adventure.`
                    : 'It waits at the end of your next adventure.'}
                </span>
              </span>
            </button>
          )}
          {affordable.length > 0 && (
            <button
              type="button"
              onClick={() => navigate('skins')}
              className="pick mb-4 flex w-full items-center gap-3 rounded-2xl bg-surface px-4 py-2 text-left"
            >
              <CannonPreview skin={affordable[affordable.length - 1]!} size={44} />
              <span className="min-w-0 flex-1">
                <span className="block font-display font-bold">You can buy a new skin!</span>
                <span className="block text-sm text-ink-soft">
                  {affordable.length === 1 ? affordable[0]!.name : `${affordable.length} skins`} within your {progress?.coins} coins
                </span>
              </span>
              <ShoppingBag size={22} />
            </button>
          )}
          <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {stats.map(([label, value], i) => (
              <div key={label} className={`rounded-xl border-2 border-line p-3 ${i === 0 ? 'col-span-2 bg-candy-sun shadow-[0_3px_0_var(--color-line)] sm:col-span-1' : 'bg-surface'}`}>
                <dd className="font-display text-2xl font-bold tabular-nums" data-testid={`result-${label.toLowerCase().replace(/[^a-z]+/g, '-')}`}>
                  {value}
                </dd>
                <dt className="text-xs font-semibold uppercase tracking-wide text-ink-soft">{label}</dt>
              </div>
            ))}
          </dl>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <Button variant="pink" icon={<Play size={18} />} onClick={playAgain}>
              {adventure ? 'New adventure' : 'Play again'}
            </Button>
            <Button variant="purple" icon={<RotateCcw size={18} />} disabled={shown.mistakes.length === 0} onClick={reviewMistakes}>
              Review mistakes
            </Button>
            <Button variant="white" icon={<BookOpen size={18} />} onClick={() => navigate('library')}>
              Vocabulary Library
            </Button>
          </div>
        </div>
      </Card>

      <Card className="p-5">
        <h2 className="mb-3 text-lg font-bold">Words to review ({shown.mistakes.length})</h2>
        {shown.mistakes.length === 0 ? (
          <p className="text-ink-soft">No mistakes this time. Wonderful!</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {shown.mistakes.map((m) => (
              <li key={m.vocabularyId} className="flex items-start gap-3 rounded-xl border-2 border-line bg-surface p-3">
                <button
                  type="button"
                  aria-label={`Pronounce ${m.english}`}
                  onClick={() => speech.speak(m.english, { rate: speechRate })}
                  className="mt-0.5 rounded-full bg-candy-mint/40 p-2 text-ink hover:bg-candy-mint/70"
                >
                  <Volume2 size={16} />
                </button>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-x-2">
                    <span className="text-lg font-bold">{m.english}</span>
                    <span className="text-ink-soft">— {m.vietnamese}</span>
                  </div>
                  {m.example && <p className="text-sm italic text-ink-soft">“{m.example}”</p>}
                </div>
                <div className="shrink-0 text-right text-xs font-semibold text-ink-soft">
                  {m.incorrect > 0 && <div>{m.incorrect} wrong</div>}
                  {m.missed > 0 && <div>{m.missed} missed</div>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
