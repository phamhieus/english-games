import { useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { BarChart3 } from 'lucide-react';
import { getDb } from '@/services/database/db';
import { accuracySeries, computeOverview, dailyActivity, masteryDistribution } from '@/features/statistics/stats';
import { Card, EmptyState } from '@/components/common/ui';
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
  const tiles: [string, string | number][] = [
    ['Words learned', o.learned],
    ['Not practiced yet', o.notPracticed],
    ['Due for review', o.due],
    ['Mastered', o.mastered],
    ['Average accuracy', o.averageAccuracy === null ? '—' : `${Math.round(o.averageAccuracy * 100)}%`],
    ['Typing speed', o.wordsPerMinute === null ? '—' : `${Math.round(o.wordsPerMinute)} WPM`],
    ['Game sessions', o.totalSessions],
    ['Best score', o.bestScore],
    ['Learning streak', `${o.streak} day${o.streak === 1 ? '' : 's'}`],
  ];
  const fmtDate = (ts: number) => new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-3xl font-bold text-candy-purple-dark">Your progress</h1>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5" data-testid="stat-tiles">
        {tiles.map(([label, value]) => (
          <Card key={label} className="p-4">
            <div className="text-2xl font-bold tabular-nums" data-testid={`stat-${label.toLowerCase().replace(/[^a-z]+/g, '-')}`}>
              {value}
            </div>
            <div className="text-xs font-semibold uppercase tracking-wide text-ink-soft">{label}</div>
          </Card>
        ))}
      </div>

      {o.totalSessions === 0 ? (
        <Card className="p-6">
          <EmptyState icon={<BarChart3 size={48} />} title="No games played yet">
            Charts appear after your first session. Go pop some balloons! 🎈
          </EmptyState>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
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
                <tr key={s.id} className="border-t border-white">
                  <td className="py-1.5">{new Date(s.startedAt).toLocaleString()}</td>
                  <td className="max-w-[160px] truncate">{s.collectionName}</td>
                  <td>{MODE[s.mode]}</td>
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
