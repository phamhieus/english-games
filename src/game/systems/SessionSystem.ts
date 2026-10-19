import type {
  GameMode,
  Rng,
  SessionConfig,
  SessionMistake,
  SessionRecord,
  SessionStatus,
  VocabularyItem,
  WordProgress,
} from '@/types';
import { GAMEPLAY } from '@/game/config/gameConfig';
import { mistakePool, mistakeWeight, pickNext, selectTargets } from '@/features/learning/selection';
import {
  applyCorrect,
  applyIncorrect,
  applyMissed,
  createProgress,
} from '@/features/learning/spacedRepetition';
import { normalizeAnswer } from '@/utils/text';
import { ScoringSystem, type ScoreDelta } from './ScoringSystem';
import { DifficultySystem } from './DifficultySystem';

export type RunState = 'running' | 'completed' | 'game_over' | 'quit';

interface TargetState {
  word: VocabularyItem;
  appearances: number;
  resolved: boolean;
  correct: boolean;
}

interface WordTally {
  incorrect: number;
  missed: number;
}

export interface SessionOptions {
  config: SessionConfig;
  words: readonly VocabularyItem[];
  progress: ReadonlyMap<string, WordProgress>;
  rng: Rng;
  now?: () => number;
  /** Called whenever a word's long-term progress changes (for persistence). */
  onProgress?: (p: WordProgress) => void;
}

export function promptFor(mode: GameMode, word: VocabularyItem): string {
  return mode === 'copy' ? word.english : word.vietnamese;
}

/** Words eligible for a session, before target selection. */
export function sessionPool(
  config: SessionConfig,
  words: readonly VocabularyItem[],
  progress: ReadonlyMap<string, WordProgress>,
): VocabularyItem[] {
  if (config.wordIds?.length) {
    const ids = new Set(config.wordIds);
    return words.filter((w) => ids.has(w.id));
  }
  if (config.mode === 'mistakes') return mistakePool(words, progress);
  return [...words];
}

/**
 * Pure, Phaser-independent session controller: decides which word comes next,
 * applies scoring/learning updates and determines when the session ends.
 *
 * Practice sessions pick N target words up-front. A target is *resolved* when it is
 * answered correctly on an appearance without mistakes, or after
 * `GAMEPLAY.maxAppearancesPerWord` appearances. Mistakes (wrong attempt or a missed
 * balloon) put the word into an in-session replay queue — this is separate from the
 * long-term spaced-repetition schedule. The session completes when every target is
 * resolved, so it can never loop forever.
 */
export class GameSession {
  readonly config: SessionConfig;
  readonly scoring = new ScoringSystem();
  readonly difficulty: DifficultySystem;
  readonly startedAt: number;

  private state: RunState = 'running';
  private readonly words: VocabularyItem[];
  private readonly wordById = new Map<string, VocabularyItem>();
  private readonly progress: Map<string, WordProgress>;
  private readonly rng: Rng;
  private readonly now: () => number;
  private readonly onProgress?: (p: WordProgress) => void;

  private readonly targets = new Map<string, TargetState>();
  private readonly pending: string[] = [];
  private replay: { id: string; afterSpawn: number }[] = [];
  private readonly recent: string[] = [];
  private readonly boost = new Map<string, number>();
  private readonly tally = new Map<string, WordTally>();
  private spawnCount = 0;
  private activeMs = 0;
  private correctChars = 0;
  private correctResponseMs = 0;

  constructor(opts: SessionOptions) {
    this.config = opts.config;
    this.rng = opts.rng;
    this.now = opts.now ?? Date.now;
    this.onProgress = opts.onProgress;
    this.startedAt = this.now();
    this.progress = new Map(opts.progress);
    this.difficulty = new DifficultySystem(opts.config.difficulty);
    this.words = sessionPool(opts.config, opts.words, this.progress);
    for (const w of this.words) this.wordById.set(w.id, w);

    if (this.config.style === 'practice') {
      const size = this.config.practiceSize === 'all' ? this.words.length : this.config.practiceSize;
      const weightFn = this.config.mode === 'mistakes' ? mistakeWeight : undefined;
      const picked = selectTargets(this.words, this.progress, size, this.rng, this.startedAt, weightFn);
      for (const w of picked) {
        this.targets.set(w.id, { word: w, appearances: 0, resolved: false, correct: false });
        this.pending.push(w.id);
      }
    }
    if (this.words.length === 0) this.state = 'completed';
  }

  get runState(): RunState {
    return this.state;
  }

  /** Words picked for a practice session (empty for endless sessions). */
  get targetIds(): string[] {
    return [...this.targets.keys()];
  }

  get isRunning(): boolean {
    return this.state === 'running';
  }

  get poolSize(): number {
    return this.words.length;
  }

  get activePlayMs(): number {
    return this.activeMs;
  }

  /** Practice progress; null for endless sessions. */
  get completion(): { done: number; total: number } | null {
    if (this.config.style !== 'practice') return null;
    let done = 0;
    for (const t of this.targets.values()) if (t.resolved) done++;
    return { done, total: this.targets.size };
  }

  word(id: string): VocabularyItem | undefined {
    return this.wordById.get(id);
  }

  prompt(word: VocabularyItem): string {
    return promptFor(this.config.mode, word);
  }

  tick(deltaMs: number): void {
    if (!this.isRunning) return;
    this.activeMs += deltaMs;
    this.difficulty.tick(deltaMs);
  }

  /** Next word to spawn, or null if nothing should spawn right now. */
  nextWord(activeIds: readonly string[]): VocabularyItem | null {
    if (!this.isRunning) return null;
    const active = new Set(activeIds);
    let word: VocabularyItem | null = null;

    if (this.config.style === 'practice') {
      word = this.nextPracticeWord(active);
    } else {
      const weightFn = this.config.mode === 'mistakes' ? mistakeWeight : undefined;
      word = pickNext(this.words, this.progress, this.rng, this.now(), {
        exclude: active,
        recent: this.recent,
        boost: this.boost,
        weightFn: weightFn ? (p) => Math.max(0.3, weightFn(p)) : undefined,
      });
    }
    if (word) this.noteSpawn(word.id);
    return word;
  }

  private nextPracticeWord(active: ReadonlySet<string>): VocabularyItem | null {
    const readyIdx = this.replay.findIndex((r) => r.afterSpawn <= this.spawnCount && !active.has(r.id));
    if (readyIdx >= 0) {
      const [r] = this.replay.splice(readyIdx, 1);
      return r ? (this.wordById.get(r.id) ?? null) : null;
    }
    const pIdx = this.pending.findIndex((id) => !active.has(id));
    if (pIdx >= 0) {
      const [id] = this.pending.splice(pIdx, 1);
      return id ? (this.wordById.get(id) ?? null) : null;
    }
    // Only replays remain: don't stall an empty screen waiting for the gap.
    if (active.size === 0) {
      const idx = this.replay.findIndex((r) => !active.has(r.id));
      if (idx >= 0) {
        const [r] = this.replay.splice(idx, 1);
        return r ? (this.wordById.get(r.id) ?? null) : null;
      }
    }
    return null;
  }

  private noteSpawn(id: string): void {
    this.spawnCount++;
    this.recent.push(id);
    if (this.recent.length > GAMEPLAY.recentWindow) this.recent.shift();
    const t = this.targets.get(id);
    if (t) t.appearances++;
  }

  private updateProgress(id: string, fn: (p: WordProgress) => WordProgress): void {
    const next = fn(this.progress.get(id) ?? createProgress(id));
    this.progress.set(id, next);
    this.onProgress?.(next);
  }

  private tallyFor(id: string): WordTally {
    let t = this.tally.get(id);
    if (!t) {
      t = { incorrect: 0, missed: 0 };
      this.tally.set(id, t);
    }
    return t;
  }

  private requeueOrResolve(id: string, wasCorrect: boolean): void {
    const t = this.targets.get(id);
    if (!t) return;
    if (t.appearances < GAMEPLAY.maxAppearancesPerWord) {
      this.replay.push({ id, afterSpawn: this.spawnCount + GAMEPLAY.replayGapSpawns });
    } else {
      t.resolved = true;
      t.correct = wasCorrect;
    }
  }

  /**
   * A balloon was destroyed. `hadMistake` = a wrong answer was attributed to this
   * balloon before it was hit (in practice sessions it then comes back once more).
   */
  answerCorrect(id: string, responseMs: number, hadMistake: boolean): ScoreDelta | null {
    if (!this.isRunning) return null;
    const word = this.wordById.get(id);
    const delta = this.scoring.correct(responseMs);
    this.difficulty.record({ correct: true, responseMs }, this.scoring.snapshot.combo);
    this.correctChars += word?.english.length ?? 0;
    this.correctResponseMs += responseMs;
    const now = this.now();
    this.updateProgress(id, (p) => applyCorrect(p, responseMs, now));
    const b = this.boost.get(id);
    if (b) this.boost.set(id, Math.max(1, b / 2));

    const t = this.targets.get(id);
    if (t) {
      if (hadMistake) this.requeueOrResolve(id, true);
      else {
        t.resolved = true;
        t.correct = true;
      }
    }
    this.checkEnd();
    return delta;
  }

  /** Wrong submission; `id` is the balloon it was attributed to (if any). */
  answerIncorrect(typed: string, id: string | null): { points: number; penalised: boolean } | null {
    if (!this.isRunning) return null;
    const res = this.scoring.incorrect(normalizeAnswer(typed), this.now());
    if (!res.penalised) return res;
    this.difficulty.record({ correct: false }, 0);
    if (id) {
      this.tallyFor(id).incorrect++;
      const now = this.now();
      this.updateProgress(id, (p) => applyIncorrect(p, now));
      this.boost.set(id, Math.min(6, (this.boost.get(id) ?? 1) * 2));
    }
    return res;
  }

  /** A balloon reached the danger zone. */
  balloonMissed(id: string): { points: number; livesLeft: number } | null {
    if (!this.isRunning) return null;
    const res = this.scoring.missed();
    this.difficulty.record({ correct: false, missed: true }, 0);
    this.tallyFor(id).missed++;
    const now = this.now();
    this.updateProgress(id, (p) => applyMissed(p, now));
    this.boost.set(id, Math.min(6, (this.boost.get(id) ?? 1) * 3));
    this.requeueOrResolve(id, false);
    this.checkEnd();
    return res;
  }

  private checkEnd(): void {
    if (this.scoring.isDead) {
      this.state = 'game_over';
      return;
    }
    const c = this.completion;
    if (c && c.done >= c.total) this.state = 'completed';
  }

  quit(): void {
    if (this.isRunning) this.state = 'quit';
  }

  /** Boss battles end by winning, not by finishing a word list. */
  win(bonusPoints = 0): void {
    if (!this.isRunning) return;
    this.scoring.bonus(bonusPoints);
    this.state = 'completed';
  }

  mistakes(): SessionMistake[] {
    const out: SessionMistake[] = [];
    for (const [id, t] of this.tally) {
      const w = this.wordById.get(id);
      if (!w || t.incorrect + t.missed === 0) continue;
      out.push({
        vocabularyId: id,
        english: w.english,
        vietnamese: w.vietnamese,
        example: w.example,
        incorrect: t.incorrect,
        missed: t.missed,
      });
    }
    return out.sort((a, b) => b.incorrect + b.missed - (a.incorrect + a.missed));
  }

  toRecord(id: string, status?: SessionStatus): SessionRecord {
    const s = this.scoring.snapshot;
    const finalStatus: SessionStatus = status ?? (this.state === 'running' ? 'in_progress' : this.state);
    return {
      id,
      collectionId: this.config.collectionId,
      collectionName: this.config.collectionName,
      mode: this.config.mode,
      difficulty: this.config.difficulty,
      style: this.config.style,
      status: finalStatus,
      startedAt: this.startedAt,
      endedAt: this.now(),
      durationMs: Math.round(this.activeMs),
      score: s.score,
      correct: s.correct,
      incorrect: s.incorrect,
      missed: s.missed,
      accuracy: this.scoring.accuracy,
      averageResponseTimeMs: s.correct ? Math.round(this.correctResponseMs / s.correct) : 0,
      bestCombo: s.bestCombo,
      correctChars: this.correctChars,
      correctResponseMs: Math.round(this.correctResponseMs),
      mistakes: this.mistakes(),
      ...(this.config.boss ? { boss: this.config.boss } : {}),
    };
  }
}
