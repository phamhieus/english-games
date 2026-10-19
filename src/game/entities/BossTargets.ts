import { THEME } from '@/game/config/theme';
import { Balloon } from './Balloon';

/**
 * Word targets of a boss battle. Both reuse Balloon's word label, typing highlight and
 * target ring; only the body and the movement differ.
 */

/** A word bullet fired by the boss: flies from the boss's mouth to the player's cannon. */
export class BossBullet extends Balloon {
  private fromX = 0;
  private fromY = 0;
  private toX = 0;
  private toY = 0;
  private readonly sway = Math.random() * Math.PI * 2;

  /** Sets the flight path (call before the first `place`). */
  aim(fromX: number, fromY: number, toX: number, toY: number): this {
    this.fromX = fromX;
    this.fromY = fromY;
    this.toX = toX;
    this.toY = toY;
    return this;
  }

  protected override drawBody(): void {
    const g = this.shape;
    const w = this.bodyWidth;
    const h = this.bodyHeight * 0.78;
    const r = h / 2;
    g.clear();
    // comet tail behind the bullet (it flies downwards, so the tail points up)
    g.fillStyle(this.color.glow, 0.55);
    g.fillTriangle(-w * 0.32, -h / 2 + 4, w * 0.32, -h / 2 + 4, 0, -h / 2 - 46);
    g.fillStyle(this.color.fill, 0.65);
    g.fillTriangle(-w * 0.18, -h / 2 + 4, w * 0.18, -h / 2 + 4, 0, -h / 2 - 28);
    // hard shadow + body
    g.fillStyle(THEME.inkHex, 1);
    g.fillRoundedRect(-w / 2, -h / 2 + 4, w, h, r);
    g.fillStyle(this.color.fill, 1);
    g.fillRoundedRect(-w / 2, -h / 2, w, h, r);
    g.lineStyle(3, THEME.inkHex, 1);
    g.strokeRoundedRect(-w / 2, -h / 2, w, h, r);
    g.fillStyle(0xffffff, 0.55);
    g.fillRoundedRect(-w / 2 + 12, -h / 2 + 7, Math.min(26, w * 0.25), 6, 3);
  }

  override place(_fieldWidth: number, _dangerY: number, clockMs: number, wobble: boolean): void {
    const p = this.progress;
    const sway = wobble ? Math.sin(clockMs / 500 + this.sway) * 8 * (1 - p) : 0;
    this.setPosition(this.fromX + (this.toX - this.fromX) * p + sway, this.fromY + (this.toY - this.fromY) * p);
  }
}

/** The word the boss carries: type it to attack. Positioned by the scene under the boss. */
export class BossWordPlate extends Balloon {
  protected override drawBody(): void {
    const g = this.shape;
    const w = this.bodyWidth + 16;
    const h = this.bodyHeight * 0.8;
    g.clear();
    g.fillStyle(THEME.inkHex, 1);
    g.fillRoundedRect(-w / 2, -h / 2 + 5, w, h, 14);
    g.fillStyle(0xffc43d, 1);
    g.fillRoundedRect(-w / 2, -h / 2, w, h, 14);
    g.lineStyle(3.5, THEME.inkHex, 1);
    g.strokeRoundedRect(-w / 2, -h / 2, w, h, 14);
    // little crossed-swords mark: "attack word"
    g.lineStyle(3, THEME.inkHex, 1);
    g.lineBetween(-w / 2 + 10, -h / 2 + 8, -w / 2 + 22, -h / 2 + 20);
    g.lineBetween(-w / 2 + 22, -h / 2 + 8, -w / 2 + 10, -h / 2 + 20);
  }

  /** Stays where the scene puts it. */
  override place(): void {}
}
