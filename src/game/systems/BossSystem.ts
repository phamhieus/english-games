import type { Rng } from '@/types';
import type { BossDef } from '@/game/config/bosses';

/** A boss word nobody types for this long is swapped for another (no penalty). */
export const WORD_SWAP_MS = 15_000;
/** Typing a word that is on the boss *and* on a bullet ("double") hits this hard. */
export const DOUBLE_DAMAGE = 2;
/** Points for a double, on top of the normal points for the word. */
export const DOUBLE_BONUS = 30;

/**
 * Phaser-independent boss state: health, rage and when to fire. The scene asks `tick()`
 * each frame how many bullets to fire; words, scoring and learning stay in GameSession.
 */
export class BossBattle {
  readonly def: BossDef;
  private health: number;
  private sinceFire: number;
  private sinceHit = 0;

  constructor(def: BossDef, opts: { firstShotMs?: number } = {}) {
    this.def = def;
    this.health = def.hp;
    // The first volley comes a little sooner than the regular rhythm.
    this.sinceFire = def.fireEveryMs - (opts.firstShotMs ?? 2000);
  }

  get hp(): number {
    return this.health;
  }

  get maxHp(): number {
    return this.def.hp;
  }

  /** Below half health the boss fires faster and in bigger volleys. */
  get enraged(): boolean {
    return this.health > 0 && this.health <= this.def.hp / 2;
  }

  get defeated(): boolean {
    return this.health <= 0;
  }

  /** Time a bullet takes to reach the player right now. */
  get bulletMs(): number {
    return Math.round(this.enraged ? this.def.bulletMs * 0.85 : this.def.bulletMs);
  }

  get fireEveryMs(): number {
    return Math.round(this.enraged ? this.def.fireEveryMs * 0.8 : this.def.fireEveryMs);
  }

  /**
   * Advances the clocks. Returns how many bullets to fire now (0 = not yet). When the
   * screen is full the volley waits until there is room instead of being skipped.
   */
  tick(deltaMs: number, bulletsOnScreen: number): number {
    if (this.defeated) return 0;
    this.sinceFire += deltaMs;
    this.sinceHit += deltaMs;
    if (this.sinceFire < this.fireEveryMs) return 0;
    const room = this.def.maxBullets - bulletsOnScreen;
    if (room <= 0) return 0;
    this.sinceFire = 0;
    return Math.min(room, this.enraged ? this.def.enragedVolley : this.def.volley);
  }

  /** Applies damage and returns how much was dealt. */
  hit(damage = 1): number {
    const dealt = Math.max(0, Math.min(this.health, damage));
    this.health -= dealt;
    this.sinceHit = 0;
    return dealt;
  }

  /** The boss word has been ignored for a while: time to show another one. */
  shouldSwapWord(): boolean {
    return !this.defeated && this.sinceHit >= WORD_SWAP_MS;
  }

  wordSwapped(): void {
    this.sinceHit = 0;
  }

  /** Whether the next bullet should carry the boss's own word. */
  rollDouble(rng: Rng): boolean {
    return rng.next() < this.def.doubleChance;
  }
}
