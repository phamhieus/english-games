import type { BossId } from '@/types';

/**
 * Boss artwork as SVG, drawn in a 220×220 box centred on 0,0, in the game's flat style:
 * solid fills, thick ink outlines, a flat darker crescent for shading and white pill shines
 * (like the balloons and the cannon). The characters are cartoon villains with mismatched
 * eyes under heavy lids and goofy-but-mean teeth. Every boss has a calm and an angry
 * (enraged) version. Clip-path ids carry the boss and mood so several drawings can share a page.
 */

export const BOSS_BOX = { x: -110, y: -110, w: 220, h: 220 } as const;

const INK = '#1f2a44';

// ── Helpers ─────────────────────────────────────────────────────────────────────

/**
 * Flat two-tone fill: the shape in `base` with a `dark` crescent along its lower right edge.
 * `shape` is fill-less markup (e.g. `<path d="…"/>`); outline it separately.
 */
const toned = (id: string, shape: string, base: string, dark: string, dx = -8, dy = -9) =>
  `<clipPath id="${id}">${shape}</clipPath><g clip-path="url(#${id})"><g fill="${dark}">${shape}</g><g fill="${base}" transform="translate(${dx} ${dy})">${shape}</g></g>`;

/** Same shapes outlined as one silhouette: thick ink stroke underneath, fill on top. */
const blob = (shapes: readonly string[], fill: string, outline = 9) =>
  `<g stroke="${INK}" stroke-width="${outline}" stroke-linejoin="round" fill="${INK}">${shapes.join('')}</g><g fill="${fill}">${shapes.join('')}</g>`;

/** White pill highlight, like the shine on the balloons. */
const shine = (x: number, y: number, w: number, h: number, rot = 0) =>
  `<rect x="${x - w / 2}" y="${y - h / 2}" width="${w}" height="${h}" rx="${Math.min(w, h) / 2}" fill="#fff" opacity=".6" transform="rotate(${rot} ${x} ${y})"/>`;

const mirror = (g: string) => `<g transform="scale(-1 1)">${g}</g>`;

const onEllipse = (x: number, y: number, rx: number, ry: number, deg: number) => {
  const a = (deg * Math.PI) / 180;
  return `${(x + Math.cos(a) * rx).toFixed(1)} ${(y + Math.sin(a) * ry).toFixed(1)}`;
};

interface EyeSpec {
  x: number;
  y: number;
  rx: number;
  ry: number;
  /** Pupil offset from the eye centre. */
  look?: readonly [number, number];
  pupil?: number;
  /** Eyelid: from angle `a` (left) clockwise over the top to angle `b` (right), in degrees. */
  lid?: readonly [number, number];
  lidFill?: string;
  sclera?: string;
  pupilFill?: string;
  slit?: boolean;
}

/** A googly cartoon eye with an optional heavy lid. */
function eye(e: EyeSpec): string {
  const [lx, ly] = e.look ?? [0, 0];
  const pr = e.pupil ?? Math.min(e.rx, e.ry) * 0.42;
  const px = e.x + lx;
  const py = e.y + ly;
  let s = `<ellipse cx="${e.x}" cy="${e.y}" rx="${e.rx}" ry="${e.ry}" fill="${e.sclera ?? '#fff'}" stroke="${INK}" stroke-width="5"/>`;
  s += e.slit
    ? `<ellipse cx="${px}" cy="${py}" rx="${pr * 0.42}" ry="${pr * 1.45}" fill="${e.pupilFill ?? INK}"/>`
    : `<circle cx="${px}" cy="${py}" r="${pr}" fill="${e.pupilFill ?? INK}"/>`;
  s += `<circle cx="${px - pr * 0.4}" cy="${py - pr * 0.45}" r="${Math.max(1.6, pr * 0.32)}" fill="#fff"/>`;
  if (e.lid) {
    const [a, b] = e.lid;
    const span = (((b - a) % 360) + 360) % 360;
    s +=
      `<path d="M${onEllipse(e.x, e.y, e.rx, e.ry, a)}A${e.rx} ${e.ry} 0 ${span > 180 ? 1 : 0} 1 ${onEllipse(e.x, e.y, e.rx, e.ry, b)}Z" ` +
      `fill="${e.lidFill ?? '#ccc'}" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/>`;
  }
  return s;
}

/**
 * Uneven teeth along a quadratic lip (x0,y0)–(cx,cy)–(x1,y1). `dir` 1 hangs them down from
 * an upper lip, -1 points them up from a lower one.
 */
function teeth(x0: number, y0: number, cx: number, cy: number, x1: number, y1: number, n: number, len: number, dir: 1 | -1 = 1): string {
  const at = (t: number) => [(1 - t) ** 2 * x0 + 2 * t * (1 - t) * cx + t * t * x1, (1 - t) ** 2 * y0 + 2 * t * (1 - t) * cy + t * t * y1] as const;
  let d = `M${x0} ${y0}Q${cx} ${cy} ${x1} ${y1}`;
  for (let i = n; i >= 0; i--) {
    const [vx, vy] = at(i / n);
    d += `L${vx.toFixed(1)} ${vy.toFixed(1)}`;
    if (i > 0) {
      const [tx, ty] = at((i - 0.5) / n);
      d += `L${tx.toFixed(1)} ${(ty + len * dir * (0.75 + 0.25 * ((i * 7) % 3))).toFixed(1)}`;
    }
  }
  return `<path d="${d}Z" fill="#fff" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/>`;
}

const steam = (x: number, y: number) =>
  `<path d="M${x} ${y}q-9 -8 0 -16t0 -16" stroke="#fff" stroke-width="6" fill="none" stroke-linecap="round"/>`;

const brow = (x1: number, y1: number, x2: number, y2: number, w = 8) =>
  `<path d="M${x1} ${y1}L${x2} ${y2}" stroke="${INK}" stroke-width="${w}" stroke-linecap="round"/>`;

// ── Bosses ──────────────────────────────────────────────────────────────────────

function cloud(angry: boolean): string {
  const id = angry ? 'bcl-a' : 'bcl-c';
  const [base, dark] = angry ? ['#8d96ad', '#6a7290'] : ['#e3e8f3', '#b6c0d8'];
  const lid = base;
  const drop = (x: number, y: number) =>
    `<path d="M${x} ${y - 11}C${x + 8} ${y} ${x + 8} ${y + 8} ${x} ${y + 8}C${x - 8} ${y + 8} ${x - 8} ${y} ${x} ${y - 11}Z" fill="#7cc4f5" stroke="${INK}" stroke-width="3.5"/>`;
  const bolt = (x: number, y: number, flip: number) =>
    `<path transform="translate(${x} ${y}) scale(${flip} 1)" d="M0 0L-12 26L0 24L-8 50L16 14L4 16L12 0Z" fill="#ffd23f" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>`;
  const puffs = [
    '<circle cx="-56" cy="14" r="40"/>',
    '<circle cx="-20" cy="-22" r="48"/>',
    '<circle cx="30" cy="-26" r="52"/>',
    '<circle cx="68" cy="10" r="40"/>',
    '<rect x="-92" y="8" width="190" height="54" rx="27"/>',
  ];
  const mouth = angry
    ? `<path d="M-22 34Q10 22 42 34Q32 66 10 66Q-12 66 -22 34Z" fill="#3a1d2e"/>` +
      teeth(-22, 34, 10, 22, 42, 34, 7, 9) +
      teeth(-12, 60, 10, 70, 32, 60, 3, 7, -1) +
      `<path d="M-22 34Q10 22 42 34Q32 66 10 66Q-12 66 -22 34Z" fill="none" stroke="${INK}" stroke-width="5.5" stroke-linejoin="round"/>`
    : `<path d="M-6 44Q10 31 28 44Q10 39 -6 44Z" fill="${INK}" stroke="${INK}" stroke-width="6" stroke-linejoin="round"/>` +
      `<path d="M7 37.5l4 9l4 -9z" fill="#fff" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/>`;
  return (
    (angry ? bolt(-60, 52, 1) + bolt(66, 50, -1) + drop(4, 84) : drop(-50, 76) + drop(8, 86) + drop(62, 74)) +
    blob(puffs, base) +
    toned(id, puffs.join(''), base, dark, -6, -11) +
    shine(-36, -46, 30, 11, -24) +
    shine(20, -64, 16, 8, -10) +
    eye({ x: -16, y: 2, rx: 16, ry: 18, look: angry ? [2, 5] : [3, 6], pupil: angry ? 4.5 : 6.5, lid: angry ? [204, 32] : [198, 8], lidFill: lid, sclera: angry ? '#ffe9a0' : '#fff' }) +
    eye({ x: 32, y: 6, rx: 12, ry: 14, look: angry ? [-2, 4] : [-2, 5], pupil: angry ? 3.5 : 5, lid: angry ? [148, 336] : [172, 342], lidFill: lid, sclera: angry ? '#ffe9a0' : '#fff' }) +
    (angry ? brow(-38, -26, -2, -12, 9) + brow(18, -10, 50, -22, 9) : brow(-36, -22, -4, -16) + brow(20, -12, 46, -16)) +
    mouth
  );
}

function crab(angry: boolean): string {
  const id = angry ? 'bcr-a' : 'bcr-c';
  const [base, dark] = angry ? ['#d63a46', '#a52434'] : ['#f2603f', '#c4402c'];
  const fill = base;
  // three jointed legs per side, behind the shell
  const legs = [-1, 1]
    .map((s) =>
      [0, 1, 2]
        .map((i) => {
          const d = `M${s * 50} ${40 + i * 7}Q${s * (88 + i * 4)} ${30 + i * 13} ${s * (92 + i * 2)} ${78 + i * 10}`;
          return `<path d="${d}" stroke="${INK}" stroke-width="14" fill="none" stroke-linecap="round"/><path d="${d}" stroke="${base}" stroke-width="6.5" fill="none" stroke-linecap="round"/>`;
        })
        .join(''),
    )
    .join('');
  // a V-notch pincer with a serrated grip (drawn for the right side, mirrored for the left)
  const pincer =
    `<path d="M-20 -30C-30 -22 -32 -4 -26 8C-22 30 18 36 28 16C36 0 30 -30 8 -40C14 -26 8 -14 -4 -10C-8 -16 -12 -24 -20 -30Z" fill="${fill}" stroke="${INK}" stroke-width="6" stroke-linejoin="round"/>` +
    `<path d="M7 -33l-5 -1l4 -5zM5 -21l-5 1l2 -6zM-14 -26l5 -2l-1 6zM-9 -16l5 -3l0 6z" fill="#fff" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/>` +
    `<path d="M30 -2l9 -2l-5 8zM26 16l9 2l-7 5z" fill="${INK}"/>` +
    shine(-12, 4, 7, 16, 20);
  const arm = (pts: string, w: number) =>
    `<path d="${pts}" stroke="${INK}" stroke-width="${w}" fill="none" stroke-linejoin="round" stroke-linecap="round"/><path d="${pts}" stroke="${base}" stroke-width="${w - 10}" fill="none" stroke-linejoin="round" stroke-linecap="round"/>`;
  const shellPath = 'M-74 32C-78 -14 -40 -36 0 -36C40 -36 78 -14 74 32C70 56 38 64 0 64C-38 64 -70 56 -74 32Z';
  const spike = (d: string) => `<path d="${d}" fill="${dark}" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/>`;
  const lidFill = base;
  const mouth = angry
    ? `<path d="M-42 18Q0 30 42 18Q36 62 0 64Q-36 62 -42 18Z" fill="#4a0f1f"/>` +
      teeth(-42, 18, 0, 30, 42, 18, 9, 10) +
      teeth(-30, 54, 0, 70, 30, 54, 4, 9, -1) +
      `<path d="M-42 18Q0 30 42 18Q36 62 0 64Q-36 62 -42 18Z" fill="none" stroke="${INK}" stroke-width="5.5" stroke-linejoin="round"/>`
    : `<path d="M-38 23Q0 34 38 23Q32 46 0 48Q-32 46 -38 23Z" fill="#3d1020"/>` +
      teeth(-38, 23, 0, 34, 38, 23, 8, 8) +
      `<path d="M-27 45L-22 34L-16 46ZM16 46L22 34L27 45Z" fill="#fff" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/>` +
      `<path d="M-38 23Q0 34 38 23Q32 46 0 48Q-32 46 -38 23Z" fill="none" stroke="${INK}" stroke-width="5.5" stroke-linejoin="round"/>`;
  return (
    legs +
    // the big claw (right) and the small one (left): goofy fiddler-crab look
    arm('M60 14L88 -6L80 -28', 24) +
    `<g transform="translate(66 -58) rotate(8)">${pincer}</g>` +
    arm('M-60 16L-80 2L-80 -18', 20) +
    `<g transform="translate(-80 -40) scale(-.7 .7)">${pincer}</g>` +
    // eye stalks behind the shell
    arm('M-18 -24L-24 -60', 18) +
    arm('M20 -24L24 -54', 16) +
    spike('M-70 4L-92 -10L-66 -14Z') +
    spike('M-50 -22L-60 -46L-34 -32Z') +
    mirror(spike('M-70 4L-92 -10L-66 -14Z') + spike('M-50 -22L-60 -46L-34 -32Z')) +
    toned(id, `<path d="${shellPath}"/>`, base, dark, -7, -12) +
    `<path d="${shellPath}" fill="none" stroke="${INK}" stroke-width="7"/>` +
    `<circle cx="-50" cy="4" r="6" fill="${dark}"/><circle cx="50" cy="-4" r="5" fill="${dark}"/><circle cx="58" cy="10" r="3.5" fill="${dark}"/>` +
    shine(-40, -16, 32, 11, -18) +
    eye({ x: -24, y: -66, rx: 17, ry: 18, look: angry ? [3, 5] : [3, 6], pupil: angry ? 4.5 : 6.5, lid: angry ? [204, 34] : [200, 16], lidFill, sclera: angry ? '#ffd9d0' : '#fff' }) +
    eye({ x: 24, y: -58, rx: 13, ry: 14, look: angry ? [-2, 4] : [-2, 5], pupil: angry ? 3.5 : 5, lid: angry ? [146, 336] : [164, 340], lidFill, sclera: angry ? '#ffd9d0' : '#fff' }) +
    mouth +
    // it is a bubble crab
    `<circle cx="52" cy="22" r="7" fill="#d4f0ff" stroke="${INK}" stroke-width="2.5"/><circle cx="62" cy="6" r="4.5" fill="#d4f0ff" stroke="${INK}" stroke-width="2"/>` +
    (angry ? steam(-48, -84) + steam(52, -76) : '')
  );
}

function ghost(angry: boolean): string {
  const id = angry ? 'bgh-a' : 'bgh-c';
  const [base, dark] = angry ? ['#a98de6', '#8164c8'] : ['#efeaff', '#cbc0ef'];
  const fill = base;
  const body = 'M-68 70V-8C-68 -62 -36 -88 0 -88S68 -62 68 -8V70L52 56L36 74L18 58L0 76L-18 58L-36 74L-52 56Z';
  // arms stretched out to the sides, zombie style
  const arm = `<path d="M-60 -4C-80 -10 -96 -2 -102 10C-104 18 -98 22 -92 18C-92 26 -84 28 -80 22C-76 26 -68 24 -66 16C-62 12 -60 8 -60 -4Z" fill="${fill}" stroke="${INK}" stroke-width="6" stroke-linejoin="round"/>`;
  const face = angry
    ? eye({ x: -24, y: -24, rx: 16, ry: 15, look: [3, 3], pupil: 5, sclera: INK, pupilFill: '#ff4f6d' }) +
      eye({ x: 24, y: -24, rx: 16, ry: 15, look: [-3, 3], pupil: 5, sclera: INK, pupilFill: '#ff4f6d' }) +
      brow(-46, -48, -10, -36, 9) +
      brow(46, -48, 10, -36, 9) +
      `<path d="M-30 8Q0 0 30 8Q28 56 0 60Q-28 56 -30 8Z" fill="#2b1b47"/>` +
      teeth(-30, 8, 0, 0, 30, 8, 7, 10) +
      teeth(-20, 52, 0, 66, 20, 52, 4, 8, -1) +
      `<path d="M-30 8Q0 0 30 8Q28 56 0 60Q-28 56 -30 8Z" fill="none" stroke="${INK}" stroke-width="5.5" stroke-linejoin="round"/>`
    : eye({ x: -24, y: -22, rx: 17, ry: 20, look: [-5, -2], pupil: 5, lid: [190, 352], lidFill: base }) +
      eye({ x: 22, y: -18, rx: 13, ry: 15, look: [4, 3], pupil: 4, lid: [186, 350], lidFill: base }) +
      `<path d="M-38 2Q-24 8 -10 2M10 2Q22 8 34 2" stroke="${dark}" stroke-width="4" fill="none" stroke-linecap="round"/>` +
      // slack jaw with buck teeth and a tongue
      `<path d="M-14 16Q2 11 18 16Q22 54 3 58Q-18 56 -14 16Z" fill="#3b2a5c" stroke="${INK}" stroke-width="5.5" stroke-linejoin="round"/>` +
      `<path d="M-8 46Q3 38 13 46Q11 55 3 56Q-6 55 -8 46Z" fill="#ff8fb1"/>` +
      `<rect x="-8" y="14" width="9" height="11" rx="2" fill="#fff" stroke="${INK}" stroke-width="2.5"/><rect x="2" y="14" width="9" height="9" rx="2" fill="#fff" stroke="${INK}" stroke-width="2.5"/>`;
  return (
    arm +
    mirror(arm) +
    toned(id, `<path d="${body}"/>`, base, dark, -9, -8) +
    `<path d="${body}" fill="none" stroke="${INK}" stroke-width="8" stroke-linejoin="round"/>` +
    shine(-44, -48, 11, 30, 30) +
    // a crown, a bit crooked
    `<g transform="rotate(${angry ? -8 : 14} 16 -92)"><path d="M-12 -84L-6 -110L6 -94L18 -114L30 -94L42 -108L44 -82Z" fill="#ffc43d" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/>` +
    `<circle cx="18" cy="-90" r="4" fill="#ff5d7a" stroke="${INK}" stroke-width="2"/><circle cx="2" cy="-89" r="3" fill="#6fe0c8" stroke="${INK}" stroke-width="2"/><circle cx="33" cy="-89" r="3" fill="#7cc4f5" stroke="${INK}" stroke-width="2"/></g>` +
    face
  );
}

function dragon(angry: boolean): string {
  const id = angry ? 'bdr-a' : 'bdr-c';
  const [base, dark] = angry ? ['#c4302f', '#8f1f26'] : ['#e04a35', '#b03427'];
  const horn = `<path d="M-50 -54C-70 -60 -90 -80 -88 -104C-76 -92 -52 -88 -26 -78Z" fill="#fff1d6" stroke="${INK}" stroke-width="6" stroke-linejoin="round"/><path d="M-62 -64l8 -9M-74 -76l7 -8" stroke="${INK}" stroke-width="3.5" stroke-linecap="round"/>`;
  const frill = `<path d="M-68 -14L-98 -26L-84 -6L-102 6L-80 12L-94 28L-66 22Z" fill="#ffb347" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/>`;
  const glow = angry ? '#fff3a0' : '#ffd23f';
  const crack = (d: string) =>
    `<path d="${d}" stroke="${dark}" stroke-width="${angry ? 10 : 8}" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="${d}" stroke="${glow}" stroke-width="${angry ? 4.5 : 3.5}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
  // shield-shaped head: wide cheeks, narrower chin
  const head = 'M-70 -20C-72 -64 -38 -86 0 -86C38 -86 72 -64 70 -20C70 2 80 14 76 30C70 54 42 68 0 70C-42 68 -70 54 -76 30C-80 14 -70 2 -70 -20Z';
  const jaw = 'M-62 30Q0 48 62 30C56 54 32 68 0 70C-32 68 -56 54 -62 30Z';
  const flame = (x: number, y: number, s: number) =>
    `<path transform="translate(${x} ${y}) scale(${s} 1) rotate(-30)" d="M0 0C-12 -6 -16 -20 -10 -30C-8 -22 -2 -20 0 -24C2 -32 8 -36 14 -40C10 -28 18 -18 12 -6C9 -1 4 1 0 0Z" fill="#ffb347" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>`;
  // crocodile grin: interlocking teeth along the mouth line; wide open and fiery when angry
  const mouth = angry
    ? `<path d="M-62 26Q0 42 62 26Q44 72 0 74Q-44 72 -62 26Z" fill="#ff9f43"/><ellipse cx="0" cy="56" rx="28" ry="12" fill="#ffd23f"/>` +
      teeth(-62, 26, 0, 42, 62, 26, 11, 9) +
      teeth(-40, 64, 0, 80, 40, 64, 6, 9, -1) +
      `<path d="M-62 26Q0 42 62 26Q44 72 0 74Q-44 72 -62 26Z" fill="none" stroke="${INK}" stroke-width="5.5" stroke-linejoin="round"/>` +
      flame(-64, 30, 1) +
      flame(64, 30, -1)
    : `<path d="${jaw}" fill="#ffb070"/>` +
      teeth(-58, 31, 0, 48, 58, 31, 9, 7) +
      teeth(-52, 33, 0, 49, 52, 33, 8, 7, -1) +
      `<path d="M-62 30Q0 48 62 30" stroke="${INK}" stroke-width="5.5" fill="none" stroke-linecap="round"/>` +
      `<path d="M-32 36L-27 52L-21 38ZM21 38L27 52L32 36Z" fill="#fff" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/>`;
  return (
    horn +
    mirror(horn) +
    frill +
    mirror(frill) +
    `<path d="M-16 -80L-8 -102L0 -82L8 -102L16 -80Z" fill="#ffb347" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/>` +
    toned(id, `<path d="${head}"/>`, base, dark, -8, -10) +
    `<path d="${head}" fill="none" stroke="${INK}" stroke-width="8"/>` +
    shine(-42, -58, 26, 10, -30) +
    crack('M-62 -28L-50 -20L-56 -8L-46 0') +
    crack('M58 -30L48 -18L56 -10') +
    crack('M10 -76L4 -64L12 -56') +
    `<path d="M-64 14q6 -6 12 0M-58 26q6 -6 12 0M52 14q6 -6 12 0M46 26q6 -6 12 0" stroke="${dark}" stroke-width="3.5" fill="none" stroke-linecap="round"/>` +
    eye({ x: -30, y: -32, rx: 16, ry: 14, look: [3, 2], pupil: angry ? 4.5 : 6, slit: true, lid: angry ? [206, 36] : [196, 12], lidFill: base, sclera: angry ? '#fff3a0' : '#ffd23f' }) +
    eye({ x: 30, y: -32, rx: 16, ry: 14, look: [-3, 2], pupil: angry ? 4.5 : 6, slit: true, lid: angry ? [144, 334] : [168, 344], lidFill: base, sclera: angry ? '#fff3a0' : '#ffd23f' }) +
    brow(-52, -54, -14, -46, 9) +
    brow(52, -54, 14, -46, 9) +
    // nostrils with little ridges on the snout
    `<path d="M-24 0Q-14 -8 -6 2M24 0Q14 -8 6 2" stroke="${dark}" stroke-width="4" fill="none" stroke-linecap="round"/>` +
    `<ellipse cx="-13" cy="8" rx="4" ry="6" fill="${INK}" transform="rotate(-28 -13 8)"/><ellipse cx="13" cy="8" rx="4" ry="6" fill="${INK}" transform="rotate(28 13 8)"/>` +
    mouth
  );
}

function robot(angry: boolean): string {
  const id = angry ? 'bro-a' : 'bro-c';
  const jawGap = angry ? 16 : 0;
  const [base, dark] = angry ? ['#c9bec4', '#9d8f98'] : ['#cfd6e1', '#a3adbf'];
  const [lens, iris] = angry ? ['#ff6b7a', '#c2304f'] : ['#6fe0c8', '#2fae96'];
  const light = angry ? '#ff4f6d' : '#ffd23f';
  const fill = base;
  const panel = `<rect x="-102" y="-38" width="22" height="54" rx="8" fill="${fill}" stroke="${INK}" stroke-width="6"/><path d="M-96 -24h10M-96 -12h10M-96 0h10" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>`;
  const antenna = `<path d="M-91 -38L-96 -62" stroke="${INK}" stroke-width="5" stroke-linecap="round"/><circle cx="-96" cy="-66" r="7" fill="${light}" stroke="${INK}" stroke-width="4"/>`;
  // metal eyelid shaped like a frown: a V that dips lower when angry
  const shutter = `<path d="M${onEllipse(0, -14, 33, 33, angry ? 194 : 190)}A33 33 0 0 1 ${onEllipse(0, -14, 33, 33, angry ? 346 : 350)}L0 ${angry ? -4 : -14}Z" fill="${fill}" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/>`;
  const browPlate = `<path d="M-46 -56L-4 ${angry ? -40 : -46}L4 ${angry ? -40 : -46}L46 -56" stroke="${INK}" stroke-width="10" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
  const sparks = angry
    ? `<path d="M-74 -84l6 8l-8 2l8 8M74 -88l-6 8l8 2l-8 8" stroke="#ffd23f" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`
    : '';
  return (
    `<g transform="translate(0 4)">` +
    panel +
    mirror(panel) +
    antenna +
    mirror(antenna) +
    // the brain in a jar on top
    blob(['<circle cx="-16" cy="-80" r="13"/>', '<circle cx="2" cy="-88" r="13"/>', '<circle cx="19" cy="-80" r="12"/>', '<circle cx="0" cy="-74" r="14"/>'], angry ? '#ff7fae' : '#ff9fc8', 5) +
    `<path d="M-20 -82q5 -6 10 0M-4 -92q6 -5 10 1M10 -80q5 -5 9 1M-8 -74q6 4 12 0" stroke="#d6457a" stroke-width="3" fill="none" stroke-linecap="round"/>` +
    `<path d="M-42 -66A42 38 0 0 1 42 -66Z" fill="#bfe9ff" fill-opacity=".35" stroke="${INK}" stroke-width="6"/>` +
    shine(-24, -88, 7, 16, 35) +
    `<circle cx="28" cy="-74" r="2.5" fill="#fff"/><circle cx="32" cy="-82" r="1.8" fill="#fff"/>` +
    `<rect x="-48" y="-72" width="96" height="12" rx="6" fill="#8a95a8" stroke="${INK}" stroke-width="5"/>` +
    // jaw (drops open when angry), mouth gap with teeth
    `<rect x="-64" y="${36 + jawGap}" width="128" height="44" rx="16" fill="${dark}" stroke="${INK}" stroke-width="7"/>` +
    `<rect x="-54" y="36" width="108" height="${22 + jawGap}" fill="${angry ? '#ff6b3d' : INK}"/>` +
    // interlocking metal fangs
    teeth(-52, 40, 0, 40, 52, 40, 7, 12) +
    teeth(-46, 56 + jawGap, 0, 56 + jawGap, 46, 56 + jawGap, 6, 11, -1) +
    `<circle cx="-54" cy="${66 + jawGap}" r="4" fill="#8a95a8" stroke="${INK}" stroke-width="2"/><circle cx="54" cy="${66 + jawGap}" r="4" fill="#8a95a8" stroke="${INK}" stroke-width="2"/>` +
    // head
    toned(id, '<rect x="-84" y="-62" width="168" height="104" rx="28"/>', base, dark, -8, -10) +
    `<rect x="-84" y="-62" width="168" height="104" rx="28" fill="none" stroke="${INK}" stroke-width="8"/>` +
    shine(-56, -42, 28, 10, -20) +
    `<path d="M48 -52L56 -42L50 -34" stroke="${INK}" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>` +
    [
      [-70, -48],
      [70, -48],
      [-70, 28],
      [70, 28],
    ]
      .map(([x, y]) => `<circle cx="${x}" cy="${y}" r="4.5" fill="#8a95a8" stroke="${INK}" stroke-width="2.5"/>`)
      .join('') +
    // the big eye
    `<circle cx="0" cy="-14" r="34" fill="${INK}"/>` +
    `<circle cx="0" cy="-14" r="26" fill="${lens}"/><circle cx="0" cy="-10" r="16" fill="${iris}"/>` +
    `<circle cx="0" cy="${angry ? 0 : -6}" r="${angry ? 6 : 8}" fill="${INK}"/><circle cx="-12" cy="-2" r="4" fill="#fff"/>` +
    shutter +
    browPlate +
    `<circle cx="-58" cy="12" r="6" fill="${light}" stroke="${INK}" stroke-width="3"/><circle cx="58" cy="12" r="6" fill="${light}" stroke="${INK}" stroke-width="3"/>` +
    sparks +
    `</g>`
  );
}

const ART: Record<BossId, (angry: boolean) => string> = { cloud, crab, ghost, dragon, robot };

/** The boss drawing in BOSS_BOX; `angry` = enraged look (below half HP). */
export function bossSvg(id: BossId, angry: boolean): string {
  return ART[id](angry);
}
