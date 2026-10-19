import type { AppSettings } from '@/types';
import type { GameSession, RunState } from '@/game/systems/SessionSystem';
import { comboMultiplier } from '@/game/systems/ScoringSystem';

export interface HudState {
  score: number;
  lives: number;
  combo: number;
  bestCombo: number;
  accuracy: number;
  correct: number;
  incorrect: number;
  missed: number;
  completion: { done: number; total: number } | null;
  multiplier: number;
}

export type SubmitResult =
  | { kind: 'empty' }
  | { kind: 'ignored' }
  | { kind: 'correct'; points: number; answer: string }
  | { kind: 'incorrect'; penalised: boolean };

export interface FeedbackEvent {
  kind: 'correct' | 'incorrect' | 'missed' | 'combo';
  text: string;
}

export interface SceneHandle {
  submit(text: string): SubmitResult;
  setTyped(text: string): void;
  setPaused(paused: boolean): void;
  applySettings(settings: AppSettings): void;
  quit(): void;
}

type Events = {
  hud: HudState;
  feedback: FeedbackEvent;
  /** Prompts currently on screen (for the screen-reader live region and e2e tests). */
  active: string[];
  /** Fired once when the session ends and the final animations finished. */
  end: RunState;
};

type Listener<T> = (payload: T) => void;

/**
 * The only channel between React and the Phaser scene. React calls commands
 * (submit, pause…); the scene publishes events (HUD, feedback, end).
 */
export class GameBridge {
  private scene: SceneHandle | null = null;
  private listeners = new Map<keyof Events, Set<Listener<never>>>();
  private pendingPaused = false;

  constructor(
    readonly session: GameSession,
    public settings: AppSettings,
  ) {}

  attachScene(scene: SceneHandle | null): void {
    this.scene = scene;
    if (scene) {
      scene.applySettings(this.settings);
      if (this.pendingPaused) scene.setPaused(true);
    }
  }

  /** Detaches only if `scene` is still the attached one (guards against a stale game instance). */
  detachScene(scene: SceneHandle): void {
    if (this.scene === scene) this.scene = null;
  }

  on<K extends keyof Events>(event: K, fn: Listener<Events[K]>): () => void {
    let set = this.listeners.get(event);
    if (!set) {
      set = new Set();
      this.listeners.set(event, set);
    }
    const entry = fn as Listener<never>;
    set.add(entry);
    return () => set.delete(entry);
  }

  emit<K extends keyof Events>(event: K, payload: Events[K]): void {
    const set = this.listeners.get(event) as Set<Listener<Events[K]>> | undefined;
    set?.forEach((fn) => fn(payload));
  }

  submit(text: string): SubmitResult {
    return this.scene?.submit(text) ?? { kind: 'ignored' };
  }

  setTyped(text: string): void {
    this.scene?.setTyped(text);
  }

  setPaused(paused: boolean): void {
    this.pendingPaused = paused;
    this.scene?.setPaused(paused);
  }

  /** Ends the run. Falls back to ending the session directly if the scene isn't up yet. */
  quit(): void {
    if (this.scene) this.scene.quit();
    else {
      this.session.quit();
      this.emit('end', this.session.runState);
    }
  }

  updateSettings(settings: AppSettings): void {
    this.settings = settings;
    this.scene?.applySettings(settings);
  }

  hud(): HudState {
    const s = this.session.scoring.snapshot;
    return {
      ...s,
      accuracy: this.session.scoring.accuracy,
      completion: this.session.completion,
      multiplier: comboMultiplier(s.combo),
    };
  }
}
