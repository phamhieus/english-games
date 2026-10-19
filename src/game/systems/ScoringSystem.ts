import { SCORING } from '@/game/config/gameConfig';

export interface ScoreState {
  score: number;
  lives: number;
  combo: number;
  bestCombo: number;
  correct: number;
  incorrect: number;
  missed: number;
}

export interface ScoreDelta {
  points: number;
  base: number;
  speedBonus: number;
  comboBonus: number;
  multiplier: number;
}

export type ScoringRules = typeof SCORING;

export function comboMultiplier(combo: number, rules: ScoringRules = SCORING): number {
  let m = 1;
  for (const tier of rules.comboMultipliers) if (combo >= tier.minCombo) m = tier.multiplier;
  return m;
}

/** Pure scoring engine. Every method returns the applied delta; score never drops below 0. */
export class ScoringSystem {
  private state: ScoreState;
  private lastWrong: { text: string; at: number } | null = null;

  constructor(private readonly rules: ScoringRules = SCORING) {
    this.state = {
      score: 0,
      lives: rules.startingLives,
      combo: 0,
      bestCombo: 0,
      correct: 0,
      incorrect: 0,
      missed: 0,
    };
  }

  get snapshot(): Readonly<ScoreState> {
    return { ...this.state };
  }

  get isDead(): boolean {
    return this.state.lives <= 0;
  }

  get accuracy(): number {
    const { correct, incorrect, missed } = this.state;
    const total = correct + incorrect + missed;
    return total === 0 ? 1 : correct / total;
  }

  correct(responseMs: number): ScoreDelta {
    const s = this.state;
    s.combo += 1;
    s.bestCombo = Math.max(s.bestCombo, s.combo);
    s.correct += 1;
    const base = this.rules.correct;
    const speedBonus = responseMs <= this.rules.speedBonusWindowMs ? this.rules.speedBonus : 0;
    const multiplier = comboMultiplier(s.combo, this.rules);
    const comboBonus = s.combo % this.rules.comboBonusEvery === 0 ? this.rules.comboBonus : 0;
    const points = Math.round((base + speedBonus) * multiplier) + comboBonus;
    s.score += points;
    this.lastWrong = null;
    return { points, base, speedBonus, comboBonus, multiplier };
  }

  /**
   * Wrong submission. Re-submitting the exact same wrong text in quick succession
   * (key mashing) is only penalised once; returns `penalised: false` in that case.
   */
  incorrect(normalizedText: string, now: number): { points: number; penalised: boolean } {
    const s = this.state;
    const repeat =
      this.lastWrong !== null &&
      this.lastWrong.text === normalizedText &&
      now - this.lastWrong.at < this.rules.repeatWrongGraceMs;
    this.lastWrong = { text: normalizedText, at: now };
    s.combo = 0;
    if (repeat) return { points: 0, penalised: false };
    s.incorrect += 1;
    const before = s.score;
    s.score = Math.max(0, s.score + this.rules.incorrect);
    return { points: s.score - before, penalised: true };
  }

  missed(): { points: number; livesLeft: number } {
    const s = this.state;
    s.missed += 1;
    s.combo = 0;
    s.lives = Math.max(0, s.lives - 1);
    const before = s.score;
    s.score = Math.max(0, s.score + this.rules.missed);
    return { points: s.score - before, livesLeft: s.lives };
  }
}
