import { useEffect, useRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { X } from 'lucide-react';

type Variant = 'pink' | 'purple' | 'mint' | 'sun' | 'white' | 'ghost' | 'danger';

const VARIANTS: Record<Variant, { cls: string; shadow: string }> = {
  pink: { cls: 'bg-candy-pink text-white', shadow: 'var(--color-candy-pink-dark)' },
  purple: { cls: 'bg-candy-purple text-white', shadow: 'var(--color-candy-purple-dark)' },
  mint: { cls: 'bg-candy-mint text-ink', shadow: 'var(--color-candy-mint-dark)' },
  sun: { cls: 'bg-candy-sun text-ink', shadow: 'var(--color-candy-sun-dark)' },
  white: { cls: 'bg-surface text-ink', shadow: 'rgba(93,80,160,.25)' },
  ghost: { cls: 'bg-transparent text-ink-soft hover:bg-surface !border-transparent !shadow-none', shadow: 'transparent' },
  danger: { cls: 'bg-candy-red text-white', shadow: '#d9526d' },
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: 'sm' | 'md' | 'lg';
  icon?: ReactNode;
}

export function Button({ variant = 'white', size = 'md', icon, className = '', children, style, ...rest }: ButtonProps) {
  const v = VARIANTS[variant];
  const sizes = { sm: 'px-3 py-1.5 text-sm rounded-xl', md: 'px-4 py-2 rounded-xl', lg: 'px-6 py-3 text-lg rounded-xl' };
  return (
    <button
      type="button"
      className={`btn-candy inline-flex items-center justify-center gap-2 font-semibold disabled:cursor-not-allowed disabled:opacity-50 ${v.cls} ${sizes[size]} ${className}`}
      style={{ ['--shadow' as string]: v.shadow, ...style }}
      {...rest}
    >
      {icon}
      {children}
    </button>
  );
}

export function Card({ className = '', children }: { className?: string; children: ReactNode }) {
  return <div className={`card rounded-2xl ${className}`}>{children}</div>;
}

export function Segmented<T extends string | number>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: { value: T; label: string; hint?: string }[];
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-2">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={String(o.value)}
            type="button"
            role="radio"
            aria-checked={active}
            title={o.hint}
            onClick={() => onChange(o.value)}
            className={`btn-candy rounded-xl px-4 py-2 font-semibold ${
              active ? 'bg-candy-purple text-white' : 'bg-surface text-ink-soft'
            }`}
            style={{ ['--shadow' as string]: active ? 'var(--color-candy-purple-dark)' : 'rgba(93,80,160,.2)' }}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description?: string;
}) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4 py-2">
      <span>
        <span className="block font-semibold">{label}</span>
        {description && <span className="block text-sm text-ink-soft">{description}</span>}
      </span>
      <span className="relative mt-1 inline-flex shrink-0">
        <input type="checkbox" className="peer sr-only" checked={checked} onChange={(e) => onChange(e.target.checked)} />
        <span className="h-7 w-12 rounded-full border-2 border-line bg-surface transition peer-checked:bg-candy-mint peer-focus-visible:outline-3 peer-focus-visible:outline-candy-purple" />
        <span className="absolute left-0.5 top-0.5 h-6 w-6 rounded-full border-2 border-line bg-surface transition peer-checked:translate-x-5" />
      </span>
    </label>
  );
}

/** A small on/off switch without a visible label (give it `label` for screen readers). */
export function Switch({ checked, onChange, label, className = '' }: { checked: boolean; onChange: (v: boolean) => void; label: string; className?: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      title={label}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-10 shrink-0 items-center rounded-full border-2 border-line transition focus-visible:outline-3 focus-visible:outline-candy-purple ${
        checked ? 'bg-candy-mint' : 'bg-surface'
      } ${className}`}
    >
      <span className={`absolute left-0.5 h-4 w-4 rounded-full border-2 border-line bg-surface transition ${checked ? 'translate-x-4' : ''}`} />
    </button>
  );
}

export function Modal({
  title,
  onClose,
  children,
  wide,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    ref.current?.querySelector<HTMLElement>('input, select, textarea, button')?.focus();
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-line/40 p-2 sm:items-center sm:p-4" onMouseDown={onClose}>
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onMouseDown={(e) => e.stopPropagation()}
        className={`card animate-pop-in flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-2xl bg-cream ${wide ? 'max-w-4xl' : 'max-w-lg'}`}
      >
        <div className="flex items-center justify-between border-b-2 border-line px-5 py-3">
          <h2 className="text-xl font-bold">{title}</h2>
          <button type="button" aria-label="Close" onClick={onClose} className="rounded-full p-1.5 text-ink-soft hover:bg-surface">
            <X size={20} />
          </button>
        </div>
        <div className="overflow-y-auto px-5 py-4">{children}</div>
      </div>
    </div>
  );
}

export function ConfirmDialog({
  title,
  message,
  confirmLabel = 'Delete',
  onConfirm,
  onCancel,
}: {
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Modal title={title} onClose={onCancel}>
      <div className="mb-5 text-ink-soft">{message}</div>
      <div className="flex justify-end gap-2">
        <Button onClick={onCancel}>Cancel</Button>
        <Button variant="danger" onClick={onConfirm}>
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}

export function EmptyState({ icon, title, children }: { icon: ReactNode; title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 px-4 py-10 text-center">
      <div className="animate-float text-candy-purple">{icon}</div>
      <h3 className="text-lg font-bold">{title}</h3>
      {children && <div className="max-w-sm text-ink-soft">{children}</div>}
    </div>
  );
}

export const inputCls =
  'w-full rounded-xl border-2 border-line bg-surface px-3 py-2 text-ink placeholder:text-ink-soft/60 focus:border-candy-purple focus:outline-none';
