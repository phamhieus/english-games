// Builds the app icons from the logo (the red balloon in the header, see FlatBalloon in
// src/components/common/Art.tsx): SVG sources + PNG sizes for PWA, Android (maskable),
// iOS and the favicon. Run with `npm run icons`. Output goes to public/icons/.
import { mkdirSync, writeFileSync } from 'node:fs';
import { Resvg } from '@resvg/resvg-js';

const OUT = new URL('../public/icons/', import.meta.url);
mkdirSync(OUT, { recursive: true });

const INK = '#1f2a44';
const BG = '#121829';

/** The logo balloon, drawn in its own 60×84 box. */
const LOGO = `
  <path d="M30 60c-4 6-1 12 3 22" stroke="${INK}" stroke-width="3" fill="none" stroke-linecap="round"/>
  <path d="M25 62h10l-5-6z" fill="#a52e20" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
  <ellipse cx="30" cy="31" rx="26" ry="28" fill="#d6402e" stroke="${INK}" stroke-width="3.5"/>
  <rect x="13" y="15" width="7" height="14" rx="3.5" fill="#fff" opacity=".65"/>`;

/** The logo centred on a 512 canvas, `height` px tall. */
const logoAt = (height) => {
  const s = height / 84;
  return `<g transform="translate(${256 - 30 * s} ${256 - 42 * s}) scale(${s})">${LOGO}</g>`;
};

const svg = (inner, rounded) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512"${rounded ? ' rx="112"' : ''} fill="${BG}"/>${inner}</svg>`;

/** Rounded icon (transparent corners): favicon and "any" PWA icon. */
const rounded = svg(logoAt(400), true);
/** Full-bleed square, logo inside the safe zone: Android maskable (the OS crops it). */
const maskable = svg(logoAt(300), false);
/** Full-bleed square for iOS (it rounds the corners itself). */
const apple = svg(logoAt(360), false);
/** Favicon: the logo fills more of the tiny square. */
const favicon = svg(logoAt(440), true);

const files = { 'icon.svg': rounded, 'icon-maskable.svg': maskable, 'favicon.svg': favicon };
for (const [name, content] of Object.entries(files)) writeFileSync(new URL(name, OUT), content);

const png = (content, size, name) => {
  const out = new Resvg(content, { fitTo: { mode: 'width', value: size } }).render().asPng();
  writeFileSync(new URL(name, OUT), out);
  console.log(`${name.padEnd(24)} ${size}x${size}  ${(out.byteLength / 1024).toFixed(1)} KB`);
};

png(rounded, 192, 'icon-192.png');
png(rounded, 512, 'icon-512.png');
png(rounded, 1024, 'icon-1024.png');
png(maskable, 512, 'icon-maskable-512.png');
png(apple, 180, 'apple-touch-icon.png');
png(favicon, 32, 'favicon-32.png');
