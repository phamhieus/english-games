/** Soft pastel palette shared by Phaser entities. Text on balloons is dark for contrast. */
export const BALLOON_COLORS = [
  { name: 'blue', fill: 0x8fc8ff, shade: 0x5fa6ec, glow: 0xd2e9ff },
  { name: 'purple', fill: 0xc9aaff, shade: 0x9d7ae8, glow: 0xebdfff },
  { name: 'orange', fill: 0xffc48c, shade: 0xf39a55, glow: 0xffe6cc },
  { name: 'cyan', fill: 0x8eeadf, shade: 0x4fc7b9, glow: 0xd3f8f3 },
  { name: 'pink', fill: 0xffb0d3, shade: 0xf27fb0, glow: 0xffdcec },
] as const;

export type BalloonColor = (typeof BALLOON_COLORS)[number];

export const THEME = {
  font: '"Fredoka", "Baloo 2", "Nunito", system-ui, sans-serif',
  ink: '#2d2a4a',
  inkHex: 0x2d2a4a,
  typed: '#e2457a',
  danger: 0xff7a93,
  white: 0xffffff,
  cannonBody: 0xfff6fb,
  cannonAccent: 0xff9ec7,
  cannonBarrel: 0x9d8cf0,
};
