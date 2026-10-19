export type SfxName = 'shoot' | 'pop' | 'wrong' | 'combo' | 'miss' | 'gameover' | 'complete';

/**
 * Tiny synthesized sound effects (WebAudio) — no asset files, soft "bubbly" tones.
 * The AudioContext is created lazily on first use (after a user gesture).
 */
class SfxService {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  enabled = true;
  volume = 0.6;

  private context(): AudioContext | null {
    if (!this.enabled || typeof window === 'undefined') return null;
    try {
      if (!this.ctx) {
        const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!Ctor) return null;
        this.ctx = new Ctor();
        this.master = this.ctx.createGain();
        this.master.connect(this.ctx.destination);
      }
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      if (this.master) this.master.gain.value = this.volume * 0.5;
      return this.ctx;
    } catch {
      return null;
    }
  }

  private tone(
    freq: number,
    start: number,
    duration: number,
    opts: { type?: OscillatorType; endFreq?: number; gain?: number } = {},
  ): void {
    const ctx = this.ctx;
    if (!ctx || !this.master) return;
    const t0 = ctx.currentTime + start;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = opts.type ?? 'sine';
    osc.frequency.setValueAtTime(freq, t0);
    if (opts.endFreq) osc.frequency.exponentialRampToValueAtTime(opts.endFreq, t0 + duration);
    const peak = opts.gain ?? 0.5;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(peak, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
    osc.connect(g).connect(this.master);
    osc.start(t0);
    osc.stop(t0 + duration + 0.02);
  }

  play(name: SfxName): void {
    if (!this.context()) return;
    try {
      switch (name) {
        case 'shoot':
          this.tone(520, 0, 0.12, { type: 'triangle', endFreq: 980, gain: 0.25 });
          break;
        case 'pop':
          this.tone(900, 0, 0.09, { type: 'sine', endFreq: 1500, gain: 0.45 });
          this.tone(1320, 0.05, 0.12, { type: 'sine', endFreq: 1760, gain: 0.25 });
          break;
        case 'wrong':
          this.tone(260, 0, 0.16, { type: 'triangle', endFreq: 200, gain: 0.3 });
          break;
        case 'combo':
          [660, 830, 990, 1320].forEach((f, i) => this.tone(f, i * 0.06, 0.14, { type: 'sine', gain: 0.3 }));
          break;
        case 'miss':
          this.tone(420, 0, 0.25, { type: 'sine', endFreq: 180, gain: 0.35 });
          break;
        case 'gameover':
          [523, 440, 349, 262].forEach((f, i) => this.tone(f, i * 0.16, 0.3, { type: 'triangle', gain: 0.3 }));
          break;
        case 'complete':
          [523, 659, 784, 1046].forEach((f, i) => this.tone(f, i * 0.1, 0.25, { type: 'sine', gain: 0.32 }));
          break;
      }
    } catch {
      /* audio is optional */
    }
  }
}

export const sfx = new SfxService();
