import { useEffect, useRef } from 'react';
import { ChevronRight } from 'lucide-react';
import { useSettingsStore } from '@/stores/settingsStore';
import { skinById } from '@/game/config/theme';
import { BrandTitle, Sunburst } from '@/components/common/Art';
import { CannonPreview } from '@/components/common/CannonPreview';
import { SignInOptions } from './AccountParts';

/** Shown when the game opens and nobody is signed in: sign in, or play as a guest. */
export function SignInMenu({ onGuest }: { onGuest: () => void }) {
  const skin = skinById(useSettingsStore((s) => s.settings.cannonSkin));
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onGuest();
    window.addEventListener('keydown', onKey);
    ref.current?.querySelector<HTMLElement>('button')?.focus();
    return () => window.removeEventListener('keydown', onKey);
  }, [onGuest]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-line/60 p-3" data-testid="signin-menu">
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label="Sign in"
        className="card animate-pop-in relative max-h-[94dvh] w-full max-w-sm overflow-x-hidden overflow-y-auto rounded-3xl bg-candy-purple p-5 text-white"
      >
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <Sunburst />
        </div>
        <div className="relative flex flex-col items-center text-center">
          <h1 className="text-4xl">
            <BrandTitle onColor>Word Shooter</BrandTitle>
          </h1>
          <span className="animate-bob mt-2">
            <CannonPreview skin={skin} size={92} />
          </span>
          <p className="mt-2 font-display text-xl font-bold">Save your progress</p>
          <p className="mt-1 mb-4 max-w-xs text-sm font-semibold text-white/90">
            Sign in to keep your words, coins, skins and trophies safe and play on any device.
          </p>
          <SignInOptions onColor />
          <button
            type="button"
            onClick={onGuest}
            className="mt-4 flex items-center gap-1 rounded-xl px-3 py-1.5 font-display font-bold text-white hover:bg-white/10"
            data-testid="play-as-guest"
          >
            Play as guest <ChevronRight size={18} strokeWidth={3} />
          </button>
          <p className="text-xs font-semibold text-white/75">You can sign in later in Settings.</p>
        </div>
      </div>
    </div>
  );
}
