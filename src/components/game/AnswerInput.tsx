import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { CornerDownLeft } from 'lucide-react';
import type { GameBridge } from '@/game/GameBridge';
import { ScreenKeyboard } from './ScreenKeyboard';

export interface AnswerInputHandle {
  focus(): void;
}

interface Props {
  bridge: GameBridge;
  disabled: boolean;
  placeholder: string;
  /** Shorter box when the keyboard leaves little room. */
  compact?: boolean;
  /** Type on the in-game keyboard; the device keyboard stays closed. */
  screenKeyboard?: boolean;
  /** The player asked for the device keyboard instead. */
  onSystemKeyboard?: () => void;
}

/** The answer field. Completing a word fires automatically (Enter also submits); correct answers clear it, wrong ones shake and select it. */
export const AnswerInput = forwardRef<AnswerInputHandle, Props>(function AnswerInput(
  { bridge, disabled, placeholder, compact = false, screenKeyboard = false, onSystemKeyboard },
  ref,
) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValueState] = useState('');
  const valueRef = useRef('');
  // Screen keyboard: after a wrong answer the next key replaces the text (like the selection does).
  const replaceRef = useRef(false);
  const setValue = (v: string) => {
    valueRef.current = v;
    setValueState(v);
  };
  const [state, setState] = useState<'idle' | 'wrong' | 'right'>('idle');
  const [focused, setFocused] = useState(false);
  const [shakeKey, setShakeKey] = useState(0);

  useImperativeHandle(ref, () => ({ focus: () => !screenKeyboard && inputRef.current?.focus({ preventScroll: true }) }), [screenKeyboard]);

  const submit = (text = valueRef.current, auto = false) => {
    replaceRef.current = false;
    const res = auto ? bridge.submitIfComplete(text) : bridge.submit(text);
    if (res.kind === 'correct') {
      setValue('');
      bridge.setTyped('');
      setState('right');
      window.setTimeout(() => setState('idle'), 250);
    } else if (res.kind === 'incorrect') {
      setState('wrong');
      setShakeKey((k) => k + 1);
      if (screenKeyboard) replaceRef.current = true;
      else inputRef.current?.select();
      window.setTimeout(() => setState('idle'), 450);
    }
  };

  const change = (next: string) => {
    setValue(next);
    bridge.setTyped(next);
    submit(next, true);
  };
  const changeRef = useRef(change);
  changeRef.current = change;
  const submitRef = useRef(submit);
  submitRef.current = submit;

  const typeKey = useCallback((ch: string) => {
    const base = replaceRef.current ? '' : valueRef.current;
    if (base.length < 80) changeRef.current(base + ch);
  }, []);
  const backspace = useCallback(() => {
    changeRef.current(replaceRef.current ? '' : valueRef.current.slice(0, -1));
  }, []);
  const switchToSystemKeyboard = useCallback(() => {
    // Focus synchronously, inside the tap, or the phone won't open its keyboard.
    const el = inputRef.current;
    if (el) {
      el.readOnly = false;
      el.inputMode = 'text';
      el.focus({ preventScroll: true });
    }
    onSystemKeyboard?.();
  }, [onSystemKeyboard]);

  // A hardware keyboard (e.g. a tablet's) still works while the field is read-only.
  useEffect(() => {
    if (!screenKeyboard || disabled) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'Backspace') backspace();
      else if (e.key === 'Enter') submitRef.current();
      else if (e.key.length === 1) typeKey(e.key);
      else return;
      e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [screenKeyboard, disabled, typeKey, backspace]);

  const border =
    state === 'wrong' ? 'border-candy-red bg-[#fff0f3]' : state === 'right' ? 'border-candy-mint bg-[#effcf9]' : 'border-line bg-surface';

  return (
    <>
      <form
        className="relative flex items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <div key={shakeKey} className={`relative flex-1 ${state === 'wrong' ? 'animate-shake' : ''}`}>
          <input
            ref={inputRef}
            value={value}
            disabled={disabled}
            readOnly={screenKeyboard}
            tabIndex={screenKeyboard ? -1 : undefined}
            onChange={(e) => change(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            aria-label="Type your answer and press Enter"
            data-testid="answer-input"
            placeholder={placeholder}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            enterKeyHint="go"
            inputMode={screenKeyboard ? 'none' : 'text'}
            maxLength={80}
            className={`w-full ${screenKeyboard ? 'pointer-events-none' : ''} rounded-xl border-[3px] px-4 text-center font-semibold ${compact ? 'py-1.5 text-lg' : 'py-3 text-xl'} tracking-wide shadow-[0_3px_0_var(--color-line)] outline-none transition-colors placeholder:text-base placeholder:font-medium placeholder:text-ink-soft/50 focus:border-candy-purple ${border}`}
          />
          {!focused && !disabled && !screenKeyboard && (
            <button
              type="button"
              onClick={() => inputRef.current?.focus()}
              className="absolute inset-0 flex items-center justify-center rounded-xl bg-surface text-sm font-bold text-candy-purple-dark"
            >
              {compact ? 'Tap to type' : 'Tap here (or just start typing) to aim ✨'}
            </button>
          )}
        </div>
        <button
          type="submit"
          disabled={disabled}
          aria-label="Fire"
          className={`btn-candy flex shrink-0 items-center justify-center rounded-xl bg-candy-pink text-white disabled:opacity-50 ${compact ? 'h-[44px] w-[44px]' : 'h-[54px] w-[54px]'}`}
          style={{ ['--shadow' as string]: 'var(--color-candy-pink-dark)' }}
        >
          <CornerDownLeft size={24} />
        </button>
      </form>
      {screenKeyboard && <ScreenKeyboard onKey={typeKey} onBackspace={backspace} onSystemKeyboard={switchToSystemKeyboard} disabled={disabled} compact={compact} />}
    </>
  );
});
