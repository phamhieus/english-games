import Phaser from 'phaser';
import type { AppSettings, StageId, VocabularyItem } from '@/types';
import type { GameBridge, SceneHandle, SubmitResult } from '@/game/GameBridge';
import type { GameSession } from '@/game/systems/SessionSystem';
import { GAMEPLAY } from '@/game/config/gameConfig';
import { bossById, type BossDef } from '@/game/config/bosses';
import { stageById } from '@/game/config/stages';
import { BossBattle, DOUBLE_BONUS, DOUBLE_DAMAGE } from '@/game/systems/BossSystem';
import { attributeWrongAnswer, findPrefixTarget, matchedPrefixLength } from '@/game/systems/TargetingSystem';
import { Boss } from '@/game/entities/Boss';
import { BossBullet, BossWordPlate } from '@/game/entities/BossTargets';
import type { Balloon } from '@/game/entities/Balloon';
import { Cannon } from '@/game/entities/Cannon';
import { Projectile } from '@/game/entities/Projectile';
import { typingKey } from '@/utils/text';
import { mathRng } from '@/utils/random';
import { speech } from '@/services/speech/speech';
import { sfx } from '@/services/audio/sfx';
import { fireworks, floatText, muzzleBurst } from './effects';

/**
 * Boss battle. The boss carries a word (type it to attack) and fires word bullets at the
 * cannon (type them to defend). A bullet with the boss's own word is a "double": one word
 * attacks and defends at once. Words, scoring, hearts and learning progress go through the
 * same GameSession as the balloon game; the boss itself is BossBattle.
 */
export class BossScene extends Phaser.Scene implements SceneHandle {
  private bridge!: GameBridge;
  private session!: GameSession;
  private settings!: AppSettings;
  private def!: BossDef;
  private battle!: BossBattle;
  private boss!: Boss;
  private cannon!: Cannon;
  private plate: BossWordPlate | null = null;
  private bullets: BossBullet[] = [];
  private danger!: Phaser.GameObjects.Graphics;
  private dangerFlash!: Phaser.GameObjects.Graphics;
  private stageId: StageId | undefined;
  private clock = 0;
  private typed = '';
  private paused = false;
  private ending = false;
  private nextId = 1;
  private plateDue: number | null = null;
  private side: -1 | 1 = 1;

  constructor() {
    super('boss');
  }

  init(data: { bridge: GameBridge }): void {
    this.bridge = data.bridge;
    this.session = data.bridge.session;
    this.settings = data.bridge.settings;
    this.def = bossById(this.session.config.boss);
    this.battle = new BossBattle(this.def);
    this.plate = null;
    this.bullets = [];
    this.clock = 0;
    this.typed = '';
    this.paused = false;
    this.ending = false;
    this.plateDue = null;
    this.side = 1;
  }

  // ── Size & layout (CSS pixels; the camera is zoomed by the render scale) ─────

  private get dpr(): number {
    return (this.registry.get('dpr') as number | undefined) ?? 1;
  }

  private get viewW(): number {
    return this.scale.width / this.dpr;
  }

  private get viewH(): number {
    return this.scale.height / this.dpr;
  }

  private get tier(): { cannon: number; cannonY: number; danger: number; word: number; boss: number } {
    const h = this.viewH;
    if (h < 360) return { cannon: 0.55, cannonY: 27, danger: 66, word: 0.74, boss: 0.42 };
    if (h < 520) return { cannon: 0.75, cannonY: 38, danger: 92, word: 0.86, boss: 0.56 };
    return { cannon: 0.88, cannonY: 50, danger: 112, word: 1, boss: 0.78 };
  }

  private get dangerY(): number {
    return this.viewH - this.tier.danger;
  }

  private get bossHomeY(): number {
    return 18 + (this.tier.boss * 220) / 2;
  }

  private get animate(): boolean {
    return this.settings.animations && !this.settings.reducedMotion;
  }

  create(): void {
    this.cameras.main.setOrigin(0, 0).setZoom(this.dpr);
    this.danger = this.add.graphics().setDepth(1);
    this.dangerFlash = this.add.graphics().setDepth(1).setAlpha(0);
    this.boss = new Boss(this, this.def.id).setDepth(2);
    this.cannon = new Cannon(this, this.settings.cannonSkin).setDepth(5);
    this.layout();
    this.scale.on(Phaser.Scale.Events.RESIZE, this.layout, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off(Phaser.Scale.Events.RESIZE, this.layout, this);
      this.bridge.detachScene(this);
    });
    this.bridge.attachScene(this);
    this.plateDue = 900; // first boss word shortly after the start
    this.emitHud();
    this.emitActive();
  }

  private layout(): void {
    const width = this.viewW;
    const height = this.viewH;
    const tier = this.tier;
    this.cannon.setScale(tier.cannon).setPosition(width / 2, height - tier.cannonY);
    this.boss.setScale(tier.boss);
    this.boss.y = this.bossHomeY;
    this.plate?.setScale(tier.word);
    for (const b of this.bullets) b.setScale(tier.word);
    const y = this.dangerY;
    const g = this.danger;
    g.clear();
    const danger = stageById(this.stageId ?? this.session.config.stage).danger;
    g.fillStyle(danger, 0.1);
    g.fillRect(0, y, width, height - y);
    g.fillStyle(danger, 0.85);
    for (let x = 8; x < width; x += 22) g.fillRoundedRect(x, y - 2, 12, 4, 2);
    this.dangerFlash.clear();
    this.dangerFlash.fillStyle(danger, 0.35);
    this.dangerFlash.fillRect(0, y - 6, width, height - y + 6);
  }

  // ── Main loop ───────────────────────────────────────────────────────────────

  override update(_time: number, delta: number): void {
    if (this.paused || this.ending) return;
    const dt = Math.min(delta, 100);
    this.clock += dt;
    this.session.tick(dt);

    // The boss drifts from side to side; its word plate follows.
    const range = Math.min(140, this.viewW * 0.28);
    this.boss.x = this.viewW / 2 + Math.sin(this.clock / 1900) * range;
    this.boss.y = this.bossHomeY + (this.animate ? Math.sin(this.clock / 700) * 5 : 0);
    if (this.plate) this.plate.setPosition(this.boss.x, this.boss.y + (220 * this.tier.boss) / 2 + 16);

    for (const b of [...this.bullets]) {
      if (b.claimed) continue;
      b.progress = Math.min(1, b.progress + dt / b.fallMs);
      b.place(this.viewW, this.dangerY, this.clock, this.animate);
      if (b.progress >= 1) {
        this.bulletLanded(b);
        if (this.ending) return;
      }
    }

    if (this.plateDue !== null && this.clock >= this.plateDue) {
      this.plateDue = null;
      this.showBossWord();
    }
    if (this.plate && !this.plate.claimed && this.battle.shouldSwapWord()) this.swapBossWord();

    const volley = this.battle.tick(dt, this.liveBullets().length);
    if (volley > 0) this.fire(volley);
  }

  private liveBullets(): BossBullet[] {
    return this.bullets.filter((b) => !b.claimed);
  }

  /** Everything the player can type right now. */
  private targets(): Balloon[] {
    const live: Balloon[] = this.liveBullets();
    if (this.plate && !this.plate.claimed) live.push(this.plate);
    return live;
  }

  private activeWordIds(): string[] {
    return this.targets().map((t) => t.wordId);
  }

  private makeTarget<T extends Balloon>(Kind: new (...args: ConstructorParameters<typeof Balloon>) => T, word: VocabularyItem, fallMs: number): T {
    const prompt = this.session.prompt(word);
    const t = new Kind(this, {
      id: this.nextId++,
      wordId: word.id,
      prompt,
      answer: word.english,
      fallMs,
      color: { name: 'boss', ...this.def.bullet, shade: this.def.bullet.fill },
      spawnClock: this.clock,
      inlineHighlight: prompt === word.english,
    });
    t.setScale(this.tier.word);
    return t;
  }

  private showBossWord(): void {
    if (this.ending || this.battle.defeated) return;
    const word = this.session.nextWord(this.liveBullets().map((b) => b.wordId));
    if (!word) {
      this.plateDue = this.clock + 800;
      return;
    }
    // Above the bullets: the attack word must always stay readable.
    this.plate = this.makeTarget(BossWordPlate, word, Number.MAX_SAFE_INTEGER).setDepth(3.5);
    this.plate.setPosition(this.boss.x, this.boss.y + (220 * this.tier.boss) / 2 + 16);
    if (this.animate) {
      const s = this.tier.word;
      this.plate.setScale(0.3 * s);
      this.tweens.add({ targets: this.plate, scale: s, duration: 240, ease: 'Back.easeOut' });
    }
    this.battle.wordSwapped();
    this.refreshTyping();
    this.emitActive();
  }

  /** Nobody typed the boss word for a while: show a different one (no penalty). */
  private swapBossWord(): void {
    const old = this.plate;
    if (!old) return;
    old.claimed = true;
    this.plate = null;
    if (this.animate) this.tweens.add({ targets: old, alpha: 0, y: old.y - 20, duration: 200, onComplete: () => old.destroy() });
    else old.destroy();
    this.showBossWord();
  }

  private fire(count: number): void {
    if (!this.plate && this.plateDue === null) this.plateDue = this.clock;
    this.boss.attackPulse(this.animate);
    for (let i = 0; i < count; i++) {
      // Alternate sides so bullets never start on top of the boss's word plate.
      this.side = this.side === 1 ? -1 : 1;
      const from = this.boss.launchPoint(this.side);
      // Sometimes the bullet carries the boss's own word: one answer, attack + defence.
      const plateWord = this.plate && !this.plate.claimed ? this.session.word(this.plate.wordId) : undefined;
      const doubleTaken = this.liveBullets().some((b) => b.wordId === plateWord?.id);
      let word: VocabularyItem | null | undefined =
        plateWord && !doubleTaken && this.battle.rollDouble(mathRng) ? plateWord : this.session.nextWord(this.activeWordIds());
      // Tiny word lists: fall back to the boss word rather than not firing at all.
      if (!word && plateWord && !doubleTaken) word = plateWord;
      if (!word) continue;
      const bullet = this.makeTarget(BossBullet, word, this.battle.bulletMs).setDepth(3);
      // Each bullet heads for its own side of the field, so volleys spread out.
      const targetX = this.viewW / 2 + this.side * (0.08 + mathRng.next() * 0.3) * this.viewW;
      // Keep the whole word on screen, even when the boss sways close to an edge.
      const half = Math.min(this.viewW / 2, (bullet.bodyWidth * bullet.scaleX) / 2 + 6);
      const startX = Phaser.Math.Clamp(from.x, half, this.viewW - half);
      bullet.aim(startX, from.y, Phaser.Math.Clamp(targetX, half, this.viewW - half), this.dangerY - (this.bulletHalfHeight(bullet) + 4));
      bullet.place(this.viewW, this.dangerY, this.clock, this.animate);
      if (this.animate) {
        bullet.setAlpha(0);
        this.tweens.add({ targets: bullet, alpha: 1, duration: 180 });
      }
      this.bullets.push(bullet);
    }
    sfx.play('shoot');
    this.refreshTyping();
    this.emitActive();
  }

  private bulletHalfHeight(b: BossBullet): number {
    return (b.bodyHeight * 0.78 * b.scaleY) / 2;
  }

  // ── Player input ────────────────────────────────────────────────────────────

  submit(text: string): SubmitResult {
    if (!this.session.isRunning || this.ending || this.paused) return { kind: 'ignored' };
    const typed = typingKey(text);
    if (!typed) return { kind: 'empty' };

    const hits = this.targets().filter((t) => typingKey(t.answer) === typed);
    if (hits.length === 0) {
      const attributed = attributeWrongAnswer(text, this.targets());
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

    const plateHit = hits.find((t): t is BossWordPlate => t instanceof BossWordPlate) ?? null;
    const bulletHits = hits.filter((t): t is BossBullet => t instanceof BossBullet);
    const isDouble = !!plateHit && bulletHits.length > 0;

    // One correct answer per word (a double is still one word).
    let points = 0;
    let comboBonus = false;
    const seen = new Set<string>();
    for (const t of hits) {
      if (seen.has(t.wordId)) continue;
      seen.add(t.wordId);
      const delta = this.session.answerCorrect(t.wordId, this.clock - t.spawnClock, t.hadMistake);
      if (delta) {
        points += delta.points;
        comboBonus ||= delta.comboBonus > 0;
      }
    }
    if (isDouble) {
      this.session.scoring.bonus(DOUBLE_BONUS);
      points += DOUBLE_BONUS;
    }

    // Defend first (closest bullets), then hit the boss.
    for (const b of bulletHits) this.shootBullet(b);
    if (plateHit) this.attackBoss(plateHit, isDouble ? DOUBLE_DAMAGE : 1, isDouble);
    if (isDouble) {
      this.bridge.emit('feedback', { kind: 'combo', text: `DOUBLE! Attack + defence +${DOUBLE_BONUS}` });
    } else if (comboBonus) {
      this.bridge.emit('feedback', { kind: 'combo', text: `Combo ×${this.session.scoring.snapshot.combo}!` });
    }
    if (this.settings.speechEnabled && this.settings.speakOnCorrect) {
      speech.speak(hits[0]!.answer, { lang: 'en', rate: this.settings.speechRate });
    }
    this.typed = '';
    this.refreshTyping();
    this.emitHud();
    this.emitActive();
    return { kind: 'correct', points, answer: hits[0]!.answer };
  }

  submitIfComplete(text: string): SubmitResult {
    const typed = typingKey(text);
    const targets = this.targets();
    if (!typed || !targets.some((t) => typingKey(t.answer) === typed)) return { kind: 'ignored' };
    const longer = targets.some((t) => {
      const a = typingKey(t.answer);
      return a.length > typed.length && a.startsWith(typed);
    });
    return longer ? { kind: 'ignored' } : this.submit(text);
  }

  setTyped(text: string): void {
    this.typed = text;
    this.refreshTyping();
  }

  private refreshTyping(): void {
    const highlight = this.session.config.mode === 'copy' ? this.settings.copyModeHighlight : this.settings.recallModeHighlight;
    // Bullets are closer to the player than the boss word, so they win ties (defence first).
    const target = findPrefixTarget(this.typed, this.targets());
    for (const t of this.targets()) t.setTyping(highlight ? matchedPrefixLength(this.typed, t.answer) : 0, t === target);
    if (target) this.cannon.aimAt(target.x, target.y, this.animate);
    else this.cannon.relax(this.animate);
  }

  // ── Effects ─────────────────────────────────────────────────────────────────

  /** Fires the cannon at (x, y); `onHit` runs when the shot lands. */
  private shootAt(x: number, y: number, onHit: () => void): void {
    this.cannon.snapTo(x, y);
    this.cannon.recoil(this.animate);
    const from = this.cannon.muzzle();
    muzzleBurst(this, this.cannon.currentSkin, from.x, from.y, this.cannon.barrelRotation, this.animate);
    const p = new Projectile(this, from.x, from.y, this.cannon.currentSkin).setDepth(4);
    p.fire(x, y, this.animate ? GAMEPLAY.projectileMs : 0, onHit);
  }

  private shootBullet(b: BossBullet): void {
    b.claimed = true;
    b.setTyping(0, false);
    this.shootAt(b.x, b.y, () => {
      sfx.play('pop');
      floatText(this, b.x, b.y - 10, 'Blocked!', '#1f8f73', this.animate, 20);
      fireworks(this, this.cannon.currentSkin, b.x, b.y, this.animate);
      this.burst(b.x, b.y, this.def.bullet.fill);
      this.removeBullet(b);
      if (this.animate) this.tweens.add({ targets: b, scale: 0, alpha: 0, duration: 160, onComplete: () => b.destroy() });
      else b.destroy();
    });
  }

  private attackBoss(plate: BossWordPlate, damage: number, isDouble: boolean): void {
    plate.claimed = true;
    plate.setTyping(0, false);
    if (this.plate === plate) this.plate = null;
    if (this.animate) this.tweens.add({ targets: plate, scale: 0, alpha: 0, duration: 160, onComplete: () => plate.destroy() });
    else plate.destroy();
    const aimX = this.boss.x;
    const aimY = this.boss.y;
    this.shootAt(aimX, aimY, () => {
      const wasEnraged = this.battle.enraged;
      const dealt = this.battle.hit(damage);
      sfx.play(isDouble ? 'combo' : 'pop');
      this.boss.hitFlash(this.animate);
      fireworks(this, this.cannon.currentSkin, this.boss.x, this.boss.y, this.animate);
      floatText(this, this.boss.x + 40, this.boss.y - 20, `-${dealt}`, '#c2304f', this.animate, isDouble ? 34 : 28);
      if (this.animate) this.cameras.main.shake(isDouble ? 220 : 120, isDouble ? 0.006 : 0.003);
      if (this.battle.defeated) {
        this.bossDefeated();
        return;
      }
      if (this.battle.enraged && !wasEnraged) {
        this.boss.setAngry(true);
        this.bridge.emit('feedback', { kind: 'missed', text: `${this.def.name} is angry!` });
      }
      this.plateDue = this.clock + 350;
      this.emitHud();
    });
  }

  private burst(x: number, y: number, tint: number): void {
    if (!this.animate) return;
    const e = this.add
      .particles(x, y, 'dot', {
        speed: { min: 90, max: 260 },
        angle: { min: 0, max: 360 },
        lifespan: 600,
        scale: { start: 0.7, end: 0 },
        tint: [tint, 0xffffff],
        emitting: false,
      })
      .setDepth(6);
    e.explode(16);
    this.time.delayedCall(700, () => e.destroy());
  }

  /** A bullet reached the player: lose a heart. */
  private bulletLanded(b: BossBullet): void {
    b.claimed = true;
    this.removeBullet(b);
    const res = this.session.balloonMissed(b.wordId);
    sfx.play('miss');
    this.bridge.emit('feedback', { kind: 'missed', text: `Ouch! ${b.answer}` });
    floatText(this, b.x, this.dangerY - 30, res && res.points < 0 ? `${res.points}` : 'Ouch!', '#e2457a', this.animate);
    this.tweens.add({ targets: this.dangerFlash, alpha: { from: 1, to: 0 }, duration: 500 });
    if (this.animate) {
      this.tweens.add({ targets: b, scaleX: 1.4, scaleY: 0.3, alpha: 0, duration: 220, onComplete: () => b.destroy() });
      this.cameras.main.shake(200, 0.007);
    } else {
      b.destroy();
    }
    this.emitHud();
    this.emitActive();
    this.refreshTyping();
    if (!this.session.isRunning) this.endBattle();
  }

  private removeBullet(b: BossBullet): void {
    this.bullets = this.bullets.filter((o) => o !== b);
  }

  private bossDefeated(): void {
    this.session.win(this.def.reward);
    this.bridge.boss = { name: this.def.name, hp: 0, maxHp: this.battle.maxHp, enraged: false };
    this.bridge.emit('feedback', { kind: 'combo', text: `${this.def.name} defeated! +${this.def.reward}` });
    this.emitHud();
    // Clear the remaining bullets without penalty.
    for (const b of this.liveBullets()) {
      b.claimed = true;
      this.burst(b.x, b.y, this.def.bullet.fill);
      b.destroy();
    }
    this.bullets = [];
    this.plate?.destroy();
    this.plate = null;
    this.boss.defeat(this.animate, () => this.endBattle());
  }

  private endBattle(): void {
    if (this.ending) return;
    this.ending = true;
    speech.cancel();
    const state = this.session.runState;
    this.time.delayedCall(500, () => {
      for (const b of this.bullets) b.destroy();
      this.bullets = [];
      this.plate?.destroy();
      this.plate = null;
      this.emitActive();
      sfx.play(state === 'game_over' ? 'gameover' : 'complete');
      this.time.delayedCall(450, () => this.bridge.emit('end', state));
    });
  }

  // ── Bridge ───────────────────────────────────────────────────────────────────

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

  setStage(stage: StageId): void {
    this.stageId = stage;
    if (this.cannon) this.layout();
  }

  applySettings(settings: AppSettings): void {
    this.settings = settings;
    if (this.cannon) {
      this.cannon.setSkin(settings.cannonSkin);
      this.cannon.setAnimate(this.animate);
      this.refreshTyping();
    }
  }

  quit(): void {
    this.session.quit();
    if (this.paused) this.setPaused(false);
    this.endBattle();
  }

  private emitHud(): void {
    if (!this.battle.defeated) {
      this.bridge.boss = { name: this.def.name, hp: this.battle.hp, maxHp: this.battle.maxHp, enraged: this.battle.enraged };
    }
    this.bridge.emit('hud', this.bridge.hud());
  }

  private emitActive(): void {
    this.bridge.emit(
      'active',
      this.targets().map((t) => t.prompt),
    );
  }
}
