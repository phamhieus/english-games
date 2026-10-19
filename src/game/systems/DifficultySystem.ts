import type { Difficulty } from '@/types';
import { DIFFICULTIES, GAMEPLAY, type DifficultyProfile } from '@/game/config/gameConfig';

export interface PerformanceSample {
  correct: boolean;
  responseMs?: number;
  missed?: boolean;
}

export interface DifficultyParams {
  /** 0..1 */
  intensity: number;
  fallMsFor(textLength: number): number;
  spawnIntervalMs: number;
  maxBalloons: number;
}

/**
 * Adaptive difficulty. Intensity (0..1) blends:
 *  - elapsed active play time (slow ramp over `GAMEPLAY.rampSeconds`)
 *  - recent performance: accuracy, response speed, misses and current combo
 * Struggling players get an easier stream; strong players a faster one. The
 * profile caps (speed boost, spawn reduction, max balloons) are never exceeded.
 */
export class DifficultySystem {
  private readonly profile: DifficultyProfile;
  private readonly recent: PerformanceSample[] = [];
  private elapsedMs = 0;
  private combo = 0;

  constructor(difficulty: Difficulty, private readonly windowSize = 10) {
    this.profile = DIFFICULTIES[difficulty];
  }

  tick(deltaMs: number): void {
    this.elapsedMs += deltaMs;
  }

  record(sample: PerformanceSample, combo: number): void {
    this.recent.push(sample);
    if (this.recent.length > this.windowSize) this.recent.shift();
    this.combo = combo;
  }

  /** -1 (struggling) .. +1 (excellent) */
  performance(): number {
    if (this.recent.length < 3) return 0;
    const n = this.recent.length;
    const correct = this.recent.filter((s) => s.correct).length;
    const misses = this.recent.filter((s) => s.missed).length;
    const times = this.recent.filter((s) => s.correct && s.responseMs !== undefined).map((s) => s.responseMs ?? 0);
    const avgMs = times.length ? times.reduce((a, b) => a + b, 0) / times.length : 6000;
    const accuracyScore = (correct / n) * 2 - 1; // -1..1
    const speedScore = Math.max(-1, Math.min(1, (5000 - avgMs) / 3000));
    const missPenalty = Math.min(1, misses / 3);
    const comboScore = Math.min(1, this.combo / 10);
    const perf = accuracyScore * 0.45 + speedScore * 0.25 + comboScore * 0.2 - missPenalty * 0.5;
    return Math.max(-1, Math.min(1, perf));
  }

  params(): DifficultyParams {
    const time = Math.min(1, this.elapsedMs / (GAMEPLAY.rampSeconds * 1000));
    const perf = this.performance();
    const intensity = Math.max(0, Math.min(1, time * 0.5 + perf * 0.5 + (perf < 0 ? perf * 0.3 : 0)));
    const p = this.profile;
    const speedFactor = 1 + intensity * p.maxSpeedBoost;
    const spawnIntervalMs = Math.round(p.spawnIntervalMs * (1 - intensity * p.maxSpawnReduction));
    // While the player is clearly struggling, allow one fewer balloon (never below 1).
    const maxBalloons = perf < -0.4 ? Math.max(1, p.maxBalloons - 1) : p.maxBalloons;
    return {
      intensity,
      spawnIntervalMs,
      maxBalloons,
      fallMsFor: (len: number) =>
        Math.round(((p.fallSeconds + Math.max(0, len - 6) * p.fallSecondsPerChar) * 1000) / speedFactor),
    };
  }
}
