import Phaser from 'phaser';
import { effectsOf, RAINBOW, rarityOf, type CannonSkin } from '@/game/config/theme';
import { SHOT_BOX, SHOT_MOTION } from '@/game/config/cannonArt';
import { textureKey } from './Cannon';

/** Shots are drawn larger than the 32px art: bigger and punchier for rarer skins. */
const SIZE = { common: 1.4, rare: 1.55, epic: 1.7, legendary: 1.85 } as const;

/**
 * The skin's own shot (heart, shuriken, fireball…) with a coloured glow. Rarer skins get a
 * bigger shot, a sparkle trail and a pulsing (or rainbow) halo. Purely visual: scoring
 * already happened when the answer was accepted.
 */
export class Projectile extends Phaser.GameObjects.Container {
  private readonly motion: (typeof SHOT_MOTION)[keyof typeof SHOT_MOTION];
  private readonly skin: CannonSkin;
  private trail?: Phaser.GameObjects.Particles.ParticleEmitter;
  private pulse?: Phaser.Tweens.Tween;
  private readonly halo: Phaser.GameObjects.Arc;

  constructor(scene: Phaser.Scene, x: number, y: number, skin: CannonSkin) {
    super(scene, x, y);
    this.skin = skin;
    this.motion = SHOT_MOTION[skin.shot];
    const rarity = rarityOf(skin);
    const fx = effectsOf(skin);

    this.halo = scene.add.circle(0, 0, fx.aura ? 21 : 18, skin.accent, fx.aura ? 0.5 : 0.35);
    this.add(this.halo);
    const key = textureKey(skin, 'shot');
    if (scene.textures.exists(key)) {
      const b = SHOT_BOX;
      this.add(scene.add.image(0, 0, key).setDisplaySize(b.w, b.h).setOrigin(-b.x / b.w, -b.y / b.h));
    } else {
      // Textures still loading (first frames of a skin switch): plain bubble.
      const g = scene.add.graphics();
      g.fillStyle(0x9fe3ff, 1);
      g.fillCircle(0, 0, 10);
      g.lineStyle(3, 0x1f2a44, 1);
      g.strokeCircle(0, 0, 10);
      this.add(g);
    }
    this.setScale(SIZE[rarity]);
    scene.add.existing(this);
  }

  /** Flies to (x, y) and calls `onHit` once on arrival. */
  fire(x: number, y: number, durationMs: number, onHit: () => void): void {
    if (durationMs <= 0) {
      this.destroy();
      onHit();
      return;
    }
    const fx = effectsOf(this.skin);
    const petals = this.skin.group === 'Flowers';
    if (fx.trail || petals) {
      this.trail = this.scene.add
        .particles(0, 0, petals ? 'petal' : 'dot', {
          lifespan: petals ? 650 : 420,
          frequency: petals ? 18 : 14,
          speed: { min: 10, max: petals ? 70 : 40 },
          scale: { start: petals ? 1.1 : fx.rainbow ? 0.8 : 0.65, end: petals ? 0.3 : 0 },
          alpha: { start: 0.95, end: 0 },
          rotate: { min: 0, max: 360 },
          tint: fx.rainbow ? [...RAINBOW] : petals ? [this.skin.accent, 0xffb7c5, 0xffffff] : [this.skin.accent, this.skin.trim, 0xffffff],
        })
        .setDepth(3);
      this.trail.startFollow(this);
    }
    if (fx.aura) {
      this.pulse = this.scene.tweens.add({ targets: this.halo, scale: 1.35, duration: 120, yoyo: true, repeat: -1 });
    }
    if (fx.rainbow) {
      let i = 0;
      this.scene.time.addEvent({
        delay: 60,
        repeat: Math.ceil(durationMs / 60),
        callback: () => this.halo.active && this.halo.setFillStyle(RAINBOW[i++ % RAINBOW.length]!, 0.5),
      });
    }
    if (this.motion === 'aim') this.setRotation(Phaser.Math.Angle.Between(this.x, this.y, x, y) + Math.PI / 2);
    this.scene.tweens.add({
      targets: this,
      x,
      y,
      angle: this.motion === 'spin' ? 540 : this.angle,
      duration: durationMs,
      ease: 'Quad.easeIn',
      onComplete: () => {
        this.pulse?.remove();
        const trail = this.trail;
        if (trail) {
          // let the last sparkles fade out
          trail.stop();
          this.scene.time.delayedCall(450, () => trail.destroy());
        }
        this.destroy();
        onHit();
      },
    });
  }
}
