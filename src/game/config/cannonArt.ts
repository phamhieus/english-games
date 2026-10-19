import { THEME, type BarrelPattern, type BarrelShape, type BodyShape, type CannonSkin, type ShotStyle } from './theme';

/**
 * Cannon artwork as SVG markup, shared by the Phaser cannon (rendered to textures) and
 * the React previews, so a skin always looks the same everywhere.
 *
 * Coordinates are in "cannon space": the body is centred on (0, 6); the barrel is drawn
 * in its own space (pivot at 0,0, tube pointing up to y = -BARREL_LENGTH) and sits at
 * (0, -14) in cannon space.
 */

export const BARREL_LENGTH = 58;
export const BARREL_PIVOT_Y = -14;

export interface ArtBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

export const BODY_BOX: ArtBox = { x: -64, y: -74, w: 128, h: 138 };
export const BARREL_BOX: ArtBox = { x: -24, y: -62, w: 48, h: 66 };
export const FACE_BOX: ArtBox = { x: -28, y: -14, w: 56, h: 42 };
/** Whole cannon (barrel pointing up) for previews. */
export const PREVIEW_BOX: ArtBox = { x: -64, y: -84, w: 128, h: 148 };

const INK = THEME.ink;
export const hex = (n: number) => `#${n.toString(16).padStart(6, '0')}`;

const mirror = (inner: string) => `${inner}<g transform="scale(-1 1)">${inner}</g>`;

function star(cx: number, cy: number, r: number): string {
  const pts = Array.from({ length: 10 }, (_, i) => {
    const rr = i % 2 === 0 ? r : r * 0.45;
    const a = (Math.PI / 5) * i - Math.PI / 2;
    return `${(cx + Math.cos(a) * rr).toFixed(2)},${(cy + Math.sin(a) * rr).toFixed(2)}`;
  });
  return `M${pts.join('L')}Z`;
}

/** Five-petal flower (sakura / pattern blossoms). */
function flower(cx: number, cy: number, r: number, fill: string, stroke = true): string {
  const sw = stroke ? `stroke="${INK}" stroke-width="${Math.max(1.2, r / 5).toFixed(1)}"` : '';
  const petals = Array.from(
    { length: 5 },
    (_, i) => `<ellipse cx="${cx}" cy="${cy - r * 0.55}" rx="${r * 0.42}" ry="${r * 0.55}" transform="rotate(${i * 72} ${cx} ${cy})" fill="${fill}" ${sw}/>`,
  ).join('');
  return `${petals}<circle cx="${cx}" cy="${cy}" r="${r * 0.28}" fill="#ffc43d"/>`;
}

// ── Barrel ──────────────────────────────────────────────────────────────────

const BARREL_PATHS: Record<BarrelShape, string> = {
  tube: 'M-15 -50Q-15 -58 -7 -58H7Q15 -58 15 -50V0H-15Z',
  chunky: 'M-19 -48Q-19 -58 -9 -58H9Q19 -58 19 -48V0H-19Z',
  tapered: 'M-19 0L-12 -58H12L19 0Z',
  flared: 'M-11 0V-34Q-11 -48 -17 -58H17Q11 -48 11 -34V0Z',
  double: 'M-18 -52Q-18 -58 -12 -58H-8Q-2 -58 -2 -52V0H-18ZM2 -52Q2 -58 8 -58H12Q18 -58 18 -52V0H2Z',
};

function barrelPattern(p: BarrelPattern, c: string): string {
  switch (p) {
    case 'bands':
      return `<rect x="-30" y="-40" width="60" height="7" fill="${c}"/><rect x="-30" y="-26" width="60" height="7" fill="${c}"/>`;
    case 'stripes':
      return [-10, 4, 18]
        .map((o) => `<path d="M-30 ${-30 - o}L30 ${-50 - o}L30 ${-44 - o}L-30 ${-24 - o}Z" fill="${c}"/>`)
        .join('');
    case 'dots':
      return [
        [-7, -48],
        [6, -42],
        [-6, -34],
        [7, -27],
        [-5, -21],
      ]
        .map(([x, y]) => `<circle cx="${x}" cy="${y}" r="3" fill="${c}"/>`)
        .join('');
    case 'stars':
      return `<g fill="${c}" stroke="${INK}" stroke-width="1.2" stroke-linejoin="round"><path d="${star(0, -46, 5.5)}"/><path d="${star(-6, -31, 4)}"/><path d="${star(7, -25, 3.5)}"/></g>`;
    case 'scales':
      return [-46, -36, -26]
        .flatMap((y, row) => [-12, 0, 12].map((x) => x + (row % 2 ? 6 : 0)).map((x) => `M${x - 6} ${y}A6 6 0 0 0 ${x + 6} ${y}`))
        .map((d) => `<path d="${d}" fill="none" stroke="${c}" stroke-width="2.5"/>`)
        .join('');
    case 'flames':
      return `<path d="M-30 -14V-26Q-14 -30 -10 -40Q-6 -32 -2 -34Q2 -50 8 -36Q12 -30 16 -38Q20 -30 30 -28V-14Z" fill="${c}"/><path d="M-30 -14V-22Q-10 -24 -6 -30Q-2 -24 4 -28Q10 -22 30 -22V-14Z" fill="#ffc43d"/>`;
    case 'waves':
      return [-44, -30]
        .map((y) => `<path d="M-30 ${y}q5 -5 10 0t10 0t10 0t10 0t10 0t10 0" fill="none" stroke="${c}" stroke-width="3"/>`)
        .join('');
    case 'petals':
      return flower(-6, -46, 6, c) + flower(6, -33, 5.5, c) + flower(-5, -22, 4.5, c);
    case 'thorns':
      return [
        [-1, -50],
        [1, -40],
        [-1, -30],
        [1, -22],
      ]
        .map(([side, y]) =>
          side! < 0
            ? `<path d="M-16 ${y! - 3}L-8 ${y}L-16 ${y! + 3}Z" fill="${c}"/>`
            : `<path d="M16 ${y! - 3}L8 ${y}L16 ${y! + 3}Z" fill="${c}"/>`,
        )
        .join('') + `<path d="M0 -56V-16" stroke="${c}" stroke-width="2" opacity=".5"/>`;
    case 'rivets':
      return `<path d="M0 -56V-16" stroke="${c}" stroke-width="2"/>${[-50, -40, -30, -22]
        .flatMap((y) => [-10, 10].map((x) => `<circle cx="${x}" cy="${y}" r="2" fill="${c}"/>`))
        .join('')}`;
  }
}

/** Barrel tube in barrel space (no muzzle lip: that one animates). */
export function barrelSvg(skin: CannonSkin): string {
  const d = BARREL_PATHS[skin.barrelShape];
  const clip = `cw-barrel-${skin.id}`;
  const shineX = skin.barrelShape === 'double' ? -14 : -11;
  const strap =
    skin.barrelShape === 'double'
      ? `<rect x="-21" y="-38" width="42" height="9" rx="3" fill="${hex(skin.trim)}" stroke="${INK}" stroke-width="2.5"/>`
      : '';
  return (
    `<defs><clipPath id="${clip}"><path d="${d}"/></clipPath></defs>` +
    `<path d="${d}" fill="${hex(skin.barrel)}"/>` +
    `<g clip-path="url(#${clip})">${barrelPattern(skin.pattern, hex(skin.band))}</g>` +
    `<path d="${d}" fill="none" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>` +
    `<rect x="${shineX}" y="-52" width="4" height="12" rx="2" fill="#fff" opacity=".45"/>` +
    strap
  );
}

/** Muzzle lip for previews, `open` 0..1 (same shape the game draws while the mouth opens). */
export function muzzleSvg(skin: CannonSkin, open = 0): string {
  const lipH = 16 + open * 6;
  const top = -BARREL_LENGTH - 6 - open * 5;
  const mouthW = 22 + open * 12;
  const mouthH = 6 + open * 15;
  const cy = top + lipH / 2 + 1;
  const tongue =
    open > 0.45 ? `<ellipse cx="0" cy="${cy + mouthH * 0.22}" rx="${(mouthW * 0.55) / 2}" ry="${(mouthH * 0.42) / 2}" fill="#ff7a93"/>` : '';
  return (
    `<rect x="${-21 - open * 2}" y="${top}" width="${42 + open * 4}" height="${lipH}" rx="6" fill="${hex(skin.trim)}" stroke="${INK}" stroke-width="3"/>` +
    `<ellipse cx="0" cy="${cy}" rx="${mouthW / 2}" ry="${mouthH / 2}" fill="${INK}"/>` +
    tongue
  );
}

// ── Body ────────────────────────────────────────────────────────────────────

const BODY_PATHS: Record<BodyShape, string> = {
  round: 'M-38 6a38 38 0 1 0 76 0a38 38 0 1 0 -76 0Z',
  square: 'M-24 -32H24Q38 -32 38 -18V30Q38 44 24 44H-24Q-38 44 -38 30V-18Q-38 -32 -24 -32Z',
  hex: 'M-40 6L-21 -30H21L40 6L21 42H-21Z',
  egg: 'M0 -36C26 -36 40 -8 40 14C40 34 24 46 0 46C-24 46 -40 34 -40 14C-40 -8 -26 -36 0 -36Z',
  dome: 'M-42 38V8A42 40 0 0 1 42 8V38Q42 44 36 44H-36Q-42 44 -42 38Z',
  tulip: 'M-38 -14L-26 -32L-13 -18L0 -36L13 -18L26 -32L38 -14C40 10 34 40 0 46C-34 40 -40 10 -38 -14Z',
};

function legsBehind(skin: CannonSkin): string {
  if (skin.legs === 'jets') {
    const nozzle = `<path d="M-23 40H-9L-11 52H-21Z" fill="${hex(skin.trim)}" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/>`;
    const flame = `<path d="M-21 52Q-16 66 -11 52Z" fill="#ff9f43" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/><path d="M-18.5 52Q-16 59 -13.5 52Z" fill="#ffc43d"/>`;
    return mirror(flame + nozzle);
  }
  return '';
}

function legsFront(skin: CannonSkin): string {
  const trim = hex(skin.trim);
  switch (skin.legs) {
    case 'feet':
      return mirror(`<rect x="-33" y="35" width="22" height="12" rx="6" fill="${trim}" stroke="${INK}" stroke-width="3"/>`);
    case 'wheels':
      return mirror(`<circle cx="-25" cy="42" r="11" fill="#3a3f55" stroke="${INK}" stroke-width="3"/><circle cx="-25" cy="42" r="4.5" fill="${trim}"/>`);
    case 'treads':
      return (
        `<rect x="-46" y="34" width="92" height="17" rx="8.5" fill="#3a3f55" stroke="${INK}" stroke-width="3"/>` +
        [-34, -17, 0, 17, 34].map((x) => `<circle cx="${x}" cy="42.5" r="4" fill="${trim}"/>`).join('')
      );
    case 'jets':
      return '';
  }
}

function sides(skin: CannonSkin): string {
  switch (skin.sides) {
    case 'bolts':
      return mirror(`<circle cx="-41" cy="8" r="8" fill="${hex(skin.trim)}" stroke="${INK}" stroke-width="3"/>`);
    case 'wings':
      return mirror(
        `<path d="M-34 -2C-50 -18 -66 -8 -62 6C-60 12 -54 13 -50 11C-56 19 -50 26 -42 22C-44 28 -38 32 -32 26Z" fill="#fff" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>` +
          `<path d="M-48 4Q-42 6 -38 10M-44 15Q-40 15 -36 18" fill="none" stroke="${INK}" stroke-width="2" stroke-linecap="round"/>`,
      );
    case 'none':
      return '';
  }
}

function topperBehind(skin: CannonSkin): string {
  const a = hex(skin.accent);
  const s = `stroke="${INK}" stroke-width="3" stroke-linejoin="round"`;
  switch (skin.topper) {
    case 'cat':
      return mirror(`<path d="M-34 -8L-12 -28L-36 -46Z" fill="${a}" ${s}/><path d="M-30 -15L-19 -26L-32 -38Z" fill="#ffd6e7"/>`);
    case 'bunny':
      return mirror(
        `<g transform="rotate(-12 -20 -46)"><ellipse cx="-20" cy="-46" rx="8.5" ry="22" fill="${a}" ${s}/><ellipse cx="-20" cy="-44" rx="4" ry="15" fill="#ff9fb8"/></g>`,
      );
    case 'bear':
      return mirror(`<circle cx="-28" cy="-24" r="12" fill="${a}" ${s}/><circle cx="-28" cy="-24" r="5.5" fill="#55555f"/>`);
    case 'spikes':
      return mirror(
        `<path d="M-6 -33L-22 -29L-16 -50Z" fill="${a}" ${s}/><path d="M-22 -26L-35 -14L-38 -36Z" fill="${a}" ${s}/><path d="M-35 -10L-41 4L-50 -14Z" fill="${a}" ${s}/>`,
      );
    case 'fin':
      return `<path d="M-30 -12C-40 -34 -34 -52 -16 -62C-21 -46 -15 -32 -4 -28Z" fill="${a}" ${s}/>`;
    case 'sunpetals':
      return Array.from(
        { length: 16 },
        (_, i) => `<ellipse cx="0" cy="-40" rx="8" ry="14" transform="rotate(${i * 22.5} 0 6)" fill="${a}" ${s}/>`,
      ).join('');
    case 'lotus':
      return [-100, -70, -40, 40, 70, 100]
        .map(
          (r) =>
            `<g transform="translate(0 32) rotate(${r})"><path d="M0 0C14 -14 14 -40 0 -56C-14 -40 -14 -14 0 0Z" fill="${a}" ${s}/><path d="M0 -10V-42" stroke="#ff8ab8" stroke-width="2.2" stroke-linecap="round"/></g>`,
        )
        .join('');
    case 'antenna':
      return mirror(
        `<path d="M-20 -26L-31 -50" stroke="${INK}" stroke-width="3" stroke-linecap="round"/><circle cx="-32" cy="-53" r="5.5" fill="${a}" stroke="${INK}" stroke-width="2.5"/>`,
      );
    default:
      return '';
  }
}

function topperFront(skin: CannonSkin): string {
  const a = hex(skin.accent);
  const s = `stroke="${INK}" stroke-width="3" stroke-linejoin="round"`;
  switch (skin.topper) {
    case 'leaf':
      return (
        `<path d="M22 -24Q27 -36 24 -46" fill="none" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>` +
        `<ellipse cx="15" cy="-50" rx="10" ry="5.5" transform="rotate(-28 15 -50)" fill="${a}" stroke="${INK}" stroke-width="2.5"/>` +
        `<ellipse cx="33" cy="-51" rx="10" ry="5.5" transform="rotate(28 33 -51)" fill="${a}" stroke="${INK}" stroke-width="2.5"/>`
      );
    case 'horns':
      return mirror(`<path d="M-30 -12C-40 -24 -43 -40 -37 -54C-31 -42 -23 -32 -15 -27Z" fill="${a}" ${s}/>`);
    case 'crown':
      return (
        `<path d="M-22 -20L-25 -42L-12 -31L0 -47L12 -31L25 -42L22 -20Z" fill="${a}" ${s}/>` +
        `<circle cx="0" cy="-29" r="3.5" fill="#e8506a" stroke="${INK}" stroke-width="1.5"/>` +
        [
          [-25, -42],
          [0, -47],
          [25, -42],
        ]
          .map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2.6" fill="#fff" stroke="${INK}" stroke-width="1.5"/>`)
          .join('')
      );
    case 'blossom':
      return (
        `<path d="M14 -24Q24 -34 40 -34" fill="none" stroke="#8a5a44" stroke-width="3.5" stroke-linecap="round"/>` +
        flower(24, -34, 11, a) +
        flower(41, -22, 7.5, a)
      );
    case 'rose':
      return (
        `<ellipse cx="11" cy="-30" rx="8" ry="4.5" transform="rotate(-30 11 -30)" fill="#7ed957" stroke="${INK}" stroke-width="2.2"/>` +
        `<ellipse cx="38" cy="-27" rx="8" ry="4.5" transform="rotate(30 38 -27)" fill="#7ed957" stroke="${INK}" stroke-width="2.2"/>` +
        `<circle cx="25" cy="-34" r="12" fill="${a}" ${s}/>` +
        `<path d="M24 -34a2.2 2.2 0 1 1 3 1.5a5 5 0 1 1 -8 -3.5a8.5 8.5 0 0 1 13 1" fill="none" stroke="${INK}" stroke-width="2" stroke-linecap="round"/>`
      );
    case 'lotus':
      // front row of petals the cannon sits in
      return [-50, 0, 50]
        .map(
          (r) =>
            `<g transform="translate(0 50) rotate(${r})"><path d="M0 0C10 -8 10 -22 0 -30C-10 -22 -10 -8 0 0Z" fill="${a}" ${s}/></g>`,
        )
        .join('');
    case 'halo':
      return `<ellipse cx="0" cy="-50" rx="21" ry="6.5" fill="none" stroke="${INK}" stroke-width="8"/><ellipse cx="0" cy="-50" rx="21" ry="6.5" fill="none" stroke="${a}" stroke-width="4"/>`;
    default:
      return '';
  }
}

/** Ninja headband: clipped to the body so it wraps the head, with tails on the right. */
function headband(skin: CannonSkin, bodyD: string): string {
  if (skin.topper !== 'headband') return '';
  const a = hex(skin.accent);
  const clip = `cw-body-${skin.id}`;
  return (
    `<defs><clipPath id="${clip}"><path d="${bodyD}"/></clipPath></defs>` +
    `<g clip-path="url(#${clip})"><rect x="-50" y="-21" width="100" height="11" fill="${a}" stroke="${INK}" stroke-width="2.5"/></g>` +
    `<path d="${bodyD}" fill="none" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>` +
    `<path d="M32 -17L54 -27L51 -17Z M32 -13L52 -6L47 1Z" fill="${a}" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/>` +
    `<circle cx="33" cy="-15" r="4.5" fill="${a}" stroke="${INK}" stroke-width="2.5"/>`
  );
}

/** Body, legs, sides and toppers in cannon space (drawn in front of the barrel). */
export function bodySvg(skin: CannonSkin): string {
  const d = BODY_PATHS[skin.body];
  const shadow =
    skin.legs === 'jets'
      ? `<ellipse cx="0" cy="60" rx="30" ry="3.5" fill="${INK}" opacity=".25"/>`
      : `<ellipse cx="0" cy="47" rx="48" ry="6" fill="${INK}"/>`;
  return (
    shadow +
    legsBehind(skin) +
    sides(skin) +
    topperBehind(skin) +
    `<path d="${d}" fill="${hex(skin.bodyColor)}" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>` +
    `<path d="${d}" transform="translate(0 6) scale(.72) translate(0 -6)" fill="${hex(skin.plate)}" stroke="${INK}" stroke-width="2" vector-effect="non-scaling-stroke" stroke-linejoin="round"/>` +
    `<rect x="-31" y="-12" width="5" height="12" rx="2.5" transform="rotate(25 -28 -6)" fill="#fff" opacity=".5"/>` +
    headband(skin, d) +
    topperFront(skin) +
    legsFront(skin)
  );
}

// ── Face ────────────────────────────────────────────────────────────────────

function eyes(skin: CannonSkin, happy: boolean): string {
  const shine = `<circle cx="-11.8" cy="3" r="1.8" fill="#fff"/><circle cx="8.2" cy="3" r="1.8" fill="#fff"/>`;
  const happyArcs = (color: string) =>
    mirror(`<path d="M-15.5 7.5Q-10 0.5 -4.5 7.5" fill="none" stroke="${color}" stroke-width="3" stroke-linecap="round"/>`);
  switch (skin.eyes) {
    case 'shades':
      return (
        `<path d="M-3 2H3" stroke="${INK}" stroke-width="3"/>` +
        mirror(`<rect x="-20" y="-2" width="17" height="11" rx="4.5" fill="${INK}"/><path d="M-16 1L-12 -1" stroke="#fff" stroke-width="1.6" stroke-linecap="round"/>`)
      );
    case 'panda':
      return (
        mirror(`<ellipse cx="-11" cy="6" rx="7.5" ry="9.5" transform="rotate(25 -11 6)" fill="${INK}"/>`) +
        (happy
          ? happyArcs('#fff')
          : mirror(`<circle cx="-10" cy="4.5" r="3.6" fill="#fff"/><circle cx="-10" cy="5" r="2" fill="${INK}"/>`))
      );
    default:
      break;
  }
  if (happy) return happyArcs(INK);
  switch (skin.eyes) {
    case 'square':
      return mirror(`<rect x="-15" y="0" width="10" height="10" rx="2" fill="${INK}"/>`) + shine;
    case 'sleepy':
      return mirror(`<path d="M-15 5A5 5 0 0 0 -5 5Z" fill="${INK}"/><path d="M-16.5 5H-3.5" stroke="${INK}" stroke-width="2.5" stroke-linecap="round"/>`);
    case 'star':
      return mirror(`<path d="${star(-10, 5, 6.5)}" fill="${hex(skin.accent)}" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/>`);
    case 'narrow':
      return mirror(
        `<path d="M-15 5.5Q-10 3 -5 6" fill="none" stroke="${INK}" stroke-width="4" stroke-linecap="round"/><path d="M-16 -2L-5 1.5" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>`,
      );
    default:
      return mirror(`<circle cx="-10" cy="5" r="5" fill="${INK}"/>`) + shine;
  }
}

/** Face (eyes, cheeks, mouth) in cannon space; `happy` is the firing expression. */
export function faceSvg(skin: CannonSkin, happy: boolean): string {
  const cheeks = skin.cheek === null ? '' : mirror(`<ellipse cx="-18" cy="14" rx="4" ry="2.5" fill="${hex(skin.cheek)}"/>`);
  const mouth = happy
    ? `<path d="M-6 12Q0 21 6 12Z" fill="${INK}" stroke="${INK}" stroke-width="1.5" stroke-linejoin="round"/><path d="M-3 16.2Q0 19.4 3 16.2Q0 14.6 -3 16.2Z" fill="#ff7a93"/>`
    : skin.eyes === 'square'
      ? `<path d="M-5 14H5" stroke="${INK}" stroke-width="2.5" stroke-linecap="round"/>`
      : `<path d="M-4.2 13.5Q0 17 4.2 13.5" fill="none" stroke="${INK}" stroke-width="2.5" stroke-linecap="round"/>`;
  return cheeks + eyes(skin, happy) + mouth;
}

// ── Shots ───────────────────────────────────────────────────────────────────

export const SHOT_BOX: ArtBox = { x: -16, y: -16, w: 32, h: 32 };

/** How a shot moves: points along its path, spins, or stays upright. */
export const SHOT_MOTION: Record<ShotStyle, 'aim' | 'spin' | 'upright'> = {
  bubble: 'upright',
  heart: 'upright',
  carrot: 'aim',
  bamboo: 'aim',
  leaf: 'aim',
  egg: 'spin',
  drop: 'aim',
  sun: 'spin',
  bolt: 'aim',
  shuriken: 'spin',
  fireball: 'aim',
  gem: 'spin',
  moon: 'spin',
  feather: 'aim',
  petal: 'spin',
  seed: 'aim',
  rosebud: 'aim',
  lily: 'upright',
  pollen: 'spin',
};

/** The projectile, pointing up (towards -y), drawn in SHOT_BOX. */
export function shotSvg(skin: CannonSkin): string {
  const s = `stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"`;
  const teardrop = 'M0 -11C7 -11 9 -3 7 3C5 9 2 13 0 15C-2 13 -5 9 -7 3C-9 -3 -7 -11 0 -11Z';
  switch (skin.shot) {
    case 'bubble':
      return `<circle r="10" fill="#9fe3ff" ${s}/><path d="M-5 -3A6 6 0 0 1 -2 -6" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round"/>`;
    case 'heart':
      return `<path d="M0 11C-13 3 -13 -9 -6 -9C-3 -9 -1 -7 0 -4.5C1 -7 3 -9 6 -9C13 -9 13 3 0 11Z" fill="#ff4f86" ${s}/><circle cx="-5" cy="-4" r="1.8" fill="#fff"/>`;
    case 'carrot':
      return `<path d="M-2 7L-6 14M0 8V15M2 7L6 14" stroke="#4caf3a" stroke-width="3" stroke-linecap="round"/><path d="M0 -13L6 6Q0 10 -6 6Z" fill="#ff9f43" ${s}/><path d="M-2 -3H1M-3 2H1" stroke="${INK}" stroke-width="1.5" stroke-linecap="round"/>`;
    case 'bamboo':
      return `<rect x="-4.5" y="-13" width="9" height="26" rx="3.5" fill="#7ed957" ${s}/><path d="M-4.5 -4H4.5M-4.5 5H4.5" stroke="${INK}" stroke-width="2"/><path d="M4 -8Q12 -12 13 -4Q7 -3 4 -6Z" fill="#4caf3a" stroke="${INK}" stroke-width="1.8"/>`;
    case 'leaf':
      return `<path d="M0 -13C8 -6 7 7 0 13C-7 7 -8 -6 0 -13Z" fill="#7ed957" ${s}/><path d="M0 -8V14" stroke="${INK}" stroke-width="1.8" stroke-linecap="round"/>`;
    case 'egg':
      return `<ellipse rx="8" ry="10" fill="#fff6e5" ${s}/><circle cx="-3" cy="-3" r="2" fill="#8fdc6a"/><circle cx="3.5" cy="3" r="2.5" fill="#8fdc6a"/><circle cx="-2" cy="5.5" r="1.4" fill="#8fdc6a"/>`;
    case 'drop':
      return `<path d="${teardrop}" fill="#7cc4f5" ${s}/><path d="M-3.5 -4A4 4 0 0 1 -1 -7" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round"/>`;
    case 'fireball':
      return `<path d="${teardrop}" fill="#ff9f43" ${s}/><path d="M0 -6C4 -6 5 -1 4 2C3 5 1 8 0 9C-1 8 -3 5 -4 2C-5 -1 -4 -6 0 -6Z" fill="#ffc43d"/>`;
    case 'sun':
      return (
        Array.from({ length: 8 }, (_, i) => `<path d="M-2.5 -9L0 -14.5L2.5 -9Z" transform="rotate(${i * 45})" fill="#ffc43d" ${s}/>`).join('') +
        `<circle r="7.5" fill="#ffc43d" ${s}/>`
      );
    case 'bolt':
      return `<path d="M3 -14L-7 1H-1L-4 14L7 -2H1Z" fill="#ffe066" ${s}/>`;
    case 'shuriken':
      return `<path d="M0 -14L3.5 -3.5L14 0L3.5 3.5L0 14L-3.5 3.5L-14 0L-3.5 -3.5Z" fill="#b7c1d1" ${s}/><circle r="2.8" fill="${INK}"/>`;
    case 'gem':
      return `<path d="M0 -12L9 -3L0 12L-9 -3Z" fill="#7cc4f5" ${s}/><path d="M-9 -3H9M-4 -3L0 12L4 -3M-4 -3L0 -12L4 -3" fill="none" stroke="${INK}" stroke-width="1.4" stroke-linejoin="round"/>`;
    case 'moon':
      return `<path d="M4 -11A11 11 0 1 0 4 11A8.5 8.5 0 1 1 4 -11Z" fill="#ffe066" ${s}/>`;
    case 'petal':
      return `<path d="M0 12C-10 6 -10 -6 -3.5 -12L0 -8L3.5 -12C10 -6 10 6 0 12Z" fill="#ffb7c5" ${s}/><path d="M0 -3V8" stroke="#ff8fab" stroke-width="2" stroke-linecap="round"/>`;
    case 'seed':
      return `<path d="M0 -13C7 -6 7 6 0 13C-7 6 -7 -6 0 -13Z" fill="#3b2b33" ${s}/><path d="M-2.5 -6V6M2.5 -6V6" stroke="#fff" stroke-width="1.6" stroke-linecap="round"/>`;
    case 'rosebud':
      return `<path d="M-6 6L0 14L6 6Z" fill="#7ed957" ${s}/><path d="M0 -12C8 -12 9 0 0 7C-9 0 -8 -12 0 -12Z" fill="#ff4f6d" ${s}/><path d="M0 -7Q4 -4 0 1" fill="none" stroke="${INK}" stroke-width="1.6" stroke-linecap="round"/>`;
    case 'lily':
      return `<path d="M0 10C-12 6 -14 -4 -11 -8C-6 -4 -3 2 0 10Z" fill="#ff9fc8" ${s}/><path d="M0 10C12 6 14 -4 11 -8C6 -4 3 2 0 10Z" fill="#ff9fc8" ${s}/><path d="M0 10C-6 2 -6 -6 0 -13C6 -6 6 2 0 10Z" fill="#ffd6e7" ${s}/>`;
    case 'pollen':
      return (
        Array.from({ length: 6 }, (_, i) => `<circle cx="0" cy="-8" r="5" transform="rotate(${i * 60})" fill="#ffe066" ${s}/>`).join('') +
        `<circle r="6.5" fill="#ffc43d" ${s}/>`
      );
    case 'feather':
      return `<path d="M0 -13C8 -7 7 5 1 12L-1 12C-7 5 -8 -7 0 -13Z" fill="#fff" ${s}/><path d="M0 -8V15M0 -3L-4 -6M0 2L4 -1M0 6L-4 3" fill="none" stroke="${INK}" stroke-width="1.6" stroke-linecap="round"/>`;
  }
}

/** The whole cannon, barrel up, for previews. */
export function cannonSvg(skin: CannonSkin, happy = false, mouthOpen = 0): string {
  return `<g transform="translate(0 ${BARREL_PIVOT_Y})">${barrelSvg(skin)}${muzzleSvg(skin, mouthOpen)}</g>${bodySvg(skin)}${faceSvg(skin, happy)}`;
}

/** A standalone SVG document for one part, rendered `scale`× larger for crisp textures. */
export function svgDocument(inner: string, box: ArtBox, scale = 1): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${box.w * scale}" height="${box.h * scale}" viewBox="${box.x} ${box.y} ${box.w} ${box.h}">${inner}</svg>`;
}

export const svgDataUri = (svg: string) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
