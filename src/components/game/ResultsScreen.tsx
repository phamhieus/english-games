import { BookOpen, Play, RotateCcw, Trophy, Volume2 } from 'lucide-react';
import { useAppStore } from '@/stores/appStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { speech } from '@/services/speech/speech';
import { Button, Card, EmptyState } from '@/components/common/ui';

const TITLES = {
  completed: 'Session complete! 🎉',
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

  const stats: [string, string | number][] = [
    ['Final score', result.score],
    ['Correct', result.correct],
    ['Wrong attempts', result.incorrect],
    ['Missed balloons', result.missed],
    ['Accuracy', `${Math.round(result.accuracy * 100)}%`],
    ['Avg. response', fmtMs(result.averageResponseTimeMs)],
    ['Best combo', result.bestCombo],
  ];

  const reviewMistakes = () =>
    startGame({
      ...config,
      mode: config.mode === 'copy' ? 'copy' : 'recall',
      style: 'practice',
      practiceSize: 'all',
      wordIds: result.mistakes.map((m) => m.vocabularyId),
      seed: undefined,
    });

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <Card className="animate-pop-in p-6 text-center">
        <div className="mb-1 text-5xl" aria-hidden>
          {result.status === 'completed' ? '🏆' : result.status === 'game_over' ? '🎈' : '⭐'}
        </div>
        <h1 className="text-3xl font-bold text-candy-purple-dark" data-testid="results-title">
          {TITLES[result.status]}
        </h1>
        <p className="mt-1 text-ink-soft">{result.collectionName}</p>
        <dl className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {stats.map(([label, value], i) => (
            <div key={label} className={`rounded-2xl p-3 ${i === 0 ? 'col-span-2 bg-candy-sun/50 sm:col-span-1' : 'bg-white'}`}>
              <dd className="text-2xl font-bold tabular-nums" data-testid={`result-${label.toLowerCase().replace(/[^a-z]+/g, '-')}`}>
                {value}
              </dd>
              <dt className="text-xs font-semibold uppercase tracking-wide text-ink-soft">{label}</dt>
            </div>
          ))}
        </dl>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Button variant="pink" icon={<Play size={18} />} onClick={() => startGame({ ...config, seed: undefined })}>
            Play again
          </Button>
          <Button variant="purple" icon={<RotateCcw size={18} />} disabled={result.mistakes.length === 0} onClick={reviewMistakes}>
            Review mistakes
          </Button>
          <Button variant="white" icon={<BookOpen size={18} />} onClick={() => navigate('library')}>
            Vocabulary Library
          </Button>
        </div>
      </Card>

      <Card className="p-5">
        <h2 className="mb-3 text-lg font-bold">Words to review ({result.mistakes.length})</h2>
        {result.mistakes.length === 0 ? (
          <p className="text-ink-soft">No mistakes this time — wonderful! ✨</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {result.mistakes.map((m) => (
              <li key={m.vocabularyId} className="flex items-start gap-3 rounded-2xl bg-white p-3">
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
