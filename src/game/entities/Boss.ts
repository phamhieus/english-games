import Phaser from 'phaser';
import type { BossId } from '@/types';
import { BOSS_BOX, bossSvg } from '@/game/config/bosses';
import { svgDataUri, svgDocument } from '@/game/config/cannonArt';

const TEXTURE_SCALE = 3;
const key = (id: BossId, angry: boolean) => `boss:${id}:${angry ? 'angry' : 'calm'}`;

function loadTexture(scene: Phaser.Scene, id: BossId, angry: boolean): Promise<void> {
  const k = key(id, angry);
  if (scene.textures.exists(k)) return Promise.resolve();
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      if (!scene.textures.exists(k)) scene.textures.addImage(k, img);
      resolve();
    };
    img.onerror = () => resolve();
    img.src = svgDataUri(svgDocument(bossSvg(id, angry), BOSS_BOX, TEXTURE_SCALE));
  });
}

/** The boss character: swaps to an angry face when enraged, flashes when hit. */
export class Boss extends Phaser.GameObjects.Container {
  readonly bossId: BossId;
  private readonly art: Phaser.GameObjects.Image;
  private angry = false;
  private ready = false;

  constructor(scene: Phaser.Scene, id: BossId) {
    super(scene, 0, 0);
    this.bossId = id;
    this.art = scene.add.image(0, 0, '__DEFAULT');
    this.add(this.art);
    this.setVisible(false);
    scene.add.existing(this);
    void Promise.all([loadTexture(scene, id, false), loadTexture(scene, id, true)]).then(() => {
      if (!this.scene) return;
      this.ready = true;
      this.showFace();
      this.setVisible(true);
    });
  }

  private showFace(): void {
    if (!this.ready) return;
    this.art.setTexture(key(this.bossId, this.angry)).setDisplaySize(BOSS_BOX.w, BOSS_BOX.h);
  }

  setAngry(angry: boolean): void {
    if (angry === this.angry) return;
    this.angry = angry;
    this.showFace();
  }

  /** Where bullets come out, in scene coordinates: the boss's left (-1) or right (1) side, clear of its word plate. */
  launchPoint(side: -1 | 1): { x: number; y: number } {
    return { x: this.x + side * 95 * this.scaleX, y: this.y + 30 * this.scaleY };
  }

  /** Short white flash and a shake. */
  hitFlash(animate: boolean): void {
    this.art.setTintFill(0xffffff);
    this.scene.time.delayedCall(90, () => this.art.active && this.art.clearTint());
    if (!animate) return;
    this.scene.tweens.add({ targets: this.art, x: { from: -10, to: 0 }, duration: 240, ease: 'Elastic.easeOut' });
  }

  /** Little "inhale" before firing. */
  attackPulse(animate: boolean): void {
    if (!animate) return;
    this.scene.tweens.add({ targets: this.art, scaleX: this.art.scaleX * 1.08, scaleY: this.art.scaleY * 0.94, duration: 120, yoyo: true });
  }

  /** Spins away when defeated, then calls `done`. */
  defeat(animate: boolean, done: () => void): void {
    if (!animate) {
      this.setVisible(false);
      done();
      return;
    }
    this.scene.tweens.add({ targets: this, angle: 540, scale: 0.1, alpha: 0, duration: 900, ease: 'Back.easeIn', onComplete: done });
  }
}
