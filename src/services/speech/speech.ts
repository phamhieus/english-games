export type SpeechLang = 'en' | 'vi';

/**
 * Thin wrapper around the browser SpeechSynthesis API.
 * Every call is fire-and-forget and never throws: gameplay must not depend on it.
 */
class SpeechService {
  private voices: SpeechSynthesisVoice[] = [];
  private unlocked = false;
  /** Held so mobile browsers don't garbage-collect the utterance mid-sentence. */
  private current: SpeechSynthesisUtterance | null = null;

  constructor() {
    if (!this.available) return;
    try {
      this.loadVoices();
      const synth = window.speechSynthesis;
      if (synth.addEventListener) synth.addEventListener('voiceschanged', () => this.loadVoices());
      else synth.onvoiceschanged = () => this.loadVoices();
    } catch {
      /* ignore */
    }
  }

  /**
   * iOS Safari only lets speechSynthesis talk once speak() has run inside a user gesture;
   * until then, speech triggered from timers (the game loop) is silently dropped.
   * Call from a tap/key handler — speaks a silent utterance once to unlock it.
   */
  unlock(): void {
    if (this.unlocked || !this.available) return;
    try {
      const synth = window.speechSynthesis;
      synth.resume();
      const u = new SpeechSynthesisUtterance(' ');
      u.volume = 0;
      synth.speak(u);
      this.unlocked = true;
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
   * Speaks `text`. With `interrupt`, anything queued/speaking is cancelled first so
   * announcements never pile up behind each other. Returns false if nothing was spoken.
   */
  speak(text: string, opts: { lang?: SpeechLang; rate?: number; interrupt?: boolean } = {}): boolean {
    if (!this.available || !text.trim()) return false;
    const lang = opts.lang ?? 'en';
    try {
      const voice = this.voiceFor(lang);
      // Without a Vietnamese voice the browser would read Vietnamese with an English voice — skip instead.
      if (!voice && lang === 'vi') return false;
      const synth = window.speechSynthesis;
      const u = new SpeechSynthesisUtterance(text);
      if (voice) u.voice = voice;
      u.lang = voice?.lang ?? (lang === 'en' ? 'en-US' : 'vi-VN');
      u.rate = Math.max(0.5, Math.min(1.5, opts.rate ?? 0.9));
      u.onerror = () => undefined;
      u.onend = () => {
        if (this.current === u) this.current = null;
      };
      this.current = u;
      const start = () => {
        // iOS leaves the engine paused after backgrounding/interruptions.
        if (synth.paused) synth.resume();
        synth.speak(u);
      };
      if (opts.interrupt && (synth.speaking || synth.pending)) {
        synth.cancel();
        // Chrome (esp. Android) drops an utterance queued in the same tick as cancel().
        setTimeout(start, 60);
      } else {
        start();
      }
      return true;
    } catch {
      return false;
    }
  }

  cancel(): void {
    try {
      if (this.available) window.speechSynthesis.cancel();
    } catch {
      /* ignore */
    }
  }
}

export const speech = new SpeechService();
