import Phaser from 'phaser';
import type { TargetCandidate } from '@/game/systems/TargetingSystem';
import { THEME, type BalloonColor } from '@/game/config/theme';

export interface BalloonInit {
  id: number;
  wordId: string;
  prompt: string;
  answer: string;
  fallMs: number;
  color: BalloonColor;
  spawnClock: number;
  /** Highlight typed characters on the prompt itself (only when prompt === answer). */
  inlineHighlight: boolean;
  /** Copy Typing: hide the word as `f _ _ _` (first letter of each word shown) and reveal letters as they are typed. */
  masked?: boolean;
}

const isLetter = (ch: string) => /[\p{L}\p{N}]/u.test(ch);
/** A word starts the text or follows a space or hyphen ("o'clock" is one word). */
const startsWord = (prev: string | undefined) => prev === undefined || /[\s-]/.test(prev);

/**
 * Letter-spaced `text`, or with `mask` its letters from index `from` on, where letters/digits
 * become "_" except the first letter of each word, kept as a hint (spaces and punctuation stay).
 */
function spaced(text: string, mask: boolean, from = 0): string {
  const chars = [...text];
  return chars
    .slice(from)
    .map((ch, i) => (mask && isLetter(ch) && !startsWord(chars[from + i - 1]) ? '_' : ch))
    .join(' ');
}

const MAX_TEXT_WIDTH = 240;
const BASE_FONT = 20;
const MIN_FONT = 13;

/**
 * A falling word balloon. Position is stored as normalized progress (0 → spawn,
 * 1 → touches danger line) plus a horizontal fraction, so the layout survives
 * viewport resizes (e.g. the mobile keyboard opening).
 */
export class Balloon extends Phaser.GameObjects.Container implements TargetCandidate {
  readonly id: number;
  readonly wordId: string;
  readonly prompt: string;
  readonly answer: string;
  readonly fallMs: number;
  readonly color: BalloonColor;
  /** Game-clock time the balloon became visible (response times are measured from here). */
  spawnClock: number;
  readonly bodyWidth: number;
  readonly bodyHeight: number;
  progress = 0;
  xFrac = 0.5;
  claimed = false;
  hadMistake = false;

  private readonly inlineHighlight: boolean;
  private readonly masked: boolean;
  protected readonly shape: Phaser.GameObjects.Graphics;
  private readonly ring: Phaser.GameObjects.Graphics;
  private readonly bar: Phaser.GameObjects.Graphics;
  private readonly typedText: Phaser.GameObjects.Text;
  private readonly restText: Phaser.GameObjects.Text;
  private readonly fontSize: number;
  private matched = -1;
  private targeted = false;
  private readonly wobbleSeed = Math.random() * Math.PI * 2;

  constructor(scene: Phaser.Scene, init: BalloonInit) {
    super(scene, 0, -200);
    this.id = init.id;
    this.wordId = init.wordId;
    this.prompt = init.prompt;
    this.answer = init.answer;
    this.fallMs = init.fallMs;
    this.color = init.color;
    this.spawnClock = init.spawnClock;
    this.inlineHighlight = init.inlineHighlight;
    this.masked = !!init.masked;

    const style: Phaser.Types.GameObjects.Text.TextStyle = {
      fontFamily: THEME.font,
      fontSize: `${BASE_FONT}px`,
      fontStyle: '600',
      color: THEME.ink,
      resolution: Math.min(3, window.devicePixelRatio || 1),
    };
    this.typedText = scene.add.text(0, 0, '', { ...style, color: THEME.typed });
    this.restText = scene.add.text(0, 0, this.masked ? spaced(init.prompt, true) : init.prompt, style);
    // Shrink the font for long phrases so balloons stay a sensible size.
    let size = BASE_FONT;
    while (this.restText.width > MAX_TEXT_WIDTH && size > MIN_FONT) {
      size -= 1;
      this.restText.setFontSize(size);
    }
    this.typedText.setFontSize(size);
    this.fontSize = size;
    let textW = Math.min(this.restText.width, MAX_TEXT_WIDTH + 40);
    if (this.masked) {
      // Revealed letters can be wider than "_": size the balloon for the widest state.
      const hidden = this.restText.text;
      this.restText.setText(spaced(init.prompt, false));
      textW = Math.max(textW, Math.min(this.restText.width, MAX_TEXT_WIDTH + 40));
      this.restText.setText(hidden);
    }

    this.bodyHeight = 74;
    this.bodyWidth = Math.max(84, textW + 44);

    this.shape = scene.add.graphics();
    this.ring = scene.add.graphics();
    this.bar = scene.add.graphics();
    this.drawBody();
    this.add([this.ring, this.shape, this.bar, this.typedText, this.restText]);
    this.layoutText();
    scene.add.existing(this);
    this.setSize(this.bodyWidth, this.bodyHeight);
  }

  /** Draws the body; subclasses (boss bullets, the boss's word plate) override it. */
  protected drawBody(): void {
    const g = this.shape;
    const w = this.bodyWidth;
    const h = this.bodyHeight;
    const r = Math.min(h / 2, w / 2);
    g.clear();
    // string
    g.lineStyle(2, THEME.inkHex, 1);
    g.beginPath();
    g.moveTo(0, h / 2 + 6);
    g.lineTo(-4, h / 2 + 16);
    g.lineTo(3, h / 2 + 26);
    g.lineTo(-2, h / 2 + 36);
    g.strokePath();
    // hard offset shadow
    g.fillStyle(THEME.inkHex, 1);
    g.fillRoundedRect(-w / 2, -h / 2 + 4, w, h, r);
    // body
    g.fillStyle(this.color.fill, 1);
    g.fillRoundedRect(-w / 2, -h / 2, w, h, r);
    g.lineStyle(3, THEME.inkHex, 1);
    g.strokeRoundedRect(-w / 2, -h / 2, w, h, r);
    // knot
    g.fillStyle(this.color.shade, 1);
    g.fillTriangle(-6, h / 2 + 9, 6, h / 2 + 9, 0, h / 2 - 1);
    g.lineStyle(2, THEME.inkHex, 1);
    g.strokeTriangle(-6, h / 2 + 9, 6, h / 2 + 9, 0, h / 2 - 1);
    // flat highlight stripe
    g.fillStyle(0xffffff, 0.6);
    g.fillRoundedRect(-w / 2 + 12, -h / 2 + 10, Math.min(30, w * 0.28), 7, 3);
  }

  private drawRing(): void {
    const g = this.ring;
    g.clear();
    if (!this.targeted) return;
    const w = this.bodyWidth + 12;
    const h = this.bodyHeight + 12;
    g.lineStyle(4, 0xffc43d, 1);
    g.strokeRoundedRect(-w / 2, -h / 2, w, h, Math.min(h / 2, w / 2));
  }

  private drawBar(): void {
    const g = this.bar;
    g.clear();
    if (this.matched <= 0 || this.inlineHighlight) return;
    const total = this.answer.trim().length || 1;
    const bw = Math.min(this.bodyWidth - 30, 120);
    const y = this.fontSize / 2 + 8;
    g.fillStyle(0xffffff, 1);
    g.fillRoundedRect(-bw / 2, y, bw, 6, 3);
    g.fillStyle(0xc2304f, 1);
    g.fillRoundedRect(-bw / 2, y, Math.max(6, (bw * Math.min(this.matched, total)) / total), 6, 3);
  }

  private layoutText(): void {
    const tw = this.typedText.text ? this.typedText.width : 0;
    const total = tw + this.restText.width;
    const left = -total / 2;
    this.typedText.setPosition(left, -this.restText.height / 2 - 2);
    this.restText.setPosition(left + tw, -this.restText.height / 2 - 2);
  }

  /** Updates typing feedback. `matched` = number of matching leading chars. */
  setTyping(matched: number, targeted: boolean): void {
    if (matched === this.matched && targeted === this.targeted) return;
    this.matched = matched;
    this.targeted = targeted;
    if (this.masked) {
      const n = Math.min(matched, this.prompt.length);
      this.typedText.setText(spaced(this.prompt.slice(0, n), false) + (n > 0 && n < this.prompt.length ? ' ' : ''));
      this.restText.setText(spaced(this.prompt, true, n));
      this.layoutText();
    } else if (this.inlineHighlight) {
      const n = Math.min(matched, this.prompt.length);
      this.typedText.setText(this.prompt.slice(0, n));
      this.restText.setText(this.prompt.slice(n));
      this.layoutText();
    }
    this.drawRing();
    this.drawBar();
  }

  /** Recomputes on-screen position from progress. */
  place(fieldWidth: number, dangerY: number, clockMs: number, wobble: boolean): void {
    const half = (this.bodyHeight * this.scaleY) / 2;
    const startY = -half - 4;
    const endY = dangerY - half - 4;
    const sway = wobble ? Math.sin(clockMs / 700 + this.wobbleSeed) * 6 : 0;
    this.setPosition(this.xFrac * fieldWidth + sway, startY + this.progress * (endY - startY));
    this.setRotation(wobble ? Math.sin(clockMs / 900 + this.wobbleSeed) * 0.035 : 0);
  }
}
