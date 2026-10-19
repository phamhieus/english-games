import Phaser from 'phaser';
import { THEME } from '@/game/config/theme';

/** Generates tiny particle textures and waits (briefly) for the game font. */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('boot');
  }

  create(): void {
    const g = this.make.graphics({ x: 0, y: 0 }, false);
    g.fillStyle(0xffffff, 1);
    g.fillCircle(8, 8, 8);
    g.generateTexture('dot', 16, 16);
    g.clear();
    // little star / sparkle
    g.fillStyle(0xffffff, 1);
    g.fillPoints(
      Array.from({ length: 10 }, (_, i) => {
        const r = i % 2 === 0 ? 10 : 4;
        const a = (Math.PI / 5) * i - Math.PI / 2;
        return new Phaser.Math.Vector2(10 + Math.cos(a) * r, 10 + Math.sin(a) * r);
      }),
      true,
    );
    g.generateTexture('star', 20, 20);
    g.destroy();

    const bridge = this.registry.get('bridge') as unknown;
    const fontReady =
      typeof document !== 'undefined' && document.fonts
        ? Promise.race([
            document.fonts.load(`600 20px ${THEME.font}`),
            new Promise((resolve) => setTimeout(resolve, 1200)),
          ])
        : Promise.resolve();
    void fontReady
      .catch(() => undefined)
      .then(() => {
        if (this.sys.isActive()) this.scene.start('game', { bridge });
      });
  }
}
