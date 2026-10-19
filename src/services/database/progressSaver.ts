import type { WordProgress } from '@/types';
import { saveProgress } from './repositories';

/**
 * Batches word-progress writes during a game: updates are collected in memory
 * and flushed together (periodically and when the session ends).
 */
export class ProgressSaver {
  private queue = new Map<string, WordProgress>();
  private flushing: Promise<void> = Promise.resolve();

  add(p: WordProgress): void {
    this.queue.set(p.vocabularyId, p);
  }

  flush(): Promise<void> {
    if (this.queue.size === 0) return this.flushing;
    const rows = [...this.queue.values()];
    this.queue = new Map();
    this.flushing = this.flushing
      .then(() => saveProgress(rows))
      .catch((e: unknown) => {
        console.warn('[progress] save failed', e);
        // Put rows back (unless newer values arrived) so the next flush retries.
        for (const r of rows) if (!this.queue.has(r.vocabularyId)) this.queue.set(r.vocabularyId, r);
      });
    return this.flushing;
  }
}
