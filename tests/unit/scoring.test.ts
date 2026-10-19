import { describe, expect, it } from 'vitest';
import { comboMultiplier, ScoringSystem } from '@/game/systems/ScoringSystem';
import { SCORING } from '@/game/config/gameConfig';

describe('ScoringSystem', () => {
  it('awards base points, with a speed bonus within 3 seconds', () => {
    const s = new ScoringSystem();
    expect(s.correct(5000).points).toBe(10);
    expect(s.correct(2000).points).toBe(15);
    expect(s.snapshot.score).toBe(25);
  });

  it('adds a combo bonus every 5 consecutive correct answers', () => {
    const s = new ScoringSystem();
    const pts = Array.from({ length: 5 }, () => s.correct(9999).points);
    expect(pts).toEqual([10, 10, 10, 10, 20]);
    expect(s.snapshot.combo).toBe(5);
  });

  it('applies combo multipliers from the config', () => {
    expect(comboMultiplier(0)).toBe(1);
    expect(comboMultiplier(9)).toBe(1);
    expect(comboMultiplier(10)).toBe(1.5);
    expect(comboMultiplier(25)).toBe(2);
    const s = new ScoringSystem();
    for (let i = 0; i < 9; i++) s.correct(9999);
    // 10th hit: (10) * 1.5 + 10 combo bonus
    expect(s.correct(9999).points).toBe(25);
  });

  it('penalises wrong answers, resets the combo and never goes below zero', () => {
    const s = new ScoringSystem();
    s.correct(9999); // 10
    expect(s.incorrect('foo', 0).points).toBe(-2);
    expect(s.snapshot.combo).toBe(0);
    expect(s.snapshot.score).toBe(8);
    s.missed(); // -5 → 3
    s.missed(); // -5 → 0 (floored)
    expect(s.snapshot.score).toBe(0);
  });

  it('only penalises identical repeated wrong submissions once within the grace window', () => {
    const s = new ScoringSystem();
    s.correct(9999);
    expect(s.incorrect('abc', 1000).penalised).toBe(true);
    expect(s.incorrect('abc', 1500).penalised).toBe(false);
    expect(s.incorrect('abd', 1600).penalised).toBe(true);
    expect(s.snapshot.incorrect).toBe(2);
  });

  it('loses a life per missed balloon and dies at zero', () => {
    const s = new ScoringSystem();
    for (let i = 0; i < SCORING.startingLives; i++) s.missed();
    expect(s.snapshot.lives).toBe(0);
    expect(s.isDead).toBe(true);
    expect(s.snapshot.missed).toBe(3);
  });

  it('tracks best combo and accuracy', () => {
    const s = new ScoringSystem();
    s.correct(1);
    s.correct(1);
    s.correct(1);
    s.incorrect('x', 0);
    s.correct(1);
    expect(s.snapshot.bestCombo).toBe(3);
    expect(s.accuracy).toBeCloseTo(0.8);
  });
});
