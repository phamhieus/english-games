import { isFacebookInstant } from '@/services/platform/platform';
import { music } from '@/services/audio/music';

export type SpeechLang = 'en' | 'vi';

/** English audio from the Worker (dictionary recording, else Workers AI). Not in the Instant Game build: no /api there. */
const AUDIO_ENABLED = !isFacebookInstant;
/** Give up on the audio and use the browser voice if it hasn't started by then. */
const AUDIO_TIMEOUT_MS = 3000;

// `accent=uk` keeps browsers from reusing MP3s cached when US recordings came first.
const ttsUrl = (text: string) => `/api/tts?text=${encodeURIComponent(text.trim().toLowerCase().replace(/\s+/g, ' '))}&accent=uk`;

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
 * In-app browsers (Zalo, Facebook, Messenger, Instagram, LINE, WeChat, TikTok). On iOS they
 * block every <audio> play() not made inside a tap, so words there play through Web Audio.
 */
const isInAppBrowser = typeof navigator !== 'undefined' && /Zalo|FBAN|FBAV|FB_IAB|Instagram|Line\/|MicroMessenger|musical_ly|TikTok/i.test(navigator.userAgent);

/**
 * Speaks words: English plays an MP3 from /api/tts (a real recording when the dictionary has
 * one), falling back to the browser SpeechSynthesis API; Vietnamese always uses the browser.
 * Every call is fire-and-forget and never throws: gameplay must not depend on it.
 *
 * iOS Safari needs extra care: speech stays muted until the first speak() inside a user
 * gesture (see unlock), an utterance can be garbage-collected before it plays, a speak()
 * straight after cancel() is dropped, and a voice picked from getVoices() may not be
 * installed — so there we only set the language and let iOS use its default voice.
 * When <audio> isn't allowed to play outside a tap (in-app browsers), the MP3 is decoded and
 * played through the music's AudioContext, which every tap keeps unlocked.
 */
class SpeechService {
  private voices: SpeechSynthesisVoice[] = [];
  /** A tap happened (unlock was called at least once). */
  private unlocked = false;
  /** The silent <audio> play in a gesture went through. */
  private htmlUnlocked = false;
  /** Holds the utterance being spoken so iOS doesn't collect it mid-way. */
  private current: SpeechSynthesisUtterance | null = null;
  private pendingTimer: number | undefined;
  /** One element reused for every word: iOS only lets an element play that was first played in a gesture. */
  private audio: HTMLAudioElement | null = null;
  /** Texts the server had no audio for (or that failed): go straight to the browser voice. */
  private noAudio = new Set<string>();
  /** Bumped on every speak/cancel so a late audio failure doesn't speak a stale word. */
  private turn = 0;
  /** <audio> refused to play outside a tap: use Web Audio from now on. */
  private htmlAudioBlocked = isInAppBrowser;
  private ctx: AudioContext | null = null;
  private source: AudioBufferSourceNode | null = null;
  private decoded = new Map<string, Promise<AudioBuffer | null>>();

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
      // British first: the lessons (and their IPA) are British English.
      return (
        matches.find((v) => /en[-_]gb/i.test(v.lang) && /google|natural|daniel|serena|sonia|libby|ryan/i.test(v.name)) ??
        matches.find((v) => /en[-_]gb/i.test(v.lang)) ??
        matches.find((v) => /en[-_]us/i.test(v.lang) && /google|natural|samantha|aria|jenny/i.test(v.name)) ??
        matches.find((v) => /en[-_]us/i.test(v.lang)) ??
        matches[0]
      );
    }
    return matches[0];
  }

  hasVoice(lang: SpeechLang): boolean {
    return this.available && !!this.voiceFor(lang);
  }

  /**
   * Call from every user gesture (tap/key). iOS only lets the page play or speak later —
   * from game timers, say — once it did so inside a gesture. Not every event counts
   * (pointerdown doesn't, touchend/click do), so this keeps trying until it has worked.
   */
  unlock(): void {
    const webAudioReady = !this.ctx || this.ctx.state === 'running';
    if (this.htmlUnlocked && webAudioReady && this.unlocked) return;
    const first = !this.unlocked;
    this.unlocked = true;
    this.unlockWebAudio();
    const audio = this.audioElement();
    if (audio && !this.htmlUnlocked && audio.paused) {
      audio.src = silentWav();
      audio
        .play()
        .then(() => {
          this.htmlUnlocked = true;
        })
        .catch(() => undefined);
    }
    if (!first || !this.available) return;
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

  /** Resumes the shared AudioContext inside the gesture, with a silent buffer for older iOS. */
  private unlockWebAudio(): void {
    if (!AUDIO_ENABLED) return;
    try {
      // iOS 17+: play like media, so the ring/silent switch doesn't mute Web Audio.
      const session = (navigator as Navigator & { audioSession?: { type: string } }).audioSession;
      if (session && session.type !== 'playback') session.type = 'playback';
    } catch {
      /* older browsers */
    }
    this.ctx = music.audioContext();
    if (!this.ctx || this.ctx.state === 'running') return;
    try {
      void this.ctx.resume();
      const src = this.ctx.createBufferSource();
      src.buffer = this.ctx.createBuffer(1, 1, 22050);
      src.connect(this.ctx.destination);
      src.start(0);
    } catch {
      /* resumed on the next tap */
    }
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
    this.stopSource();
    if (this.htmlAudioBlocked && this.ctx?.state === 'running') {
      this.playWithWebAudio(text, opts, turn);
      return true;
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
      // NotAllowedError: not inside a tap; the file itself may be fine.
      const notAllowed = e instanceof DOMException && e.name === 'NotAllowedError';
      if (notAllowed && this.ctx?.state === 'running') {
        // Tapped before, still refused: this browser wants a tap for every play. Web Audio doesn't.
        settled = true;
        this.htmlAudioBlocked = true;
        if (turn === this.turn) this.playWithWebAudio(text, opts, turn);
        return;
      }
      fallBack(!notAllowed);
    });
    return true;
  }

  /**
   * Plays the MP3 through the unlocked AudioContext (decoded once per word). Plays at natural
   * speed: a buffer played slower also sounds lower. Falls back to the browser voice on failure.
   */
  private playWithWebAudio(text: string, opts: { rate?: number; interrupt?: boolean }, turn: number): void {
    const ctx = this.ctx!;
    let buffer = this.decoded.get(text);
    if (!buffer) {
      buffer = fetch(ttsUrl(text))
        .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(String(r.status)))))
        // Callback form: older iOS WebViews don't return a promise from decodeAudioData.
        .then((data) => new Promise<AudioBuffer>((resolve, reject) => void ctx.decodeAudioData(data, resolve, reject)))
        .catch(() => null);
      this.decoded.set(text, buffer);
    }
    const timer = window.setTimeout(() => {
      if (turn === this.turn) {
        this.turn++;
        this.speakWithBrowser(text, 'en', opts);
      }
    }, AUDIO_TIMEOUT_MS);
    void buffer.then((buf) => {
      window.clearTimeout(timer);
      if (turn !== this.turn) return;
      if (!buf) {
        this.noAudio.add(text);
        this.decoded.delete(text);
        this.speakWithBrowser(text, 'en', opts);
        return;
      }
      try {
        if (ctx.state === 'suspended') void ctx.resume();
        this.stopSource();
        const src = ctx.createBufferSource();
        src.buffer = buf;
        src.connect(ctx.destination);
        src.start(0);
        this.source = src;
      } catch {
        this.speakWithBrowser(text, 'en', opts);
      }
    });
  }

  private stopSource(): void {
    try {
      this.source?.stop();
    } catch {
      /* already stopped */
    }
    this.source = null;
  }

  private speakWithBrowser(text: string, lang: SpeechLang, opts: { rate?: number; interrupt?: boolean }): boolean {
    if (!this.available) return false;
    if (opts.interrupt) {
      this.audio?.pause();
      this.stopSource();
    }
    try {
      const voice = this.voiceFor(lang);
      // Without a Vietnamese voice the browser would read Vietnamese with an English voice — skip instead.
      if (!voice && lang === 'vi') return false;
      const synth = window.speechSynthesis;
      const u = new SpeechSynthesisUtterance(text);
      if (voice && !isIOS) u.voice = voice;
      // On iOS (no voice set) the language alone picks the system's British voice.
      u.lang = (isIOS ? undefined : voice?.lang) ?? (lang === 'en' ? 'en-GB' : 'vi-VN');
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
    this.stopSource();
    try {
      window.clearTimeout(this.pendingTimer);
      if (this.available) window.speechSynthesis.cancel();
    } catch {
      /* ignore */
    }
  }
}

export const speech = new SpeechService();
