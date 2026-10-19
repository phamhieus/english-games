import Phaser from 'phaser';
import { THEME } from '@/game/config/theme';

/** A round, friendly bubble cannon that turns toward its target. */
export class Cannon extends Phaser.GameObjects.Container {
  private readonly barrel: Phaser.GameObjects.Container;
  private readonly face: Phaser.GameObjects.Graphics;
  private turnTween?: Phaser.Tweens.Tween;
  static readonly BARREL_LENGTH = 58;

  constructor(scene: Phaser.Scene) {
    super(scene, 0, 0);
    const barrelGfx = scene.add.graphics();
    barrelGfx.fillStyle(0x7b6ad8, 0.35);
    barrelGfx.fillRoundedRect(-15, -Cannon.BARREL_LENGTH + 3, 30, Cannon.BARREL_LENGTH, 14);
    barrelGfx.fillStyle(THEME.cannonBarrel, 1);
    barrelGfx.fillRoundedRect(-15, -Cannon.BARREL_LENGTH, 30, Cannon.BARREL_LENGTH, 14);
    barrelGfx.fillStyle(0xffffff, 0.35);
    barrelGfx.fillRoundedRect(-9, -Cannon.BARREL_LENGTH + 6, 6, Cannon.BARREL_LENGTH - 20, 3);
    barrelGfx.fillStyle(0xffe27a, 1);
    barrelGfx.fillRoundedRect(-17, -Cannon.BARREL_LENGTH - 2, 34, 12, 6);
    this.barrel = scene.add.container(0, -14, [barrelGfx]);

    const base = scene.add.graphics();
    base.fillStyle(0xd9c9f5, 0.6);
    base.fillEllipse(0, 30, 120, 22);
    base.fillStyle(THEME.cannonAccent, 1);
    base.fillCircle(0, 6, 38);
    base.fillStyle(THEME.cannonBody, 1);
    base.fillCircle(0, 4, 32);
    base.fillStyle(0xffffff, 0.9);
    base.fillEllipse(-12, -12, 16, 9);

    this.face = scene.add.graphics();
    this.drawFace(false);
    this.add([this.barrel, base, this.face]);
    scene.add.existing(this);
  }

  private drawFace(happy: boolean): void {
    const g = this.face;
    g.clear();
    g.fillStyle(THEME.inkHex, 1);
    if (happy) {
      g.lineStyle(3, THEME.inkHex, 1);
      g.beginPath();
      g.arc(-10, 6, 5, Math.PI * 1.1, Math.PI * 1.9);
      g.strokePath();
      g.beginPath();
      g.arc(10, 6, 5, Math.PI * 1.1, Math.PI * 1.9);
      g.strokePath();
    } else {
      g.fillCircle(-10, 4, 3.5);
      g.fillCircle(10, 4, 3.5);
    }
    g.fillStyle(0xff8fb5, 0.6);
    g.fillEllipse(-19, 13, 9, 5);
    g.fillEllipse(19, 13, 9, 5);
    g.lineStyle(2.5, THEME.inkHex, 1);
    g.beginPath();
    g.arc(0, 12, 5, 0.15 * Math.PI, 0.85 * Math.PI);
    g.strokePath();
  }

  /** Muzzle position in world coordinates. */
  muzzle(): Phaser.Math.Vector2 {
    const angle = this.barrel.rotation - Math.PI / 2;
    return new Phaser.Math.Vector2(
      this.x + Math.cos(angle) * (Cannon.BARREL_LENGTH + 2),
      this.y - 14 + Math.sin(angle) * (Cannon.BARREL_LENGTH + 2),
    );
  }

  angleTo(x: number, y: number): number {
    const a = Phaser.Math.Angle.Between(this.x, this.y - 14, x, y) + Math.PI / 2;
    return Phaser.Math.Clamp(Phaser.Math.Angle.Wrap(a), -1.35, 1.35);
  }

  aimAt(x: number, y: number, animate: boolean): void {
    const target = this.angleTo(x, y);
    this.turnTween?.stop();
    if (!animate) {
      this.barrel.setRotation(target);
      return;
    }
    this.turnTween = this.scene.tweens.add({ targets: this.barrel, rotation: target, duration: 90, ease: 'Quad.easeOut' });
  }

  /** Instantly points at a target (used when firing so the shot never waits on a tween). */
  snapTo(x: number, y: number): void {
    this.turnTween?.stop();
    this.barrel.setRotation(this.angleTo(x, y));
  }

  recoil(animate: boolean): void {
    this.drawFace(true);
    this.scene.time.delayedCall(260, () => this.drawFace(false));
    if (!animate) return;
    this.scene.tweens.add({ targets: this.barrel, scaleY: 0.86, duration: 60, yoyo: true, ease: 'Quad.easeOut' });
  }
}
