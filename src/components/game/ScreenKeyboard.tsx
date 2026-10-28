import { memo } from 'react';
import { Delete, Keyboard } from 'lucide-react';

const ROWS = ['qwertyuiop', 'asdfghjkl', 'zxcvbnm'];

interface Props {
  onKey(ch: string): void;
  onBackspace(): void;
  /** Switch to the device's own keyboard. */
  onSystemKeyboard(): void;
  disabled?: boolean;
}

/**
 * A compact in-game keyboard for touch screens. It is shorter than a phone's keyboard and,
 * unlike it, never resizes the page, so the play field (and the Phaser canvas) stays put.
 * Keys act on pointerdown so fast typing isn't slowed by the click delay.
 */
export const ScreenKeyboard = memo(function ScreenKeyboard({ onKey, onBackspace, onSystemKeyboard, disabled = false }: Props) {
  const press = (fn: () => void) => (e: React.PointerEvent) => {
    e.preventDefault();
    if (!disabled) fn();
  };
  const key =
    'btn-candy flex h-10 min-w-0 flex-1 items-center justify-center rounded-lg bg-surface font-display text-lg font-bold text-ink select-none touch-manipulation';
  const shadow = { ['--shadow' as string]: 'var(--color-line)' };

  return (
    <div className={`flex flex-col gap-1.5 pt-1.5 ${disabled ? 'opacity-50' : ''}`} data-testid="screen-keyboard" aria-label="Keyboard">
      {ROWS.map((row, r) => (
        <div key={row} className={`flex gap-1 ${r === 1 ? 'px-[5%]' : ''}`}>
          {r === 2 && (
            <button type="button" className={`${key} flex-[1.4]`} style={shadow} onPointerDown={press(() => onKey("'"))} aria-label="Apostrophe">
              '
            </button>
          )}
          {[...row].map((ch) => (
            <button key={ch} type="button" className={key} style={shadow} onPointerDown={press(() => onKey(ch))}>
              {ch}
            </button>
          ))}
          {r === 2 && (
            <button
              type="button"
              className={`${key} flex-[1.4]`}
              style={shadow}
              onPointerDown={press(onBackspace)}
              aria-label="Backspace"
            >
              <Delete size={20} />
            </button>
          )}
        </div>
      ))}
      <div className="flex gap-1">
        <button type="button" className={`${key} flex-[1.4]`} style={shadow} onClick={onSystemKeyboard} aria-label="Use the device keyboard">
          <Keyboard size={20} />
        </button>
        <button type="button" className={key} style={shadow} onPointerDown={press(() => onKey('-'))} aria-label="Hyphen">
          -
        </button>
        <button type="button" className={`${key} flex-[6] text-sm text-ink-soft`} style={shadow} onPointerDown={press(() => onKey(' '))}>
          space
        </button>
      </div>
    </div>
  );
});
