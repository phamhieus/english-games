import Phaser from 'phaser';
import { effectsOf, RAINBOW, rarityOf, THEME, type CannonSkin } from '@/game/config/theme';

/** Visual effects shared by the balloon and boss scenes. */

/** Burst out of the muzzle when firing: petals for flower skins, sparkles/confetti for the rest. */
export function muzzleBurst(scene: Phaser.Scene, skin: CannonSkin, x: number, y: number, barrelRotation: number, animate: boolean): void {
  if (!animate) return;
  const rarity = rarityOf(skin);
  const fx = effectsOf(skin);
  const petals = skin.group === 'Flowers';
  const texture = petals ? 'petal' : skin.group === 'Fantasy' || rarity === 'legendary' ? 'star' : 'dot';
  const light = (c: number) => ((c >> 16) & 255) * 0.299 + ((c >> 8) & 255) * 0.587 + (c & 255) * 0.114 > 110;
  const palette = fx.rainbow
    ? [...RAINBOW]
    : petals
      ? [skin.accent, skin.bodyColor, 0xffffff, 0xffb7c5].filter(light)
      : [skin.accent, skin.trim, skin.barrel, 0xffffff].filter(light);
  const dir = Phaser.Math.RadToDeg(barrelRotation) - 90;
  // muzzle flash
  const flash = scene.add.circle(x, y, 16, fx.rainbow ? 0xffffff : skin.accent, 0.95).setDepth(6);
  scene.tweens.add({ targets: flash, scale: 2.6, alpha: 0, duration: 180, ease: 'Quad.easeOut', onComplete: () => flash.destroy() });
  const emitter = scene.add
    .particles(x, y, texture, {
      angle: { min: dir - (petals ? 50 : 38), max: dir + (petals ? 50 : 38) },
      speed: { min: petals ? 140 : 110, max: petals ? 360 : 320 },
      lifespan: { min: petals ? 800 : 550, max: petals ? 1400 : 950 },
      scale: { start: petals ? 1.8 : 0.85, end: petals ? 0.5 : 0.2 },
      alpha: { start: 1, end: 0 },
      rotate: { start: 0, end: petals ? 720 : 360 },
      gravityY: petals ? 80 : 240,
      tint: palette.length ? palette : [0xffffff],
      emitting: false,
    })
    .setDepth(6);
  const count = petals ? { common: 16, rare: 20, epic: 26, legendary: 32 } : { common: 10, rare: 14, epic: 18, legendary: 24 };
  emitter.explode(count[rarity]);
  scene.time.delayedCall(1500, () => emitter.destroy());
}

/** Extra firework burst on hit for epic and legendary skins. */
export function fireworks(scene: Phaser.Scene, skin: CannonSkin, x: number, y: number, animate: boolean): void {
  const fx = effectsOf(skin);
  if (!fx.fireworks || !animate) return;
  const burst = scene.add
    .particles(x, y, skin.group === 'Flowers' ? 'petal' : 'star', {
      speed: { min: 160, max: 380 },
      angle: { min: 0, max: 360 },
      lifespan: 900,
      scale: { start: 0.9, end: 0 },
      rotate: { start: 0, end: 360 },
      gravityY: 180,
      tint: fx.rainbow ? [...RAINBOW] : [skin.accent, skin.trim, 0xffffff],
      emitting: false,
    })
    .setDepth(6);
  burst.explode(fx.rainbow ? 26 : 18);
  scene.cameras.main.shake(140, fx.rainbow ? 0.006 : 0.004);
  scene.time.delayedCall(1000, () => burst.destroy());
  const ring = scene.add.graphics({ x, y }).setDepth(5);
  ring.lineStyle(6, fx.rainbow ? RAINBOW[Math.floor(Math.random() * RAINBOW.length)]! : skin.accent, 1);
  ring.strokeCircle(0, 0, 30);
  scene.tweens.add({ targets: ring, scale: 3.2, alpha: 0, duration: 520, onComplete: () => ring.destroy() });
}

export function floatText(scene: Phaser.Scene, x: number, y: number, text: string, color: string, animate: boolean, size = 22): void {
  const t = scene.add
    .text(x, y, text, {
      fontFamily: THEME.font,
      fontSize: `${size}px`,
      fontStyle: '700',
      color,
      stroke: '#ffffff',
      strokeThickness: 5,
      resolution: Math.min(3, window.devicePixelRatio || 1),
    })
    .setOrigin(0.5)
    .setDepth(7);
  if (!animate) {
    scene.time.delayedCall(600, () => t.destroy());
    return;
  }
  scene.tweens.add({ targets: t, y: y - 50, alpha: 0, duration: 900, ease: 'Quad.easeOut', onComplete: () => t.destroy() });
}
