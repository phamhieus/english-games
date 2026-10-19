import type { StageId } from '@/types';

/**
 * Background music, synthesized with WebAudio (no audio files).
 *
 * Each track is a 4-chord loop: bass on the chord root, an optional soft pad, light drums,
 * and a melody built from chord tones following a rhythm pattern, so it always stays in
 * harmony. Notes are scheduled slightly ahead of time with a small lookahead timer.
 */

export type MusicTrack = 'menu' | StageId;

type Lead = { type: OscillatorType; attack: number; decay: number; gain: number; octave?: number };

interface Song {
  bpm: number;
  /** MIDI note of the tonic (melody octave). */
  key: number;
  scale: readonly number[];
  /** Scale degrees of the four chord roots. */
  progression: readonly number[];
  /** Melody per bar (8 eighth-notes): index into the chord tones, '.' = rest. Bars alternate A/B. */
  a: string;
  b: string;
  lead: Lead;
  drums: 'none' | 'soft' | 'bouncy';
  pad: boolean;
}

const MAJOR = [0, 2, 4, 5, 7, 9, 11];
const MINOR = [0, 2, 3, 5, 7, 8, 10];
const DORIAN = [0, 2, 3, 5, 7, 9, 10];
/** Phrygian dominant: a warm, sandy "desert" colour. */
const DESERT = [0, 1, 4, 5, 7, 8, 10];

const PLUCK: Lead = { type: 'triangle', attack: 0.005, decay: 0.32, gain: 0.32 };
const FLUTE: Lead = { type: 'sine', attack: 0.03, decay: 0.45, gain: 0.34 };
const BELL: Lead = { type: 'sine', attack: 0.002, decay: 0.9, gain: 0.26, octave: 12 };
const CHIP: Lead = { type: 'square', attack: 0.005, decay: 0.2, gain: 0.1 };
const SOFT: Lead = { type: 'sine', attack: 0.06, decay: 1.1, gain: 0.26 };

const SONGS: Record<MusicTrack, Song> = {
  menu: { bpm: 96, key: 60, scale: MAJOR, progression: [0, 5, 3, 4], a: '0.2.1.2.', b: '3.2.1.0.', lead: PLUCK, drums: 'soft', pad: false },
  meadow: { bpm: 116, key: 67, scale: MAJOR, progression: [0, 4, 5, 3], a: '0212321.', b: '2.343.1.', lead: PLUCK, drums: 'bouncy', pad: false },
  garden: { bpm: 100, key: 65, scale: MAJOR, progression: [0, 3, 5, 4], a: '0123210.', b: '4.3.2.1.', lead: FLUTE, drums: 'soft', pad: true },
  sunset: { bpm: 92, key: 62, scale: MAJOR, progression: [0, 5, 1, 4], a: '0.21.23.', b: '2.1.0...', lead: PLUCK, drums: 'soft', pad: true },
  snow: { bpm: 96, key: 64, scale: MINOR, progression: [0, 5, 2, 6], a: '3.2.4.2.', b: '1.3.2.0.', lead: BELL, drums: 'none', pad: true },
  candy: { bpm: 132, key: 72, scale: MAJOR, progression: [0, 5, 3, 4], a: '002.3.21', b: '43212.0.', lead: CHIP, drums: 'bouncy', pad: false },
  ocean: { bpm: 84, key: 62, scale: DORIAN, progression: [0, 3, 6, 4], a: '0..2..1.', b: '2..3..4.', lead: SOFT, drums: 'none', pad: true },
  night: { bpm: 72, key: 69, scale: MINOR, progression: [0, 5, 3, 4], a: '2..1..0.', b: '1..2..3.', lead: SOFT, drums: 'none', pad: true },
  space: { bpm: 104, key: 60, scale: MINOR, progression: [0, 5, 3, 6], a: '0.4.3.2.', b: '4.321...', lead: CHIP, drums: 'soft', pad: true },
  autumn: { bpm: 96, key: 65, scale: MAJOR, progression: [0, 5, 3, 4], a: '0.21.2..', b: '3.2.1.0.', lead: FLUTE, drums: 'soft', pad: true },
  desert: { bpm: 104, key: 62, scale: DESERT, progression: [0, 1, 0, 6], a: '01.2.10.', b: '2.1.0...', lead: PLUCK, drums: 'soft', pad: false },
  jungle: { bpm: 120, key: 67, scale: MAJOR, progression: [0, 4, 5, 3], a: '0.20.2.3', b: '4.3.2.1.', lead: PLUCK, drums: 'bouncy', pad: false },
  city: { bpm: 88, key: 60, scale: DORIAN, progression: [0, 3, 6, 4], a: '0..2.1..', b: '3..2.0..', lead: SOFT, drums: 'soft', pad: true },
  volcano: { bpm: 126, key: 57, scale: MINOR, progression: [0, 5, 6, 4], a: '0021.0..', b: '4321....', lead: CHIP, drums: 'bouncy', pad: true },
  aurora: { bpm: 70, key: 69, scale: MAJOR, progression: [0, 5, 3, 4], a: '4..3..2.', b: '2..3..4.', lead: BELL, drums: 'none', pad: true },
};

/** Chord tones as scale-degree offsets: root, 3rd, 5th, octave, octave 3rd. */
const CHORD_TONES = [0, 2, 4, 7, 9];
const LOOKAHEAD_S = 0.15;
const TICK_MS = 25;

const midiToHz = (m: number) => 440 * 2 ** ((m - 69) / 12);

function degreeToSemis(scale: readonly number[], degree: number): number {
  const n = scale.length;
  const oct = Math.floor(degree / n);
  return scale[((degree % n) + n) % n]! + 12 * oct;
}

class MusicService {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  private timer: number | undefined;
  private track: MusicTrack | null = null;
  private step = 0;
  private nextTime = 0;
  private paused = false;
  private enabled = true;
  private volume = 0.5;

  /** Starts (or switches to) a track. Safe to call repeatedly with the same track. */
  play(track: MusicTrack): void {
    if (this.track === track && this.timer !== undefined) return;
    this.track = track;
    this.step = 0;
    this.start();
  }

  /** Call from a user gesture: browsers only allow audio after one. */
  unlock(): void {
    if (this.ctx?.state === 'suspended' && !this.paused) void this.ctx.resume();
    if (this.timer === undefined) this.start();
  }

  pause(): void {
    this.paused = true;
    void this.ctx?.suspend();
  }

  resume(): void {
    this.paused = false;
    if (this.enabled) void this.ctx?.resume();
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) this.stopTimer();
    else this.start();
  }

  setVolume(volume: number): void {
    this.volume = volume;
    if (this.master && this.ctx) this.master.gain.setTargetAtTime(volume * 0.3, this.ctx.currentTime, 0.05);
  }

  private start(): void {
    if (!this.enabled || !this.track || typeof window === 'undefined') return;
    const ctx = this.context();
    if (!ctx) return;
    if (ctx.state === 'suspended' && !this.paused) void ctx.resume();
    this.nextTime = ctx.currentTime + 0.06;
    this.stopTimer();
    this.timer = window.setInterval(this.tick, TICK_MS);
  }

  private stopTimer(): void {
    if (this.timer !== undefined) window.clearInterval(this.timer);
    this.timer = undefined;
  }

  private context(): AudioContext | null {
    if (this.ctx) return this.ctx;
    try {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return null;
      const ctx = new Ctor();
      this.master = ctx.createGain();
      this.master.gain.value = this.volume * 0.3;
      this.master.connect(ctx.destination);
      const buf = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
      this.noise = buf;
      this.ctx = ctx;
      return ctx;
    } catch {
      return null;
    }
  }

  private tick = (): void => {
    const ctx = this.ctx;
    const song = this.track ? SONGS[this.track] : null;
    if (!ctx || !song || ctx.state !== 'running') return;
    // After the tab was throttled, skip ahead instead of firing a burst of late notes.
    if (this.nextTime < ctx.currentTime - 0.2) this.nextTime = ctx.currentTime + 0.05;
    const stepDur = 60 / song.bpm / 2;
    while (this.nextTime < ctx.currentTime + LOOKAHEAD_S) {
      try {
        this.playStep(song, this.step, this.nextTime, stepDur);
      } catch {
        /* audio is optional */
      }
      this.nextTime += stepDur;
      this.step = (this.step + 1) % (8 * song.progression.length);
    }
  };

  private playStep(song: Song, step: number, t: number, stepDur: number): void {
    const bar = Math.floor(step / 8);
    const pos = step % 8;
    const root = song.progression[bar % song.progression.length]!;
    const pattern = bar % 2 ? song.b : song.a;
    const token = pattern[pos];
    const note = (deg: number, octave: number) => song.key + octave + degreeToSemis(song.scale, deg);

    if (token && token !== '.') {
      const deg = root + CHORD_TONES[Number(token)]!;
      const l = song.lead;
      this.voice(midiToHz(note(deg, l.octave ?? 0)), t, l.attack, l.decay, l.gain, l.type);
    }
    // bass on beats 1 and 3
    if (pos === 0 || pos === 4) this.voice(midiToHz(note(root, -24)), t, 0.01, stepDur * 3, 0.42, 'triangle');
    // pad: the whole chord, very soft, once per bar
    if (song.pad && pos === 0) {
      for (const off of [0, 2, 4]) this.voice(midiToHz(note(root + off, -12)), t, 0.25, stepDur * 8, 0.06, 'sine');
    }
    if (song.drums !== 'none') {
      if (pos === 0 || pos === 4) this.kick(t);
      if (song.drums === 'bouncy' && (pos === 2 || pos === 6)) this.hit(t, 1800, 0.18, 0.09);
      if (pos % 2 === 1) this.hit(t, 7000, song.drums === 'bouncy' ? 0.07 : 0.045, 0.03);
    }
  }

  private voice(freq: number, t: number, attack: number, decay: number, gain: number, type: OscillatorType): void {
    const ctx = this.ctx!;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
    osc.connect(g).connect(this.master!);
    osc.start(t);
    osc.stop(t + attack + decay + 0.05);
  }

  private kick(t: number): void {
    const ctx = this.ctx!;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.frequency.setValueAtTime(130, t);
    osc.frequency.exponentialRampToValueAtTime(45, t + 0.12);
    g.gain.setValueAtTime(0.5, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
    osc.connect(g).connect(this.master!);
    osc.start(t);
    osc.stop(t + 0.2);
  }

  private hit(t: number, freq: number, gain: number, length: number): void {
    const ctx = this.ctx!;
    if (!this.noise) return;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const filter = ctx.createBiquadFilter();
    filter.type = freq > 4000 ? 'highpass' : 'bandpass';
    filter.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + length);
    src.connect(filter).connect(g).connect(this.master!);
    src.start(t);
    src.stop(t + length + 0.02);
  }
}

export const music = new MusicService();
