import type { WordProgress } from '@/types';
import { MASTERY_THRESHOLD } from '@/game/config/gameConfig';

/**
 * Spaced repetition — a deliberately simple, Leitner-style schedule.
 *
 * Each word has a `reviewStep` (0 = new / just failed). Long-term scheduling only
 * advances on a correct answer *when the word was due* (never scheduled, or
 * `nextReviewAt <= now`). Answering the same word again before it is due (e.g. in
 * an endless session, or an in-session replay) updates accuracy/response-time
 * statistics but does not push the schedule further — so a word cannot be
 * "mastered" by hammering it within one sitting.
 *
 *   step after success │ next review in
 *   ───────────────────┼───────────────
 *   1                  │ 1 day
 *   2                  │ 3 days
 *   3                  │ 7 days
 *   4                  │ 16 days
 *   n ≥ 5              │ previous × 2.2 (capped at 180 days)
 *
 * An incorrect answer or a missed balloon resets the step to 0 and makes the word
 * due immediately (`nextReviewAt = now`). Replaying the mistake *within the
 * current session* is handled separately by the session system (see
 * `SessionSystem`), which keeps its own in-memory replay queue.
 */
export const DAY_MS = 24 * 60 * 60 * 1000;
const BASE_INTERVAL_DAYS = [1, 3, 7, 16] as const;
const GROWTH = 2.2;
const MAX_INTERVAL_DAYS = 180;

export function intervalDaysForStep(step: number): number {
  if (step <= 0) return 0;
  const base = BASE_INTERVAL_DAYS[step - 1];
  if (base !== undefined) return base;
  let days: number = BASE_INTERVAL_DAYS[BASE_INTERVAL_DAYS.length - 1] ?? 16;
  for (let s = BASE_INTERVAL_DAYS.length; s < step; s++) days *= GROWTH;
  return Math.min(MAX_INTERVAL_DAYS, Math.round(days));
}

export function createProgress(vocabularyId: string): WordProgress {
  return {
    vocabularyId,
    attempts: 0,
    correctAttempts: 0,
    incorrectAttempts: 0,
    missedBalloons: 0,
    averageResponseTimeMs: 0,
    consecutiveCorrect: 0,
    masteryScore: 0,
    reviewStep: 0,
  };
}

export function isDue(p: WordProgress | undefined, now: number): boolean {
  if (!p || p.attempts === 0) return false;
  return p.nextReviewAt === undefined || p.nextReviewAt <= now;
}

export function isMastered(p: WordProgress | undefined): boolean {
  return !!p && p.masteryScore >= MASTERY_THRESHOLD;
}

/**
 * Mastery 0–100, combining:
 *  - long-term retention (review step)      up to 50
 *  - overall accuracy                       up to 30
 *  - response speed (avg ≤ 2.5s is full)    up to 20
 * Retention dominates, so a single correct answer can never reach the mastery
 * threshold (80); it takes at least three successful spaced reviews.
 */
export function computeMastery(p: WordProgress): number {
  const misses = p.incorrectAttempts + p.missedBalloons;
  const total = p.correctAttempts + misses;
  if (total === 0) return 0;
  const accuracy = p.correctAttempts / total;
  const retention = Math.min(p.reviewStep, 4) / 4;
  let speed = 0;
  if (p.correctAttempts > 0 && p.averageResponseTimeMs > 0) {
    speed = Math.max(0, Math.min(1, (8000 - p.averageResponseTimeMs) / (8000 - 2500)));
  }
  const raw = retention * 50 + accuracy * 30 + speed * 20;
  return Math.round(Math.max(0, Math.min(100, raw)));
}

export function applyCorrect(prev: WordProgress, responseMs: number, now: number): WordProgress {
  const wasDue = prev.nextReviewAt === undefined || prev.nextReviewAt <= now;
  const correctAttempts = prev.correctAttempts + 1;
  const averageResponseTimeMs =
    (prev.averageResponseTimeMs * prev.correctAttempts + responseMs) / correctAttempts;
  const reviewStep = wasDue ? prev.reviewStep + 1 : prev.reviewStep;
  const next: WordProgress = {
    ...prev,
    attempts: prev.attempts + 1,
    correctAttempts,
    averageResponseTimeMs: Math.round(averageResponseTimeMs),
    consecutiveCorrect: prev.consecutiveCorrect + 1,
    lastPracticedAt: now,
    lastCorrectAt: now,
    reviewStep,
    nextReviewAt: wasDue ? now + intervalDaysForStep(reviewStep) * DAY_MS : prev.nextReviewAt,
  };
  next.masteryScore = computeMastery(next);
  return next;
}

export function applyIncorrect(prev: WordProgress, now: number): WordProgress {
  const next: WordProgress = {
    ...prev,
    attempts: prev.attempts + 1,
    incorrectAttempts: prev.incorrectAttempts + 1,
    consecutiveCorrect: 0,
    lastPracticedAt: now,
    reviewStep: 0,
    nextReviewAt: now,
  };
  next.masteryScore = computeMastery(next);
  return next;
}

export function applyMissed(prev: WordProgress, now: number): WordProgress {
  const next: WordProgress = {
    ...prev,
    attempts: prev.attempts + 1,
    missedBalloons: prev.missedBalloons + 1,
    consecutiveCorrect: 0,
    lastPracticedAt: now,
    reviewStep: 0,
    nextReviewAt: now,
  };
  next.masteryScore = computeMastery(next);
  return next;
}
