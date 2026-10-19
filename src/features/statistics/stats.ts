import type { SessionRecord, VocabularyItem, WordProgress } from '@/types';
import { isDue, isMastered } from '@/features/learning/spacedRepetition';

export const DAY = 86_400_000;

export function dayKey(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function startOfDay(ts: number): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/** Only sessions where something was actually answered count as practice. */
export function playedSessions(sessions: readonly SessionRecord[]): SessionRecord[] {
  return sessions.filter((s) => s.correct + s.incorrect + s.missed > 0);
}

/** Consecutive days (ending today, or yesterday if not yet played today) with at least one session. */
export function learningStreak(sessions: readonly SessionRecord[], now: number): number {
  const days = new Set(playedSessions(sessions).map((s) => dayKey(s.startedAt)));
  let cursor = startOfDay(now);
  if (!days.has(dayKey(cursor))) cursor -= DAY;
  let streak = 0;
  while (days.has(dayKey(cursor))) {
    streak++;
    cursor = startOfDay(cursor - DAY / 2);
  }
  return streak;
}

export interface Overview {
  totalWords: number;
  learned: number;
  notPracticed: number;
  due: number;
  mastered: number;
  averageAccuracy: number | null;
  wordsPerMinute: number | null;
  totalSessions: number;
  bestScore: number;
  streak: number;
}

export function computeOverview(
  words: readonly VocabularyItem[],
  progress: ReadonlyMap<string, WordProgress>,
  sessions: readonly SessionRecord[],
  now: number,
): Overview {
  let learned = 0;
  let notPracticed = 0;
  let due = 0;
  let mastered = 0;
  for (const w of words) {
    const p = progress.get(w.id);
    if (!p || p.attempts === 0) notPracticed++;
    if (p && p.correctAttempts > 0) learned++;
    if (isDue(p, now)) due++;
    if (isMastered(p)) mastered++;
  }
  const played = playedSessions(sessions);
  const answers = played.reduce((a, s) => a + s.correct + s.incorrect + s.missed, 0);
  const correct = played.reduce((a, s) => a + s.correct, 0);
  const chars = played.reduce((a, s) => a + s.correctChars, 0);
  const ms = played.reduce((a, s) => a + (s.correctResponseMs ?? 0), 0);
  return {
    totalWords: words.length,
    learned,
    notPracticed,
    due,
    mastered,
    averageAccuracy: answers ? correct / answers : null,
    // Standard WPM: 5 characters = 1 word, over time spent producing correct answers.
    wordsPerMinute: ms > 0 ? chars / 5 / (ms / 60_000) : null,
    totalSessions: played.length,
    bestScore: played.reduce((m, s) => Math.max(m, s.score), 0),
    streak: learningStreak(sessions, now),
  };
}

export interface DailyPoint {
  key: string;
  date: number;
  answers: number;
  sessions: number;
}

export function dailyActivity(sessions: readonly SessionRecord[], days: number, now: number): DailyPoint[] {
  const out: DailyPoint[] = [];
  const index = new Map<string, DailyPoint>();
  let cursor = startOfDay(now);
  for (let i = 0; i < days; i++) {
    const p = { key: dayKey(cursor), date: cursor, answers: 0, sessions: 0 };
    out.unshift(p);
    index.set(p.key, p);
    cursor = startOfDay(cursor - DAY / 2);
  }
  for (const s of playedSessions(sessions)) {
    const p = index.get(dayKey(s.startedAt));
    if (!p) continue;
    p.answers += s.correct + s.incorrect + s.missed;
    p.sessions++;
  }
  return out;
}

export interface AccuracyPoint {
  index: number;
  date: number;
  accuracy: number;
  score: number;
}

export function accuracySeries(sessions: readonly SessionRecord[], limit = 30): AccuracyPoint[] {
  return playedSessions(sessions)
    .sort((a, b) => a.startedAt - b.startedAt)
    .slice(-limit)
    .map((s, i) => ({ index: i + 1, date: s.startedAt, accuracy: s.accuracy, score: s.score }));
}

export interface MasteryBucket {
  label: string;
  count: number;
}

export function masteryDistribution(
  words: readonly VocabularyItem[],
  progress: ReadonlyMap<string, WordProgress>,
): MasteryBucket[] {
  const buckets: MasteryBucket[] = [
    { label: 'New', count: 0 },
    { label: '0–19', count: 0 },
    { label: '20–39', count: 0 },
    { label: '40–59', count: 0 },
    { label: '60–79', count: 0 },
    { label: 'Mastered', count: 0 },
  ];
  for (const w of words) {
    const p = progress.get(w.id);
    if (!p || p.attempts === 0) buckets[0]!.count++;
    else if (p.masteryScore >= 80) buckets[5]!.count++;
    else buckets[1 + Math.floor(p.masteryScore / 20)]!.count++;
  }
  return buckets;
}
