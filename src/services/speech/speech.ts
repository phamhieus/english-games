export type SpeechLang = 'en' | 'vi';

/**
 * Thin wrapper around the browser SpeechSynthesis API.
 * Every call is fire-and-forget and never throws: gameplay must not depend on it.
 */
class SpeechService {
  private voices: SpeechSynthesisVoice[] = [];

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
      if (opts.interrupt && (synth.speaking || synth.pending)) synth.cancel();
      const u = new SpeechSynthesisUtterance(text);
      if (voice) u.voice = voice;
      u.lang = voice?.lang ?? (lang === 'en' ? 'en-US' : 'vi-VN');
      u.rate = Math.max(0.5, Math.min(1.5, opts.rate ?? 0.9));
      u.onerror = () => undefined;
      synth.speak(u);
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
