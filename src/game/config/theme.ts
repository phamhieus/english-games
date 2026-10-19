import type { CannonSkinId } from '@/types';

/** Flat palette (bold outlines, no gloss) shared by Phaser entities. Text on balloons is dark for contrast. */
export const BALLOON_COLORS = [
  { name: 'blue', fill: 0x7cc4f5, shade: 0x3f98d6, glow: 0xd2e9ff },
  { name: 'purple', fill: 0xb7a4f7, shade: 0x7c68d8, glow: 0xebdfff },
  { name: 'orange', fill: 0xffb870, shade: 0xe8873a, glow: 0xffe6cc },
  { name: 'cyan', fill: 0x6fe0c8, shade: 0x2fae96, glow: 0xd3f8f3 },
  { name: 'pink', fill: 0xff9fb8, shade: 0xe5607f, glow: 0xffdcec },
] as const;

/** Colours of a balloon-like word target (balloons, boss bullets, the boss word plate). */
export interface BalloonColor {
  readonly name: string;
  readonly fill: number;
  readonly shade: number;
  readonly glow: number;
}

export const THEME = {
  font: '"Fredoka", "Baloo 2", "Nunito", system-ui, sans-serif',
  ink: '#1f2a44',
  inkHex: 0x1f2a44,
  typed: '#c2304f',
  danger: 0xe8506a,
  white: 0xffffff,
};

export type BodyShape = 'round' | 'square' | 'hex' | 'egg' | 'dome' | 'tulip';
export type BarrelShape = 'tube' | 'tapered' | 'flared' | 'double' | 'chunky';
export type Legs = 'feet' | 'wheels' | 'treads' | 'jets';
export type Sides = 'bolts' | 'wings' | 'none';
export type Topper = 'none' | 'cat' | 'bunny' | 'bear' | 'leaf' | 'antenna' | 'spikes' | 'fin' | 'horns' | 'crown' | 'headband' | 'halo' | 'blossom' | 'sunpetals' | 'rose' | 'lotus';
export type BarrelPattern = 'bands' | 'stripes' | 'dots' | 'stars' | 'scales' | 'flames' | 'waves' | 'rivets' | 'petals' | 'thorns';
export type ShotStyle = 'bubble' | 'heart' | 'carrot' | 'bamboo' | 'leaf' | 'egg' | 'drop' | 'sun' | 'bolt' | 'shuriken' | 'fireball' | 'gem' | 'moon' | 'feather' | 'petal' | 'seed' | 'rosebud' | 'lily' | 'pollen';
export type EyeStyle = 'round' | 'square' | 'shades' | 'sleepy' | 'star' | 'panda' | 'narrow';

/** A cannon look: shapes + colours. Drawn by `cannonArt.ts` for both the game and the previews. */
export type SkinGroup = 'Classic' | 'Animals' | 'Flowers' | 'Fantasy';

export interface CannonSkin {
  id: CannonSkinId;
  name: string;
  group: SkinGroup;
  /** Cost in reward coins; 0 = free starter skin. */
  price: number;
  /** One-line flavour text for the skin locker. */
  tagline: string;
  body: BodyShape;
  barrelShape: BarrelShape;
  legs: Legs;
  sides: Sides;
  topper: Topper;
  pattern: BarrelPattern;
  eyes: EyeStyle;
  /** What it fires. */
  shot: ShotStyle;
  /** Barrel tube. */
  barrel: number;
  /** Pattern colour on the barrel. */
  band: number;
  bodyColor: number;
  /** Face plate. */
  plate: number;
  /** Muzzle lip, legs and side bolts. */
  trim: number;
  /** Topper / decoration colour. */
  accent: number;
  cheek: number | null;
}

// prettier-ignore
export const CANNON_SKINS: readonly CannonSkin[] = [
  { id: 'classic', name: 'Classic', group: 'Classic', price: 0, tagline: 'The original bubble blaster.', body: 'round', barrelShape: 'tube', legs: 'feet', sides: 'bolts', topper: 'none', pattern: 'bands', eyes: 'round', shot: 'bubble', barrel: 0x5b54d6, band: 0x3f39a8, bodyColor: 0xd6402e, plate: 0xfff6e5, trim: 0xffc43d, accent: 0xffc43d, cheek: 0xff9fb8 },
  { id: 'berry', name: 'Kitty', group: 'Animals', price: 0, tagline: 'Purrfect aim, nine lives.', body: 'round', barrelShape: 'tube', legs: 'feet', sides: 'none', topper: 'cat', pattern: 'dots', eyes: 'round', shot: 'heart', barrel: 0xc2418f, band: 0xff9fc8, bodyColor: 0xff7fb8, plate: 0xfff0f7, trim: 0x7cc4f5, accent: 0xff7fb8, cheek: 0xff4f86 },
  { id: 'bunny', name: 'Bunny', group: 'Animals', price: 100, tagline: 'Hops from word to word.', body: 'egg', barrelShape: 'tube', legs: 'feet', sides: 'none', topper: 'bunny', pattern: 'dots', eyes: 'round', shot: 'carrot', barrel: 0xb7a4f7, band: 0xe9e0ff, bodyColor: 0xf3efff, plate: 0xffffff, trim: 0xff9fb8, accent: 0xf3efff, cheek: 0xff9fb8 },
  { id: 'panda', name: 'Panda', group: 'Animals', price: 250, tagline: 'Chews bamboo, crushes vocab.', body: 'round', barrelShape: 'tube', legs: 'feet', sides: 'none', topper: 'bear', pattern: 'bands', eyes: 'panda', shot: 'bamboo', barrel: 0x7ed957, band: 0x3f9b2e, bodyColor: 0xffffff, plate: 0xf1f1ea, trim: 0x2b2b33, accent: 0x2b2b33, cheek: 0xffb8c9 },
  { id: 'mint', name: 'Sprout', group: 'Flowers', price: 100, tagline: 'Grows a new word every day.', body: 'egg', barrelShape: 'tapered', legs: 'feet', sides: 'none', topper: 'leaf', pattern: 'dots', eyes: 'round', shot: 'leaf', barrel: 0x2fae96, band: 0xa8f0dc, bodyColor: 0x4cc9a7, plate: 0xf1fff9, trim: 0xffffff, accent: 0x7ed957, cheek: 0xffb8c9 },
  { id: 'dino', name: 'Dino', group: 'Animals', price: 250, tagline: 'Roars at tricky spellings.', body: 'egg', barrelShape: 'tapered', legs: 'feet', sides: 'none', topper: 'spikes', pattern: 'scales', eyes: 'round', shot: 'egg', barrel: 0x4caf3a, band: 0x2e7d22, bodyColor: 0x8fdc6a, plate: 0xf4ffe8, trim: 0xffc43d, accent: 0xff9f43, cheek: 0xff9fb8 },
  { id: 'shark', name: 'Shark', group: 'Animals', price: 300, tagline: 'Glides in, chomps the word.', body: 'dome', barrelShape: 'flared', legs: 'jets', sides: 'none', topper: 'fin', pattern: 'waves', eyes: 'round', shot: 'drop', barrel: 0x3f98d6, band: 0xd2ecff, bodyColor: 0x7cc4f5, plate: 0xffffff, trim: 0x2c3a6b, accent: 0x7cc4f5, cheek: 0xff9fb8 },
  { id: 'sunny', name: 'Cool Sun', group: 'Classic', price: 250, tagline: 'Too bright for regular glasses.', body: 'round', barrelShape: 'chunky', legs: 'wheels', sides: 'bolts', topper: 'none', pattern: 'stripes', eyes: 'shades', shot: 'sun', barrel: 0xff9f43, band: 0xffd28a, bodyColor: 0xffc43d, plate: 0xfffbe8, trim: 0xd6402e, accent: 0xd6402e, cheek: 0xff9fb8 },
  { id: 'robot', name: 'Robot', group: 'Classic', price: 450, tagline: 'Beep. Spelling module online.', body: 'square', barrelShape: 'double', legs: 'treads', sides: 'bolts', topper: 'antenna', pattern: 'rivets', eyes: 'square', shot: 'bolt', barrel: 0x8a96a8, band: 0x5b6577, bodyColor: 0xb7c1d1, plate: 0xeef6f8, trim: 0x4cc9a7, accent: 0x4cc9a7, cheek: null },
  { id: 'ninja', name: 'Ninja', group: 'Fantasy', price: 450, tagline: 'Silent. Swift. Never misses.', body: 'round', barrelShape: 'tapered', legs: 'feet', sides: 'none', topper: 'headband', pattern: 'stripes', eyes: 'narrow', shot: 'shuriken', barrel: 0x2b2b33, band: 0x4a4a57, bodyColor: 0x2c2f45, plate: 0xfff6e5, trim: 0xe8506a, accent: 0xe8506a, cheek: null },
  { id: 'lava', name: 'Lava', group: 'Fantasy', price: 600, tagline: 'Hot shots, hotter combos.', body: 'hex', barrelShape: 'chunky', legs: 'treads', sides: 'bolts', topper: 'horns', pattern: 'flames', eyes: 'round', shot: 'fireball', barrel: 0x3b2b33, band: 0xff9f43, bodyColor: 0xe8506a, plate: 0xffe3dc, trim: 0xffc43d, accent: 0xfff6e5, cheek: 0xffb38a },
  { id: 'royal', name: 'Royal', group: 'Fantasy', price: 900, tagline: 'Rules the alphabet.', body: 'hex', barrelShape: 'flared', legs: 'feet', sides: 'wings', topper: 'crown', pattern: 'stars', eyes: 'star', shot: 'gem', barrel: 0x7c4dff, band: 0xffc43d, bodyColor: 0xb388ff, plate: 0xfff6e5, trim: 0xffc43d, accent: 0xffc43d, cheek: 0xff9fb8 },
  { id: 'midnight', name: 'Midnight', group: 'Classic', price: 600, tagline: 'Dreams in English.', body: 'dome', barrelShape: 'tube', legs: 'jets', sides: 'none', topper: 'none', pattern: 'stars', eyes: 'sleepy', shot: 'moon', barrel: 0x2c3a6b, band: 0xffc43d, bodyColor: 0x3f4f99, plate: 0xdfe6ff, trim: 0xffc43d, accent: 0xffc43d, cheek: 0x9fb4ff },
  { id: 'angel', name: 'Angel', group: 'Fantasy', price: 900, tagline: 'Every answer, heaven-sent.', body: 'egg', barrelShape: 'tube', legs: 'jets', sides: 'wings', topper: 'halo', pattern: 'dots', eyes: 'round', shot: 'feather', barrel: 0x9fd3ff, band: 0xffffff, bodyColor: 0xffffff, plate: 0xeaf6ff, trim: 0xffc43d, accent: 0xffc43d, cheek: 0xffb8c9 },
  { id: 'sakura', name: 'Sakura', group: 'Flowers', price: 150, tagline: 'Blooms with every right answer.', body: 'egg', barrelShape: 'tube', legs: 'feet', sides: 'none', topper: 'blossom', pattern: 'petals', eyes: 'round', shot: 'petal', barrel: 0xffb7c5, band: 0xffffff, bodyColor: 0xffe4ec, plate: 0xffffff, trim: 0x8a5a44, accent: 0xff8fab, cheek: 0xff8fab },
  { id: 'sunflower', name: 'Sunflower', group: 'Flowers', price: 300, tagline: 'Always faces the next word.', body: 'round', barrelShape: 'tapered', legs: 'feet', sides: 'none', topper: 'sunpetals', pattern: 'dots', eyes: 'round', shot: 'seed', barrel: 0x4caf3a, band: 0x2e7d22, bodyColor: 0x8a5a2b, plate: 0xfff6e5, trim: 0x7ed957, accent: 0xffc43d, cheek: 0xff9fb8 },
  { id: 'rose', name: 'Rose', group: 'Flowers', price: 300, tagline: 'Sweet looks, sharp spelling.', body: 'round', barrelShape: 'tube', legs: 'feet', sides: 'none', topper: 'rose', pattern: 'thorns', eyes: 'round', shot: 'rosebud', barrel: 0x3f9b2e, band: 0x1f5e17, bodyColor: 0xd63a5a, plate: 0xfff0f3, trim: 0x7ed957, accent: 0xff4f6d, cheek: 0xff9fb8 },
  { id: 'lotus', name: 'Lotus', group: 'Flowers', price: 450, tagline: 'Calm on the water, quick on the keys.', body: 'egg', barrelShape: 'flared', legs: 'feet', sides: 'none', topper: 'lotus', pattern: 'waves', eyes: 'sleepy', shot: 'lily', barrel: 0x7ed9a0, band: 0x3f98d6, bodyColor: 0xff9fc8, plate: 0xfff5fa, trim: 0x4cc9a7, accent: 0xffd6e7, cheek: 0xff6fa5 },
  { id: 'tulip', name: 'Tulip', group: 'Flowers', price: 150, tagline: 'Pops up first every spring.', body: 'tulip', barrelShape: 'tube', legs: 'feet', sides: 'none', topper: 'none', pattern: 'stripes', eyes: 'round', shot: 'pollen', barrel: 0x4caf3a, band: 0x7ed957, bodyColor: 0xff6b4a, plate: 0xfff3e0, trim: 0xffc43d, accent: 0x4caf3a, cheek: 0xffb38a },
];

export const skinById = (id: CannonSkinId | undefined): CannonSkin => CANNON_SKINS.find((s) => s.id === id) ?? CANNON_SKINS[0]!;

// ── Rarity: pricier skins come with more effects ────────────────────────────

export type Rarity = 'common' | 'rare' | 'epic' | 'legendary';

export function rarityOf(skin: Pick<CannonSkin, 'price'>): Rarity {
  if (skin.price >= 900) return 'legendary';
  if (skin.price >= 450) return 'epic';
  if (skin.price >= 250) return 'rare';
  return 'common';
}

export interface SkinEffects {
  /** Sparkles trailing every shot. */
  trail: boolean;
  /** Rainbow-coloured trail instead of the skin's colours. */
  rainbow: boolean;
  /** Pulsing glow behind the cannon. */
  aura: boolean;
  /** Extra firework burst when a shot lands. */
  fireworks: boolean;
  /** Stars circling the cannon. */
  orbit: boolean;
}

export function effectsOf(skin: Pick<CannonSkin, 'price'>): SkinEffects {
  const r = rarityOf(skin);
  const epicPlus = r === 'epic' || r === 'legendary';
  return { trail: r !== 'common', rainbow: r === 'legendary', aura: epicPlus, fireworks: epicPlus, orbit: r === 'legendary' };
}

export const RARITY_INFO: Record<Rarity, { label: string; color: string; perks: string[] }> = {
  common: { label: 'Common', color: '#e3e6ef', perks: [] },
  rare: { label: 'Rare', color: '#7cc4f5', perks: ['Sparkle trail'] },
  epic: { label: 'Epic', color: '#c3a6ff', perks: ['Sparkle trail', 'Glowing aura', 'Firework hits'] },
  legendary: { label: 'Legendary', color: '#ffc43d', perks: ['Rainbow trail', 'Glowing aura', 'Firework hits', 'Orbiting stars'] },
};

export const RAINBOW = [0xff6b8a, 0xffc43d, 0x7ed957, 0x7cc4f5, 0xb388ff] as const;
