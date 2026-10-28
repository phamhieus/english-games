import { useEffect } from 'react';
import type { VocabularyItem } from '@/types';
import { Card } from '@/components/common/ui';

/** Longest list shown; the rest is summed up as "+N more". */
const MAX_SHOWN = 30;

/** 1 s plus a little per word, at most 3 s. */
export const previewMs = (count: number) => Math.min(3000, 1000 + count * 150);

/**
 * Pop-up listing the words of the game that is about to start. Closes by itself after
 * `previewMs`, or earlier on a tap or key press.
 */
export function WordPreview({ words, onDone }: { words: readonly VocabularyItem[]; onDone: () => void }) {
  useEffect(() => {
    const timer = window.setTimeout(onDone, previewMs(words.length));
    const onKey = () => onDone();
    window.addEventListener('keydown', onKey);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('keydown', onKey);
    };
  }, [words.length, onDone]);

  const shown = words.slice(0, MAX_SHOWN);
  const more = words.length - shown.length;

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-line/25 p-4" onPointerDown={onDone}>
      <Card className="animate-pop-in flex max-h-full w-full max-w-md flex-col gap-3 overflow-hidden bg-cream p-5 text-center" data-testid="word-preview">
        <h2 className="text-xl font-bold">Words in this game ({words.length})</h2>
        <ul className="flex flex-wrap justify-center gap-1.5 overflow-hidden">
          {shown.map((w) => (
            <li key={w.id} className="rounded-full border-2 border-line bg-surface px-2.5 py-0.5 text-sm font-semibold">
              {w.english}
            </li>
          ))}
          {more > 0 && <li className="px-2 py-0.5 text-sm font-semibold text-ink-soft">+{more} more</li>}
        </ul>
        <p className="text-xs text-ink-soft">Get ready…</p>
      </Card>
    </div>
  );
}
