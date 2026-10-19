import Phaser from 'phaser';

/** A shiny bubble shot. Purely visual: scoring already happened when the answer was accepted. */
export class Projectile extends Phaser.GameObjects.Container {
  constructor(scene: Phaser.Scene, x: number, y: number, color: number) {
    super(scene, x, y);
    const g = scene.add.graphics();
    g.fillStyle(color, 0.35);
    g.fillCircle(0, 0, 15);
    g.fillStyle(color, 1);
    g.fillCircle(0, 0, 10);
    g.fillStyle(0xffffff, 0.85);
    g.fillCircle(-3, -4, 3.5);
    this.add(g);
    scene.add.existing(this);
  }

  /** Flies to (x, y) and calls `onHit` once on arrival. */
  fire(x: number, y: number, durationMs: number, onHit: () => void): void {
    if (durationMs <= 0) {
      this.destroy();
      onHit();
      return;
    }
    this.scene.tweens.add({
      targets: this,
      x,
      y,
      duration: durationMs,
      ease: 'Quad.easeIn',
      onComplete: () => {
        this.destroy();
        onHit();
      },
    });
  }
}
