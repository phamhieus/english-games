import Phaser from 'phaser';
import type { CannonSkinId } from '@/types';
import { effectsOf, RAINBOW, skinById, THEME, type CannonSkin } from '@/game/config/theme';
import {
  BARREL_BOX,
  BARREL_LENGTH,
  BARREL_PIVOT_Y,
  BODY_BOX,
  FACE_BOX,
  SHOT_BOX,
  shotSvg,
  barrelSvg,
  bodySvg,
  faceSvg,
  svgDataUri,
  svgDocument,
  type ArtBox,
} from '@/game/config/cannonArt';

/** Textures are rasterised at this multiple of their drawn size so they stay crisp. */
const TEXTURE_SCALE = 3;

type Part = 'barrel' | 'body' | 'face' | 'face-happy' | 'shot';

const PARTS: Record<Part, { box: ArtBox; svg: (s: CannonSkin) => string }> = {
  barrel: { box: BARREL_BOX, svg: barrelSvg },
  body: { box: BODY_BOX, svg: bodySvg },
  face: { box: FACE_BOX, svg: (s) => faceSvg(s, false) },
  'face-happy': { box: FACE_BOX, svg: (s) => faceSvg(s, true) },
  shot: { box: SHOT_BOX, svg: shotSvg },
};

export const textureKey = (skin: CannonSkin, part: Part) => `cannon:${skin.id}:${part}`;

/** Rasterises a skin's SVG parts into Phaser textures (cached for the whole game). */
function loadSkinTextures(scene: Phaser.Scene, skin: CannonSkin): Promise<void> {
  const jobs = (Object.keys(PARTS) as Part[]).map((part) => {
    const key = textureKey(skin, part);
    if (scene.textures.exists(key)) return Promise.resolve();
    const { box, svg } = PARTS[part];
    return new Promise<void>((resolve) => {
      const img = new Image();
      img.onload = () => {
        if (!scene.textures.exists(key)) scene.textures.addImage(key, img);
        resolve();
      };
      img.onerror = () => resolve();
      img.src = svgDataUri(svgDocument(svg(skin), box, TEXTURE_SCALE));
    });
  });
  return Promise.all(jobs).then(() => undefined);
}

/** Places an image so its art box lines up with cannon space. */
function fit(img: Phaser.GameObjects.Image, key: string, box: ArtBox): void {
  img.setTexture(key).setDisplaySize(box.w, box.h).setOrigin(-box.x / box.w, -box.y / box.h);
}

/** A friendly cannon (any skin) that turns toward its target and chomps when it fires. */
export class Cannon extends Phaser.GameObjects.Container {
  static readonly BARREL_LENGTH = BARREL_LENGTH;
  private readonly barrel: Phaser.GameObjects.Container;
  private readonly barrelImg: Phaser.GameObjects.Image;
  private readonly bodyImg: Phaser.GameObjects.Image;
  private readonly faceImg: Phaser.GameObjects.Image;
  private readonly happyImg: Phaser.GameObjects.Image;
  private readonly muzzleGfx: Phaser.GameObjects.Graphics;
  private mouthTween?: Phaser.Tweens.Tween;
  /** 0 = closed, ~0.35 = "ooh" while aiming, 1 = wide open when firing. */
  private mouth = { open: 0 };
  private turnTween?: Phaser.Tweens.Tween;
  private skin: CannonSkin;
  /** Rarity effects behind the cannon (aura, orbiting stars). */
  private readonly fx: Phaser.GameObjects.Container;
  private fxTweens: Phaser.Tweens.Tween[] = [];
  private animateFx = true;

  /** The skin currently shown (its shot style is used for projectiles). */
  get currentSkin(): CannonSkin {
    return this.skin;
  }

  constructor(scene: Phaser.Scene, skinId?: CannonSkinId) {
    super(scene, 0, 0);
    this.skin = skinById(skinId);
    this.barrelImg = scene.add.image(0, 0, '__DEFAULT');
    this.muzzleGfx = scene.add.graphics();
    this.barrel = scene.add.container(0, BARREL_PIVOT_Y, [this.barrelImg, this.muzzleGfx]);
    this.bodyImg = scene.add.image(0, 0, '__DEFAULT');
    this.faceImg = scene.add.image(0, 0, '__DEFAULT');
    this.happyImg = scene.add.image(0, 0, '__DEFAULT').setVisible(false);
    this.fx = scene.add.container(0, 6);
    this.add([this.fx, this.barrel, this.bodyImg, this.faceImg, this.happyImg]);
    // Hidden until the first skin's textures are ready (a frame or two).
    this.setVisible(false);
    this.drawMuzzle(0);
    void this.applySkin(this.skin);
    scene.add.existing(this);
  }

  /** Switches the look without disturbing the barrel's aim. */
  setSkin(id: CannonSkinId | undefined): void {
    const next = skinById(id);
    if (next.id === this.skin.id) return;
    this.skin = next;
    void this.applySkin(next);
  }

  private async applySkin(skin: CannonSkin): Promise<void> {
    await loadSkinTextures(this.scene, skin);
    // Ignore if the skin changed again meanwhile, or the scene shut down.
    if (skin !== this.skin || !this.scene) return;
    fit(this.barrelImg, textureKey(skin, 'barrel'), BARREL_BOX);
    fit(this.bodyImg, textureKey(skin, 'body'), BODY_BOX);
    fit(this.faceImg, textureKey(skin, 'face'), FACE_BOX);
    fit(this.happyImg, textureKey(skin, 'face-happy'), FACE_BOX);
    this.drawMuzzle(this.mouth.open);
    this.buildEffects();
    this.setVisible(true);
  }

  /** Turns looping effect animations on/off (reduced motion). */
  setAnimate(animate: boolean): void {
    if (animate === this.animateFx) return;
    this.animateFx = animate;
    this.buildEffects();
  }

  get barrelRotation(): number {
    return this.barrel.rotation;
  }

  private buildEffects(): void {
    this.fxTweens.forEach((t) => t.remove());
    this.fxTweens = [];
    this.fx.removeAll(true);
    const fx = effectsOf(this.skin);
    const scene = this.scene;
    if (fx.aura) {
      const glow = scene.add.circle(0, 0, 64, this.skin.accent, 0.28);
      const ring = scene.add.circle(0, 0, 56).setStrokeStyle(4, this.skin.accent, 0.75);
      this.fx.add([glow, ring]);
      if (this.animateFx) {
        this.fxTweens.push(scene.tweens.add({ targets: [glow, ring], scale: 1.12, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' }));
      }
    }
    if (fx.orbit) {
      const orbit = scene.add.container(0, 0);
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2;
        orbit.add(scene.add.image(Math.cos(a) * 68, Math.sin(a) * 68, 'star').setTint(RAINBOW[i % RAINBOW.length]!).setScale(1.1));
      }
      this.fx.add(orbit);
      if (this.animateFx) this.fxTweens.push(scene.tweens.add({ targets: orbit, rotation: Math.PI * 2, duration: 3600, repeat: -1 }));
    }
  }

  /** Flared muzzle lip whose dark mouth (and tongue) opens with `open` in 0..1. */
  private drawMuzzle(open: number): void {
    const g = this.muzzleGfx;
    const INK = THEME.inkHex;
    const lipH = 16 + open * 6;
    const top = -BARREL_LENGTH - 6 - open * 5;
    g.clear();
    g.fillStyle(this.skin.trim, 1);
    g.fillRoundedRect(-21 - open * 2, top, 42 + open * 4, lipH, 6);
    g.lineStyle(3, INK, 1);
    g.strokeRoundedRect(-21 - open * 2, top, 42 + open * 4, lipH, 6);
    const mouthW = 22 + open * 12;
    const mouthH = 6 + open * 15;
    const cy = top + lipH / 2 + 1;
    g.fillStyle(INK, 1);
    g.fillEllipse(0, cy, mouthW, mouthH);
    if (open > 0.45) {
      g.fillStyle(0xff7a93, 1);
      g.fillEllipse(0, cy + mouthH * 0.22, mouthW * 0.55, mouthH * 0.42);
    }
  }

  private setMouth(open: number, animate: boolean, durationMs: number, onDone?: () => void): void {
    this.mouthTween?.stop();
    if (!animate || durationMs <= 0) {
      this.mouth.open = open;
      this.drawMuzzle(open);
      onDone?.();
      return;
    }
    this.mouthTween = this.scene.tweens.add({
      targets: this.mouth,
      open,
      duration: durationMs,
      ease: 'Quad.easeOut',
      onUpdate: () => this.drawMuzzle(this.mouth.open),
      onComplete: () => onDone?.(),
    });
  }

  private setHappy(happy: boolean): void {
    this.faceImg.setVisible(!happy);
    this.happyImg.setVisible(happy);
  }

  /** Muzzle position in world coordinates. */
  muzzle(): Phaser.Math.Vector2 {
    const angle = this.barrel.rotation - Math.PI / 2;
    const s = this.scale;
    return new Phaser.Math.Vector2(
      this.x + Math.cos(angle) * (BARREL_LENGTH + 2) * s,
      this.y + (BARREL_PIVOT_Y + Math.sin(angle) * (BARREL_LENGTH + 2)) * s,
    );
  }

  angleTo(x: number, y: number): number {
    const a = Phaser.Math.Angle.Between(this.x, this.y + BARREL_PIVOT_Y * this.scale, x, y) + Math.PI / 2;
    return Phaser.Math.Clamp(Phaser.Math.Angle.Wrap(a), -1.35, 1.35);
  }

  /** Relaxes the mouth when there is nothing to aim at. */
  relax(animate: boolean): void {
    if (this.mouth.open > 0 && this.mouth.open < 0.6) this.setMouth(0, animate, 160);
  }

  aimAt(x: number, y: number, animate: boolean): void {
    const target = this.angleTo(x, y);
    this.turnTween?.stop();
    if (this.mouth.open < 0.3) this.setMouth(0.35, animate, 120);
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
    this.setHappy(true);
    this.scene.time.delayedCall(260, () => this.setHappy(false));
    // chomp: snap wide open, then close back to a relaxed mouth
    this.setMouth(1, animate, 50, () => this.scene.time.delayedCall(animate ? 90 : 260, () => this.setMouth(0, animate, 220)));
    if (!animate) return;
    this.scene.tweens.add({ targets: this.barrel, scaleY: 0.86, duration: 60, yoyo: true, ease: 'Quad.easeOut' });
  }
}
