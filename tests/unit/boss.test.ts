import { describe, expect, it } from 'vitest';
import { BOSSES, adventureBoss, bossById, bossSvg } from '@/game/config/bosses';
import { BossBattle, WORD_SWAP_MS } from '@/game/systems/BossSystem';
import { GameSession } from '@/game/systems/SessionSystem';
import { createRng } from '@/utils/random';
import { makeConfig, makeWords } from './fixtures';

describe('boss battle rules', () => {
  it('fires on its rhythm, waits for room, and never exceeds the screen limit', () => {
    const def = { ...bossById('cloud'), fireEveryMs: 1000, maxBullets: 2, volley: 1 };
    const b = new BossBattle(def, { firstShotMs: 1000 });
    expect(b.tick(999, 0)).toBe(0);
    expect(b.tick(1, 0)).toBe(1);
    expect(b.tick(1000, 2)).toBe(0); // screen full: wait
    expect(b.tick(16, 1)).toBe(1); // room again: fires right away
  });

  it('gets angry below half health: faster, bigger volleys, faster bullets', () => {
    const def = { ...bossById('dragon'), hp: 10, fireEveryMs: 1000, volley: 2, enragedVolley: 3, maxBullets: 9 };
    const b = new BossBattle(def, { firstShotMs: 1000 });
    expect(b.tick(1000, 0)).toBe(2);
    const calmBullet = b.bulletMs;
    b.hit(5);
    expect(b.enraged).toBe(true);
    expect(b.fireEveryMs).toBe(800);
    expect(b.bulletMs).toBeLessThan(calmBullet);
    expect(b.tick(800, 0)).toBe(3);
  });

  it('takes damage until defeated, then stops firing', () => {
    const b = new BossBattle({ ...bossById('cloud'), hp: 3 });
    expect(b.hit(2)).toBe(2);
    expect(b.hit(5)).toBe(1);
    expect(b.defeated).toBe(true);
    expect(b.enraged).toBe(false);
    expect(b.tick(100_000, 0)).toBe(0);
  });

  it('swaps an ignored boss word after a while', () => {
    const b = new BossBattle(bossById('cloud'));
    b.tick(WORD_SWAP_MS - 1, 9);
    expect(b.shouldSwapWord()).toBe(false);
    b.tick(1, 9);
    expect(b.shouldSwapWord()).toBe(true);
    b.wordSwapped();
    expect(b.shouldSwapWord()).toBe(false);
  });

  it('adventures meet the bosses in order, once the level allows, and all of them draw', () => {
    expect(adventureBoss(1, []).id).toBe('cloud');
    // Next boss needs level 3: rematch the strongest one the level allows until then.
    expect(adventureBoss(2, ['cloud']).id).toBe('cloud');
    expect(adventureBoss(3, ['cloud']).id).toBe('crab');
    // A high level does not skip a boss that was never beaten.
    expect(adventureBoss(20, ['cloud']).id).toBe('crab');
    expect(adventureBoss(20, BOSSES.map((b) => b.id)).id).toBe('robot');
    for (const def of BOSSES) {
      for (const angry of [false, true]) expect(bossSvg(def.id, angry)).not.toMatch(/undefined|NaN/);
    }
  });

  it('a won boss battle is a completed session with the boss bonus', () => {
    const session = new GameSession({
      config: makeConfig({ style: 'endless', boss: 'cloud' }),
      words: makeWords(5),
      progress: new Map(),
      rng: createRng(1),
    });
    session.answerCorrect('w0', 900, false);
    const before = session.scoring.snapshot.score;
    session.win(150);
    expect(session.runState).toBe('completed');
    expect(session.scoring.snapshot.score).toBe(before + 150);
    expect(session.toRecord('r').boss).toBe('cloud');
  });
});
