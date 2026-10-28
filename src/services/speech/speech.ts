import { isFacebookInstant } from '@/services/platform/platform';

export type SpeechLang = 'en' | 'vi';

/** English audio from the Worker (dictionary recording, else Workers AI). Not in the Instant Game build: no /api there. */
const AUDIO_ENABLED = !isFacebookInstant;
/** Give up on the audio and use the browser voice if it hasn't started by then. */
const AUDIO_TIMEOUT_MS = 3000;

const ttsUrl = (text: string) => `/api/tts?text=${encodeURIComponent(text.trim().toLowerCase().replace(/\s+/g, ' '))}`;

/** 10 ms of silence as a WAV data URI, played in the first gesture so iOS lets the audio element play later. */
function silentWav(): string {
  const samples = 80;
  const bytes = new Uint8Array(44 + samples);
  const view = new DataView(bytes.buffer);
  const ascii = (at: number, s: string) => [...s].forEach((c, i) => view.setUint8(at + i, c.charCodeAt(0)));
  ascii(0, 'RIFF');
  view.setUint32(4, 36 + samples, true);
  ascii(8, 'WAVEfmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, 8000, true);
  view.setUint32(28, 8000, true);
  view.setUint16(32, 1, true);
  view.setUint16(34, 8, true);
  ascii(36, 'data');
  view.setUint32(40, samples, true);
  bytes.fill(128, 44);
  return `data:audio/wav;base64,${btoa(String.fromCharCode(...bytes))}`;
}

/** iPhone/iPad (iPadOS reports itself as a Mac with touch). Every browser there is Safari underneath. */
const isIOS =
  typeof navigator !== 'undefined' &&
  (/iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));

/**
 * Speaks words: English plays an MP3 from /api/tts (a real recording when the dictionary has
 * one), falling back to the browser SpeechSynthesis API; Vietnamese always uses the browser.
 * Every call is fire-and-forget and never throws: gameplay must not depend on it.
 *
 * iOS Safari needs extra care: speech stays muted until the first speak() inside a user
 * gesture (see unlock), an utterance can be garbage-collected before it plays, a speak()
 * straight after cancel() is dropped, and a voice picked from getVoices() may not be
 * installed — so there we only set the language and let iOS use its default voice.
 */
class SpeechService {
  private voices: SpeechSynthesisVoice[] = [];
  private unlocked = false;
  /** Holds the utterance being spoken so iOS doesn't collect it mid-way. */
  private current: SpeechSynthesisUtterance | null = null;
  private pendingTimer: number | undefined;
  /** One element reused for every word: iOS only lets an element play that was first played in a gesture. */
  private audio: HTMLAudioElement | null = null;
  /** Texts the server had no audio for (or that failed): go straight to the browser voice. */
  private noAudio = new Set<string>();
  /** Bumped on every speak/cancel so a late audio failure doesn't speak a stale word. */
  private turn = 0;

  constructor() {
    if (!this.available) return;
    try {
      this.loadVoices();
      window.speechSynthesis.addEventListener?.('voiceschanged', () => this.loadVoices());
    } catch {
      /* ignore */
    }
  }

  get available(): boolean {
    return typeof window !== 'undefined' && 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined';
  }

  private loadVoices(): void {
    try {
      this.voices = window.speechSynthesis.getVoices();
    } catch {
      this.voices = [];
    }
  }

  private voiceFor(lang: SpeechLang): SpeechSynthesisVoice | undefined {
    if (!this.voices.length) this.loadVoices();
    const matches = this.voices.filter((v) => v.lang.toLowerCase().startsWith(lang));
    if (lang === 'en') {
      return (
        matches.find((v) => /en[-_]us/i.test(v.lang) && /google|natural|samantha|aria|jenny/i.test(v.name)) ??
        matches.find((v) => /en[-_]us/i.test(v.lang)) ??
        matches.find((v) => /en[-_]gb/i.test(v.lang)) ??
        matches[0]
      );
    }
    return matches[0];
  }

  hasVoice(lang: SpeechLang): boolean {
    return this.available && !!this.voiceFor(lang);
  }

  /**
   * Call from a user gesture (tap/key). iOS only lets the page speak later — from game
   * timers, say — once something was spoken inside a gesture, so this speaks an empty line.
   */
  unlock(): void {
    if (this.unlocked) return;
    this.unlocked = true;
    const audio = this.audioElement();
    if (audio && audio.paused) {
      audio.src = silentWav();
      audio.play().catch(() => undefined);
    }
    if (!this.available) return;
    try {
      const synth = window.speechSynthesis;
      if (synth.paused) synth.resume();
      if (!synth.speaking && !synth.pending) {
        const u = new SpeechSynthesisUtterance('');
        u.volume = 0;
        synth.speak(u);
      }
      this.loadVoices();
    } catch {
      /* ignore */
    }
  }

  /**
   * Speaks `text`. With `interrupt`, anything queued/speaking is cancelled first so
   * announcements never pile up behind each other. Returns false if nothing was spoken.
   */
  speak(text: string, opts: { lang?: SpeechLang; rate?: number; interrupt?: boolean } = {}): boolean {
    if (!text.trim()) return false;
    const lang = opts.lang ?? 'en';
    const turn = ++this.turn;
    if (lang === 'en' && this.playAudio(text, opts, turn)) return true;
    return this.speakWithBrowser(text, lang, opts);
  }

  private audioElement(): HTMLAudioElement | null {
    if (!AUDIO_ENABLED || typeof Audio === 'undefined') return null;
    if (!this.audio) {
      this.audio = new Audio();
      this.audio.preload = 'auto';
    }
    return this.audio;
  }

  /** Starts the MP3; if it fails or stalls, speaks with the browser instead. False when there's no audio to try. */
  private playAudio(text: string, opts: { rate?: number; interrupt?: boolean }, turn: number): boolean {
    const audio = this.audioElement();
    if (!audio || this.noAudio.has(text)) return false;
    window.clearTimeout(this.pendingTimer);
    try {
      if (this.available && (window.speechSynthesis.speaking || window.speechSynthesis.pending)) window.speechSynthesis.cancel();
    } catch {
      /* ignore */
    }
    let settled = false;
    const fallBack = (remember: boolean) => {
      if (settled) return;
      settled = true;
      if (remember) this.noAudio.add(text);
      if (turn !== this.turn) return;
      audio.pause();
      this.speakWithBrowser(text, 'en', opts);
    };
    const timer = window.setTimeout(() => fallBack(false), AUDIO_TIMEOUT_MS);
    audio.onplaying = () => {
      settled = true;
      window.clearTimeout(timer);
    };
    const url = ttsUrl(text);
    audio.onerror = () => {
      if (!audio.src.endsWith(url)) return; // an earlier word's load being aborted
      window.clearTimeout(timer);
      fallBack(true);
    };
    audio.src = url;
    audio.playbackRate = Math.max(0.5, Math.min(1.5, opts.rate ?? 0.9));
    audio.play().catch((e: unknown) => {
      window.clearTimeout(timer);
      // NotAllowedError: no gesture yet (autoplay); the file itself may be fine.
      fallBack(!(e instanceof DOMException && e.name === 'NotAllowedError'));
    });
    return true;
  }

  private speakWithBrowser(text: string, lang: SpeechLang, opts: { rate?: number; interrupt?: boolean }): boolean {
    if (!this.available) return false;
    if (opts.interrupt) this.audio?.pause();
    try {
      const voice = this.voiceFor(lang);
      // Without a Vietnamese voice the browser would read Vietnamese with an English voice — skip instead.
      if (!voice && lang === 'vi') return false;
      const synth = window.speechSynthesis;
      const u = new SpeechSynthesisUtterance(text);
      if (voice && !isIOS) u.voice = voice;
      u.lang = voice?.lang ?? (lang === 'en' ? 'en-US' : 'vi-VN');
      u.rate = Math.max(0.5, Math.min(1.5, opts.rate ?? 0.9));
      u.onend = u.onerror = () => {
        if (this.current === u) this.current = null;
      };
      const start = () => {
        this.current = u;
        // Safari can be left paused (after an interruption or the tab was in the background).
        if (synth.paused) synth.resume();
        synth.speak(u);
      };
      window.clearTimeout(this.pendingTimer);
      if (opts.interrupt && (synth.speaking || synth.pending)) {
        synth.cancel();
        // Safari drops a speak() made right after cancel(); give it a moment.
        if (isIOS) {
          this.pendingTimer = window.setTimeout(start, 60);
          return true;
        }
      }
      start();
      return true;
    } catch {
      return false;
    }
  }

  cancel(): void {
    this.turn++;
    this.audio?.pause();
    try {
      window.clearTimeout(this.pendingTimer);
      if (this.available) window.speechSynthesis.cancel();
    } catch {
      /* ignore */
    }
  }
}

export const speech = new SpeechService();
