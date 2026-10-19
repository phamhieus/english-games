import { useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { BarChart3, BookCheck, CalendarClock, Crown, Flame, Gamepad2, Gauge, Sparkles, Star, Target } from 'lucide-react';
import { getDb } from '@/services/database/db';
import { accuracySeries, computeOverview, dailyActivity, masteryDistribution } from '@/features/statistics/stats';
import { Card, EmptyState } from '@/components/common/ui';
import { BrandTitle, Sunburst } from '@/components/common/Art';
import { BarChart, LineChart } from './Charts';

const MODE = { copy: 'Copy', recall: 'Vi → En', mistakes: 'Review' } as const;
const STATUS = { completed: 'Completed', game_over: 'Game over', quit: 'Ended', interrupted: 'Interrupted', in_progress: 'In progress' } as const;

export function StatsScreen() {
  const data = useLiveQuery(async () => {
    const db = getDb();
    const [words, progressRows, sessions] = await Promise.all([db.vocabulary.toArray(), db.progress.toArray(), db.sessions.toArray()]);
    return { words, progress: new Map(progressRows.map((p) => [p.vocabularyId, p])), sessions };
  }, []);

  const view = useMemo(() => {
    if (!data) return null;
    const now = Date.now();
    return {
      overview: computeOverview(data.words, data.progress, data.sessions, now),
      daily: dailyActivity(data.sessions, 14, now),
      accuracy: accuracySeries(data.sessions),
      mastery: masteryDistribution(data.words, data.progress),
      recent: [...data.sessions].sort((a, b) => b.startedAt - a.startedAt).slice(0, 8),
    };
  }, [data]);

  if (!view) return null;
  const o = view.overview;
  const tiles: [string, string | number, typeof Star, string][] = [
    ['Words learned', o.learned, BookCheck, 'bg-candy-blue'],
    ['Not practiced yet', o.notPracticed, Sparkles, 'bg-[#b7a4f7]'],
    ['Due for review', o.due, CalendarClock, 'bg-[#ff9fb8]'],
    ['Mastered', o.mastered, Star, 'bg-candy-mint'],
    ['Average accuracy', o.averageAccuracy === null ? '—' : `${Math.round(o.averageAccuracy * 100)}%`, Target, 'bg-candy-sun'],
    ['Typing speed', o.wordsPerMinute === null ? '—' : `${Math.round(o.wordsPerMinute)} WPM`, Gauge, 'bg-candy-blue'],
    ['Game sessions', o.totalSessions, Gamepad2, 'bg-[#ff9fb8]'],
    ['Best score', o.bestScore, Crown, 'bg-candy-sun'],
  ];
  const fmtDate = (ts: number) => new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

  return (
    <div className="flex flex-col gap-4">
      <section className="card relative flex flex-wrap items-center gap-4 overflow-hidden rounded-3xl bg-candy-purple px-6 py-5 text-white">
        <Sunburst />
        <div className="relative mr-auto">
          <h1 className="text-4xl sm:text-5xl">
            <BrandTitle onColor>Your progress</BrandTitle>
          </h1>
          <p className="mt-2 font-semibold text-white/85">Every balloon you pop makes a word stick.</p>
        </div>
        <div className="relative flex items-center gap-3 rounded-2xl border-2 border-line bg-candy-sun px-4 py-2 text-ink shadow-[0_4px_0_var(--color-line)]">
          <Flame size={34} className="text-candy-pink" fill="currentColor" />
          <div>
            <div className="font-display text-3xl leading-none font-bold tabular-nums" data-testid="stat-learning-streak">
              {`${o.streak} day${o.streak === 1 ? '' : 's'}`}
            </div>
            <div className="text-xs font-extrabold tracking-wide uppercase">Learning streak</div>
          </div>
        </div>
      </section>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4" data-testid="stat-tiles">
        {tiles.map(([label, value, Icon, tile]) => (
          <Card key={label} className="flex items-center gap-3 p-3.5">
            <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border-2 border-line ${tile}`}>
              <Icon size={22} strokeWidth={2.5} />
            </span>
            <div className="min-w-0">
              <div className="font-display text-2xl leading-tight font-bold tabular-nums" data-testid={`stat-${label.toLowerCase().replace(/[^a-z]+/g, '-')}`}>
                {value}
              </div>
              <div className="truncate text-xs font-bold tracking-wide text-ink-soft uppercase">{label}</div>
            </div>
          </Card>
        ))}
      </div>

      {o.totalSessions === 0 ? (
        <Card className="p-6">
          <EmptyState icon={<BarChart3 size={48} />} title="No games played yet">
            Charts appear after your first session. Go pop some balloons!
          </EmptyState>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="p-5">
            <h2 className="font-bold">Accuracy per session</h2>
            <p className="mb-2 text-sm text-ink-soft">Last {view.accuracy.length} sessions</p>
            <LineChart
              label="Accuracy per session"
              data={view.accuracy.map((p) => ({ key: String(p.index), label: fmtDate(p.date), value: p.accuracy }))}
              formatTip={(d) => `${d.label}: ${Math.round(d.value * 100)}%`}
            />
          </Card>
          <Card className="p-5">
            <h2 className="font-bold">Daily practice</h2>
            <p className="mb-2 text-sm text-ink-soft">Answers per day, last 14 days</p>
            <BarChart
              label="Answers per day"
              xLabelEvery={2}
              data={view.daily.map((d) => ({ key: d.key, label: fmtDate(d.date), value: d.answers }))}
              formatTip={(d) => `${d.label}: ${d.value} answers`}
            />
          </Card>
          <Card className="p-5">
            <h2 className="font-bold">Vocabulary mastery</h2>
            <p className="mb-2 text-sm text-ink-soft">Number of words by mastery score (all collections)</p>
            <BarChart
              label="Words by mastery score"
              data={view.mastery.map((b) => ({ key: b.label, label: b.label, value: b.count }))}
              formatTip={(d) => `${d.label}: ${d.value} words`}
            />
          </Card>
        </div>
      )}

      {view.recent.length > 0 && (
        <Card className="overflow-x-auto p-5">
          <h2 className="mb-2 font-bold">Recent sessions</h2>
          <table className="w-full min-w-[520px] text-left text-sm">
            <thead className="text-xs uppercase tracking-wide text-ink-soft">
              <tr>
                <th className="py-1.5">Date</th>
                <th>Collection</th>
                <th>Mode</th>
                <th className="text-right">Score</th>
                <th className="text-right">Accuracy</th>
                <th className="text-right">Status</th>
              </tr>
            </thead>
            <tbody>
              {view.recent.map((s) => (
                <tr key={s.id} className="border-t-2 border-line/10">
                  <td className="py-1.5">{new Date(s.startedAt).toLocaleString()}</td>
                  <td className="max-w-[160px] truncate">{s.collectionName}</td>
                  <td>{s.boss ? 'Boss' : MODE[s.mode]}</td>
                  <td className="text-right font-semibold tabular-nums">{s.score}</td>
                  <td className="text-right tabular-nums">{Math.round(s.accuracy * 100)}%</td>
                  <td className="text-right">{STATUS[s.status]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
