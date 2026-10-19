import type { BossId, StageId } from '@/types';

/**
 * Boss battles: the boss carries a word (type it to attack) and fires word bullets at the
 * player (type them to defend). Bosses unlock one after another.
 */
export interface BossDef {
  id: BossId;
  name: string;
  tagline: string;
  /** Arena backdrop (one of the regular stages). */
  stage: StageId;
  /** Hits needed to defeat it. */
  hp: number;
  /** Time between volleys. */
  fireEveryMs: number;
  /** How long a bullet takes to reach the player. */
  bulletMs: number;
  /** Bullets per volley, normally / when enraged (below half HP). */
  volley: number;
  enragedVolley: number;
  /** Most bullets on screen at once. */
  maxBullets: number;
  /** Chance that a bullet carries the boss's own word (a "double"). */
  doubleChance: number;
  /** Bonus points for winning. */
  reward: number;
  /** Bullet colours (fill, glow). */
  bullet: { fill: number; glow: number };
  /** Short description of how it fights, for the picker. */
  attack: string;
  /** Player level needed to meet it at the end of an adventure. */
  minLevel: number;
}

export const BOSSES: readonly BossDef[] = [
  {
    id: 'cloud',
    minLevel: 1,
    name: 'Grumpy Cloud',
    tagline: 'Rains words on sunny days.',
    stage: 'meadow',
    hp: 6,
    fireEveryMs: 3400,
    bulletMs: 8000,
    volley: 1,
    enragedVolley: 1,
    maxBullets: 3,
    doubleChance: 0.3,
    reward: 150,
    bullet: { fill: 0x7cc4f5, glow: 0xd2ecff },
    attack: 'Slow raindrops, one at a time.',
  },
  {
    id: 'crab',
    minLevel: 3,
    name: 'Bubble Crab',
    tagline: 'Snaps, then blows bubbles.',
    stage: 'ocean',
    hp: 8,
    fireEveryMs: 3000,
    bulletMs: 7400,
    volley: 1,
    enragedVolley: 2,
    maxBullets: 4,
    doubleChance: 0.28,
    reward: 220,
    bullet: { fill: 0x9fe3ff, glow: 0xeafaff },
    attack: 'Bubbles; two at a time when angry.',
  },
  {
    id: 'ghost',
    minLevel: 5,
    name: 'Phantom',
    tagline: 'Whispers words in the dark.',
    stage: 'night',
    hp: 10,
    fireEveryMs: 2800,
    bulletMs: 6800,
    volley: 2,
    enragedVolley: 2,
    maxBullets: 5,
    doubleChance: 0.25,
    reward: 300,
    bullet: { fill: 0xb388ff, glow: 0xe9e0ff },
    attack: 'Twin wisps that drift towards you.',
  },
  {
    id: 'dragon',
    minLevel: 8,
    name: 'Lava Dragon',
    tagline: 'Breathes fire, and vocabulary.',
    stage: 'volcano',
    hp: 12,
    fireEveryMs: 2500,
    bulletMs: 6200,
    volley: 2,
    enragedVolley: 3,
    maxBullets: 6,
    doubleChance: 0.22,
    reward: 400,
    bullet: { fill: 0xff9f43, glow: 0xffe066 },
    attack: 'Fireballs; three at once when angry.',
  },
  {
    id: 'robot',
    minLevel: 12,
    name: 'Robo Overlord',
    tagline: 'Final boss. Loads words at light speed.',
    stage: 'space',
    hp: 15,
    fireEveryMs: 2200,
    bulletMs: 5600,
    volley: 2,
    enragedVolley: 3,
    maxBullets: 7,
    doubleChance: 0.2,
    reward: 550,
    bullet: { fill: 0xff4f6d, glow: 0xffb3c0 },
    attack: 'Fast laser bolts in bursts of three.',
  },
];

export const bossById = (id: BossId | undefined): BossDef => BOSSES.find((b) => b.id === id) ?? BOSSES[0]!;

/**
 * The boss at the end of an adventure: the next one not beaten yet, once the player's level
 * is high enough; until then a rematch with the strongest boss the level allows.
 */
export function adventureBoss(level: number, defeated: readonly BossId[]): BossDef {
  const next = BOSSES.find((b) => !defeated.includes(b.id));
  if (next && next.minLevel <= level) return next;
  const allowed = BOSSES.filter((b) => b.minLevel <= level);
  return allowed[allowed.length - 1] ?? BOSSES[0]!;
}

// Artwork lives in bossArt.ts.
export { BOSS_BOX, bossSvg } from './bossArt';
