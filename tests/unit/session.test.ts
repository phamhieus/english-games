import { describe, expect, it } from 'vitest';
import { GameSession } from '@/game/systems/SessionSystem';
import { attributeWrongAnswer, findExactTarget, findPrefixTarget, matchedPrefixLength } from '@/game/systems/TargetingSystem';
import { DifficultySystem } from '@/game/systems/DifficultySystem';
import { findSpawnX } from '@/game/systems/SpawnSystem';
import { GAMEPLAY } from '@/game/config/gameConfig';
import { createRng } from '@/utils/random';
import type { WordProgress } from '@/types';
import { makeConfig, makeWords } from './fixtures';

function session(n: number, patch = {}, progress = new Map<string, WordProgress>()) {
  const saved: WordProgress[] = [];
  const s = new GameSession({
    config: makeConfig(patch),
    words: makeWords(n),
    progress,
    rng: createRng(1),
    now: () => 1_000_000,
    onProgress: (p) => saved.push(p),
  });
  return { s, saved };
}

describe('GameSession – practice completion', () => {
  it('completes once every target is answered correctly', () => {
    const { s, saved } = session(5, { practiceSize: 3 });
    expect(s.completion).toEqual({ done: 0, total: 3 });
    for (let i = 0; i < 3; i++) {
      const w = s.nextWord([]);
      expect(w).not.toBeNull();
      s.answerCorrect(w!.id, 1500, false);
    }
    expect(s.completion).toEqual({ done: 3, total: 3 });
    expect(s.runState).toBe('completed');
    expect(s.nextWord([])).toBeNull();
    expect(saved).toHaveLength(3);
  });

  it('"all" uses the whole collection and never repeats a clean word', () => {
    const { s } = session(4, { practiceSize: 'all' });
    const seen: string[] = [];
    let w;
    while ((w = s.nextWord([]))) {
      seen.push(w.id);
      s.answerCorrect(w.id, 1000, false);
    }
    expect(seen.sort()).toEqual(['w0', 'w1', 'w2', 'w3']);
    expect(s.runState).toBe('completed');
  });

  it('replays missed words in-session but stops after the max appearances', () => {
    const { s } = session(1, { practiceSize: 'all' });
    let shown = 0;
    let w;
    // Never answer: the word should appear exactly maxAppearancesPerWord times... but lives may run out first.
    while ((w = s.nextWord([])) && s.isRunning) {
      shown++;
      s.balloonMissed(w.id);
    }
    expect(shown).toBe(Math.min(GAMEPLAY.maxAppearancesPerWord, 3));
    expect(s.isRunning).toBe(false);
  });

  it('brings back a word answered after a mistake, then resolves it', () => {
    const { s } = session(3, { practiceSize: 'all' });
    const first = s.nextWord([])!;
    s.answerIncorrect('zzzz', first.id);
    s.answerCorrect(first.id, 2000, true);
    expect(s.completion?.done).toBe(0);
    const order: string[] = [];
    let w;
    while ((w = s.nextWord([]))) {
      order.push(w.id);
      s.answerCorrect(w.id, 1000, false);
    }
    expect(order).toContain(first.id);
    expect(s.runState).toBe('completed');
  });

  it('does not hand out a word that is already on screen', () => {
    const { s } = session(2, { practiceSize: 'all' });
    const a = s.nextWord([])!;
    const b = s.nextWord([a.id])!;
    expect(b.id).not.toBe(a.id);
    expect(s.nextWord([a.id, b.id])).toBeNull();
  });
});

describe('GameSession – state transitions', () => {
  it('goes running → game_over when lives run out (endless)', () => {
    const { s } = session(5, { style: 'endless' });
    expect(s.runState).toBe('running');
    for (let i = 0; i < 3; i++) s.balloonMissed(s.nextWord([])!.id);
    expect(s.runState).toBe('game_over');
    expect(s.answerCorrect('w0', 100, false)).toBeNull();
  });

  it('goes running → quit and records a result', () => {
    const { s } = session(5, { style: 'endless' });
    const w = s.nextWord([])!;
    s.answerCorrect(w.id, 1200, false);
    s.quit();
    expect(s.runState).toBe('quit');
    const r = s.toRecord('r1');
    expect(r.status).toBe('quit');
    expect(r.correct).toBe(1);
    expect(r.correctChars).toBe(w.english.length);
  });

  it('is immediately completed when the pool is empty (mistake mode, no mistakes)', () => {
    const { s } = session(5, { mode: 'mistakes' });
    expect(s.poolSize).toBe(0);
    expect(s.runState).toBe('completed');
  });

  it('collects session mistakes with meanings', () => {
    const { s } = session(3, { style: 'endless' });
    const w = s.nextWord([])!;
    s.answerIncorrect('nope', w.id);
    s.balloonMissed(w.id);
    const m = s.mistakes();
    expect(m).toHaveLength(1);
    expect(m[0]).toMatchObject({ vocabularyId: w.id, incorrect: 1, missed: 1, vietnamese: w.vietnamese });
  });

  it('shows Vietnamese prompts in recall mode and English in copy mode', () => {
    const recall = session(1).s;
    const copy = session(1, { mode: 'copy' }).s;
    const w = makeWords(1)[0]!;
    expect(recall.prompt(w)).toBe(w.vietnamese);
    expect(copy.prompt(w)).toBe(w.english);
  });
});

describe('targeting', () => {
  const balloons = [
    { id: 1, answer: 'apple', progress: 0.2, claimed: false },
    { id: 2, answer: 'Apple', progress: 0.7, claimed: false },
    { id: 3, answer: 'achieve', progress: 0.9, claimed: false },
  ];

  it('prioritises the duplicate closest to the danger zone', () => {
    expect(findExactTarget(' APPLE ', balloons)?.id).toBe(2);
  });

  it('never targets an already-claimed balloon (no double points)', () => {
    const claimed = balloons.map((b) => (b.id === 2 ? { ...b, claimed: true } : b));
    expect(findExactTarget('apple', claimed)?.id).toBe(1);
    expect(findExactTarget('apple', claimed.map((b) => ({ ...b, claimed: true })))).toBeNull();
  });

  it('finds prefix targets for copy mode highlighting', () => {
    expect(findPrefixTarget('a', balloons)?.id).toBe(3);
    expect(findPrefixTarget('ap', balloons)?.id).toBe(2);
    expect(matchedPrefixLength('App', 'apple')).toBe(3);
    expect(matchedPrefixLength('apx', 'apple')).toBe(0);
    // Apostrophes are skipped: "oc" covers "o'c".
    expect(matchedPrefixLength('oc', "o'clock")).toBe(3);
    expect(matchedPrefixLength("o'c", 'o’clock')).toBe(3);
    expect(findExactTarget('oclock', [{ id: 9, answer: "o'clock", progress: 0, claimed: false }])?.id).toBe(9);
  });

  it('attributes a wrong answer to the most similar balloon only when close', () => {
    expect(attributeWrongAnswer('acheive', balloons)?.id).toBe(3);
    expect(attributeWrongAnswer('zebra', balloons)).toBeNull();
  });
});

describe('difficulty & spawning', () => {
  it('never exceeds the profile balloon cap and eases off when struggling', () => {
    const d = new DifficultySystem('hard');
    expect(d.params().maxBalloons).toBe(6);
    for (let i = 0; i < 6; i++) d.record({ correct: false, missed: true }, 0);
    expect(d.params().maxBalloons).toBe(5);
    expect(d.params().intensity).toBe(0);
  });

  it('speeds up for strong, fast players over time, within limits', () => {
    const d = new DifficultySystem('normal');
    const base = d.params();
    d.tick(10 * 60_000);
    for (let i = 0; i < 10; i++) d.record({ correct: true, responseMs: 1500 }, i + 1);
    const p = d.params();
    expect(p.intensity).toBeGreaterThan(0.8);
    expect(p.spawnIntervalMs).toBeLessThan(base.spawnIntervalMs);
    expect(p.fallMsFor(5)).toBeLessThan(base.fallMsFor(5));
    expect(p.fallMsFor(5)).toBeGreaterThanOrEqual(Math.round(base.fallMsFor(5) / 1.35) - 1);
  });

  it('gives long phrases more time to fall', () => {
    const p = new DifficultySystem('easy').params();
    expect(p.fallMsFor(20)).toBeGreaterThan(p.fallMsFor(5));
  });

  it('places balloons without overlapping, or reports no space', () => {
    const rng = createRng(3);
    const x = findSpawnX(400, 100, [{ x: 100, y: 0, width: 100, height: 70 }], rng);
    expect(x).not.toBeNull();
    expect(Math.abs((x ?? 0) - 100)).toBeGreaterThanOrEqual(100);
    const full = [
      { x: 70, y: 0, width: 120, height: 70 },
      { x: 200, y: 0, width: 120, height: 70 },
      { x: 330, y: 0, width: 120, height: 70 },
    ];
    expect(findSpawnX(400, 100, full, rng)).toBeNull();
  });
});
