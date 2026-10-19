import { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import { CornerDownLeft } from 'lucide-react';
import type { GameBridge } from '@/game/GameBridge';

export interface AnswerInputHandle {
  focus(): void;
}

interface Props {
  bridge: GameBridge;
  disabled: boolean;
  placeholder: string;
}

/** The answer field. Enter submits; correct answers clear it, wrong ones shake and select it. */
export const AnswerInput = forwardRef<AnswerInputHandle, Props>(function AnswerInput({ bridge, disabled, placeholder }, ref) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState('');
  const [state, setState] = useState<'idle' | 'wrong' | 'right'>('idle');
  const [focused, setFocused] = useState(false);
  const [shakeKey, setShakeKey] = useState(0);

  useImperativeHandle(ref, () => ({ focus: () => inputRef.current?.focus({ preventScroll: true }) }), []);

  const submit = () => {
    const res = bridge.submit(value);
    if (res.kind === 'correct') {
      setValue('');
      bridge.setTyped('');
      setState('right');
      window.setTimeout(() => setState('idle'), 250);
    } else if (res.kind === 'incorrect' || res.kind === 'empty') {
      setState('wrong');
      setShakeKey((k) => k + 1);
      inputRef.current?.select();
      window.setTimeout(() => setState('idle'), 450);
    }
  };

  const border =
    state === 'wrong' ? 'border-candy-red bg-[#fff0f3]' : state === 'right' ? 'border-candy-mint bg-[#effcf9]' : 'border-white bg-white';

  return (
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
          onChange={(e) => {
            setValue(e.target.value);
            bridge.setTyped(e.target.value);
          }}
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
          inputMode="text"
          maxLength={80}
          className={`w-full rounded-2xl border-[3px] px-4 py-3 text-center text-xl font-semibold tracking-wide shadow-md outline-none transition-colors placeholder:text-base placeholder:font-medium placeholder:text-ink-soft/50 focus:border-candy-purple ${border}`}
        />
        {!focused && !disabled && (
          <button
            type="button"
            onClick={() => inputRef.current?.focus()}
            className="absolute inset-0 flex items-center justify-center rounded-2xl bg-white/70 text-sm font-bold text-candy-purple-dark"
          >
            Tap here (or just start typing) to aim ✨
          </button>
        )}
      </div>
      <button
        type="submit"
        disabled={disabled}
        aria-label="Fire"
        className="btn-candy flex h-[54px] w-[54px] shrink-0 items-center justify-center rounded-2xl bg-candy-pink text-white disabled:opacity-50"
        style={{ ['--shadow' as string]: 'var(--color-candy-pink-dark)' }}
      >
        <CornerDownLeft size={24} />
      </button>
    </form>
  );
});
