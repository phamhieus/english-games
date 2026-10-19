import Phaser from 'phaser';
import type { AppSettings, VocabularyItem } from '@/types';
import type { GameBridge, SceneHandle, SubmitResult } from '@/game/GameBridge';
import type { GameSession } from '@/game/systems/SessionSystem';
import { GAMEPLAY } from '@/game/config/gameConfig';
import { BALLOON_COLORS, THEME } from '@/game/config/theme';
import { Balloon } from '@/game/entities/Balloon';
import { Cannon } from '@/game/entities/Cannon';
import { Projectile } from '@/game/entities/Projectile';
import {
  attributeWrongAnswer,
  findExactTarget,
  findPrefixTarget,
  matchedPrefixLength,
} from '@/game/systems/TargetingSystem';
import { findSpawnX } from '@/game/systems/SpawnSystem';
import { normalizeAnswer } from '@/utils/text';
import { mathRng } from '@/utils/random';
import { speech, type SpeechLang } from '@/services/speech/speech';
import { sfx } from '@/services/audio/sfx';

interface PendingSpawn {
  word: VocabularyItem;
  at: number;
}

/**
 * Renders and animates the session. All rules (what spawns, scoring, learning
 * progress, when it ends) live in the Phaser-independent `GameSession`.
 * The scene's clock only advances while the game is running, so pauses and hidden
 * tabs never count against response times.
 */
export class GameScene extends Phaser.Scene implements SceneHandle {
  private bridge!: GameBridge;
  private session!: GameSession;
  private settings!: AppSettings;
  private balloons: Balloon[] = [];
  private cannon!: Cannon;
  private danger!: Phaser.GameObjects.Graphics;
  private dangerFlash!: Phaser.GameObjects.Graphics;
  private clock = 0;
  private sinceSpawn = 0;
  private pending: PendingSpawn | null = null;
  private waiting: Balloon | null = null;
  private typed = '';
  private paused = false;
  private ending = false;
  private nextId = 1;
  private colorIdx = Math.floor(Math.random() * BALLOON_COLORS.length);

  constructor() {
    super('game');
  }

  init(data: { bridge: GameBridge }): void {
    this.bridge = data.bridge;
    this.session = data.bridge.session;
    this.settings = data.bridge.settings;
    this.balloons = [];
    this.clock = 0;
    this.pending = null;
    this.waiting = null;
    this.typed = '';
    this.paused = false;
    this.ending = false;
    const params = this.session.difficulty.params();
    this.sinceSpawn = params.spawnIntervalMs - GAMEPLAY.firstSpawnDelayMs;
  }

  create(): void {
    this.danger = this.add.graphics().setDepth(1);
    this.dangerFlash = this.add.graphics().setDepth(1).setAlpha(0);
    this.cannon = new Cannon(this).setDepth(5);
    this.layout();
    this.scale.on(Phaser.Scale.Events.RESIZE, this.layout, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off(Phaser.Scale.Events.RESIZE, this.layout, this);
      this.bridge.detachScene(this);
    });
    this.bridge.attachScene(this);
    this.emitHud();
    this.emitActive();
    if (!this.session.isRunning) this.endSession();
  }

  // ── Layout ────────────────────────────────────────────────────────────────

  private get dangerY(): number {
    const h = this.scale.height;
    return h - (h < 420 ? 92 : 112);
  }

  private get animate(): boolean {
    return this.settings.animations && !this.settings.reducedMotion;
  }

  private layout(): void {
    const { width, height } = this.scale;
    this.cannon.setPosition(width / 2, height - (height < 420 ? 34 : 44));
    const y = this.dangerY;
    const g = this.danger;
    g.clear();
    g.fillStyle(THEME.danger, 0.08);
    g.fillRect(0, y, width, height - y);
    g.fillStyle(THEME.danger, 0.65);
    for (let x = 8; x < width; x += 22) g.fillRoundedRect(x, y - 2, 12, 4, 2);
    this.dangerFlash.clear();
    this.dangerFlash.fillStyle(THEME.danger, 0.35);
    this.dangerFlash.fillRect(0, y - 6, width, height - y + 6);
  }

  // ── Main loop ───────────────────────────────────────────────────────────────

  override update(_time: number, delta: number): void {
    if (this.paused || this.ending) return;
    const dt = Math.min(delta, 100);
    this.clock += dt;
    this.session.tick(dt);

    for (const b of [...this.balloons]) {
      if (!b.claimed) b.progress = Math.min(1, b.progress + dt / b.fallMs);
      if (b.progress >= 1 && !b.claimed) {
        this.handleMiss(b);
        if (this.ending) return;
      }
    }
    this.updateSpawning(dt);
    const w = this.scale.width;
    const dy = this.dangerY;
    for (const b of this.balloons) if (!b.claimed) b.place(w, dy, this.clock, this.animate);
  }

  private activeCount(): number {
    return this.balloons.filter((b) => !b.claimed).length + (this.pending ? 1 : 0) + (this.waiting ? 1 : 0);
  }

  private updateSpawning(dt: number): void {
    const params = this.session.difficulty.params();
    this.sinceSpawn += dt;

    if (this.pending && this.clock >= this.pending.at) {
      const word = this.pending.word;
      this.pending = null;
      this.waiting = this.createBalloon(word, params.fallMsFor(word.english.length));
    }
    if (this.waiting && this.tryPlace(this.waiting)) {
      this.waiting = null;
    }

    const empty = this.activeCount() === 0;
    const interval = empty ? Math.min(params.spawnIntervalMs, 700) : params.spawnIntervalMs;
    if (this.pending || this.waiting || this.sinceSpawn < interval || this.activeCount() >= params.maxBalloons) return;

    const activeIds = this.balloons.filter((b) => !b.claimed).map((b) => b.wordId);
    const word = this.session.nextWord(activeIds);
    if (!word) return;
    this.sinceSpawn = 0;
    const announced = this.announce(word);
    this.pending = { word, at: this.clock + (announced ? GAMEPLAY.announceLeadMs : 0) };
  }

  /** Reads the word aloud right before its balloon appears (optional, never blocking). */
  private announce(word: VocabularyItem): boolean {
    const s = this.settings;
    if (!s.speechEnabled || !s.announceBeforeSpawn) return false;
    let text = word.english;
    let lang: SpeechLang = 'en';
    if (this.session.config.mode !== 'copy') {
      if (s.recallAnnounce === 'off') return false;
      if (s.recallAnnounce === 'vietnamese') {
        text = word.vietnamese;
        lang = 'vi';
      }
    }
    return speech.speak(text, { lang, rate: s.speechRate, interrupt: true });
  }

  private createBalloon(word: VocabularyItem, fallMs: number): Balloon {
    const color = BALLOON_COLORS[this.colorIdx++ % BALLOON_COLORS.length] ?? BALLOON_COLORS[0];
    const prompt = this.session.prompt(word);
    const b = new Balloon(this, {
      id: this.nextId++,
      wordId: word.id,
      prompt,
      answer: word.english,
      fallMs,
      color,
      spawnClock: this.clock,
      inlineHighlight: prompt === word.english,
    });
    b.setDepth(3).setVisible(false);
    return b;
  }

  private tryPlace(b: Balloon): boolean {
    const w = this.scale.width;
    const occupied = this.balloons
      .filter((o) => !o.claimed && o.y < b.bodyHeight * 2.2 + 20)
      .map((o) => ({ x: o.x, y: o.y, width: o.bodyWidth, height: o.bodyHeight }));
    const x = findSpawnX(w, b.bodyWidth, occupied, mathRng);
    if (x === null) return false;
    b.xFrac = x / w;
    b.spawnClock = this.clock;
    b.place(w, this.dangerY, this.clock, this.animate);
    b.setVisible(true);
    if (this.animate) {
      b.setScale(0.4);
      this.tweens.add({ targets: b, scale: 1, duration: 260, ease: 'Back.easeOut' });
    }
    this.balloons.push(b);
    this.refreshTyping();
    this.emitActive();
    return true;
  }

  // ── Player input ────────────────────────────────────────────────────────────

  submit(text: string): SubmitResult {
    if (!this.session.isRunning || this.ending || this.paused) return { kind: 'ignored' };
    if (!normalizeAnswer(text)) return { kind: 'empty' };

    const target = findExactTarget(text, this.balloons);
    if (target) {
      const responseMs = this.clock - target.spawnClock;
      const delta = this.session.answerCorrect(target.wordId, responseMs, target.hadMistake);
      if (!delta) return { kind: 'ignored' };
      this.shoot(target, delta.points, delta.comboBonus > 0);
      if (this.settings.speechEnabled && this.settings.speakOnCorrect) {
        speech.speak(target.answer, { lang: 'en', rate: this.settings.speechRate });
      }
      this.typed = '';
      this.refreshTyping();
      this.emitHud();
      this.emitActive();
      if (!this.session.isRunning) this.endSession();
      return { kind: 'correct', points: delta.points, answer: target.answer };
    }

    const attributed = attributeWrongAnswer(text, this.balloons);
    const res = this.session.answerIncorrect(text, attributed?.wordId ?? null);
    if (!res) return { kind: 'ignored' };
    if (attributed && res.penalised) attributed.hadMistake = true;
    if (res.penalised) {
      sfx.play('wrong');
      this.bridge.emit('feedback', { kind: 'incorrect', text: res.points < 0 ? `${res.points}` : 'Try again' });
    }
    this.emitHud();
    return { kind: 'incorrect', penalised: res.penalised };
  }

  setTyped(text: string): void {
    this.typed = text;
    this.refreshTyping();
  }

  private highlightEnabled(): boolean {
    return this.session.config.mode === 'copy' ? this.settings.copyModeHighlight : this.settings.recallModeHighlight;
  }

  private refreshTyping(): void {
    const enabled = this.highlightEnabled();
    const target = enabled ? findPrefixTarget(this.typed, this.balloons) : null;
    for (const b of this.balloons) {
      if (b.claimed) continue;
      b.setTyping(enabled ? matchedPrefixLength(this.typed, b.answer) : 0, b === target);
    }
    if (target) this.cannon.aimAt(target.x, target.y, this.animate);
  }

  setPaused(paused: boolean): void {
    if (paused === this.paused) return;
    this.paused = paused;
    if (paused) {
      speech.cancel();
      this.scene.pause();
    } else {
      this.scene.resume();
    }
  }

  applySettings(settings: AppSettings): void {
    this.settings = settings;
    if (this.cannon) this.refreshTyping();
  }

  // ── Effects ─────────────────────────────────────────────────────────────────

  private shoot(target: Balloon, points: number, comboBonus: boolean): void {
    target.claimed = true;
    target.setTyping(0, false);
    this.cannon.snapTo(target.x, target.y);
    this.cannon.recoil(this.animate);
    sfx.play('shoot');
    const from = this.cannon.muzzle();
    const p = new Projectile(this, from.x, from.y, target.color.shade).setDepth(4);
    const duration = this.animate ? GAMEPLAY.projectileMs : 0;
    p.fire(target.x, target.y, duration, () => this.explode(target, points, comboBonus));
  }

  private explode(b: Balloon, points: number, comboBonus: boolean): void {
    this.removeBalloon(b);
    sfx.play('pop');
    const { x, y } = b;
    this.floatText(x, y - 10, `+${points}`, '#7a4fd6');
    if (comboBonus) {
      sfx.play('combo');
      const combo = this.session.scoring.snapshot.combo;
      this.floatText(x, y - 42, `Combo ×${combo}!`, '#e2457a', 26);
      this.bridge.emit('feedback', { kind: 'combo', text: `Combo ×${combo}!` });
    }
    if (!this.animate) {
      b.destroy();
      return;
    }
    const emitter = this.add.particles(x, y, 'dot', {
      speed: { min: 90, max: 280 },
      angle: { min: 0, max: 360 },
      lifespan: 650,
      scale: { start: 0.75, end: 0 },
      alpha: { start: 1, end: 0 },
      gravityY: 260,
      tint: [b.color.fill, b.color.glow, 0xffffff],
      emitting: false,
    });
    emitter.setDepth(6);
    emitter.explode(18);
    const stars = this.add.particles(x, y, 'star', {
      speed: { min: 60, max: 160 },
      lifespan: 700,
      scale: { start: 0.8, end: 0 },
      rotate: { min: 0, max: 360 },
      tint: [0xffe27a, 0xffffff],
      emitting: false,
    });
    stars.setDepth(6);
    stars.explode(6);
    const ring = this.add.graphics({ x, y }).setDepth(5);
    ring.lineStyle(5, b.color.glow, 1);
    ring.strokeCircle(0, 0, 24);
    this.tweens.add({ targets: ring, scale: 2.6, alpha: 0, duration: 380, onComplete: () => ring.destroy() });
    this.tweens.add({
      targets: b,
      scale: 1.25,
      alpha: 0,
      duration: 120,
      onComplete: () => b.destroy(),
    });
    this.time.delayedCall(900, () => {
      emitter.destroy();
      stars.destroy();
    });
  }

  private floatText(x: number, y: number, text: string, color: string, size = 22): void {
    const t = this.add
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
    if (!this.animate) {
      this.time.delayedCall(600, () => t.destroy());
      return;
    }
    this.tweens.add({ targets: t, y: y - 50, alpha: 0, duration: 900, ease: 'Quad.easeOut', onComplete: () => t.destroy() });
  }

  private handleMiss(b: Balloon): void {
    b.claimed = true;
    this.removeBalloon(b);
    const res = this.session.balloonMissed(b.wordId);
    sfx.play('miss');
    this.bridge.emit('feedback', { kind: 'missed', text: `Missed: ${b.answer}` });
    this.floatText(b.x, this.dangerY - 30, res && res.points < 0 ? `${res.points}` : 'Missed', '#e2457a');
    this.tweens.add({ targets: this.dangerFlash, alpha: { from: 1, to: 0 }, duration: 500 });
    if (this.animate) {
      this.tweens.add({ targets: b, scaleX: 1.3, scaleY: 0.4, alpha: 0, duration: 220, onComplete: () => b.destroy() });
      this.cameras.main.shake(140, 0.004);
    } else {
      b.destroy();
    }
    this.emitHud();
    this.emitActive();
    this.refreshTyping();
    if (!this.session.isRunning) this.endSession();
  }

  private removeBalloon(b: Balloon): void {
    this.balloons = this.balloons.filter((o) => o !== b);
  }

  private endSession(): void {
    if (this.ending) return;
    this.ending = true;
    this.pending = null;
    this.waiting?.destroy();
    this.waiting = null;
    speech.cancel();
    const state = this.session.runState;
    // Let the last projectile/explosion play out, then clear the field.
    this.time.delayedCall(650, () => {
      for (const b of this.balloons) {
        b.claimed = true;
        if (this.animate) this.tweens.add({ targets: b, alpha: 0, scale: 0.6, duration: 250, onComplete: () => b.destroy() });
        else b.destroy();
      }
      this.balloons = [];
      this.emitActive();
      sfx.play(state === 'game_over' ? 'gameover' : 'complete');
      this.time.delayedCall(450, () => this.bridge.emit('end', state));
    });
  }

  /** Called by React (Quit button) — ends the run immediately. */
  quit(): void {
    this.session.quit();
    if (this.paused) this.setPaused(false);
    this.endSession();
  }

  private emitHud(): void {
    this.bridge.emit('hud', this.bridge.hud());
  }

  private emitActive(): void {
    this.bridge.emit(
      'active',
      this.balloons.filter((b) => !b.claimed).map((b) => b.prompt),
    );
  }
}
