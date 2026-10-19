import { useState, type ReactNode } from 'react';
import { FlaskConical } from 'lucide-react';
import { useAccountStore } from '@/stores/accountStore';
import { Button, ConfirmDialog } from '@/components/common/ui';

/** Account pieces shared by the profile, the settings screen and the sign-in menu. */

export const PROVIDER_LABEL = { google: 'Google', facebook: 'Facebook', dev: 'test sign-in' } as const;

function GoogleLogo() {
  return (
    <svg viewBox="0 0 48 48" width="20" height="20" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.3 0-9.7-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}

function FacebookLogo() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden>
      <circle cx="12" cy="12" r="12" fill="#fff" />
      <path fill="#1877F2" d="M13.4 24v-8.4h2.8l.4-3.3h-3.2v-2.1c0-.9.3-1.6 1.6-1.6h1.7V5.7c-.3 0-1.3-.1-2.5-.1-2.5 0-4.2 1.5-4.2 4.3v2.4H7.2v3.3H10V24h3.4z" />
    </svg>
  );
}

export function Avatar({ name, url, size = 72 }: { name: string; url: string | null; size?: number }) {
  if (url) {
    return (
      <img
        src={url}
        alt=""
        width={size}
        height={size}
        referrerPolicy="no-referrer"
        className="shrink-0 rounded-full border-[3px] border-line bg-surface object-cover"
        style={{ width: size, height: size }}
      />
    );
  }
  const initials = name
    .split(/\s+/)
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-full border-[3px] border-line bg-candy-sun font-display font-bold text-ink"
      style={{ width: size, height: size, fontSize: size * 0.38 }}
    >
      {initials || '?'}
    </span>
  );
}

/**
 * The sign-in buttons the server offers (Google, Facebook and, locally, test accounts).
 * `onColor` = drawn on a coloured card (white dashed test box).
 */
export function SignInOptions({ onColor = false }: { onColor?: boolean }) {
  const providers = useAccountStore((s) => s.providers);
  const signIn = useAccountStore((s) => s.signIn);
  const error = useAccountStore((s) => s.error);
  const google = providers.includes('google');
  const facebook = providers.includes('facebook');
  // Both buttons always show; one the server hasn't set up is greyed out.
  return (
    <div className="flex w-full flex-col gap-2.5">
      {error && <p className="rounded-xl border-2 border-line bg-candy-sun px-3 py-2 text-sm font-bold text-ink">{error}</p>}
      <button
        type="button"
        onClick={() => signIn('google')}
        disabled={!google}
        className="btn-candy flex items-center justify-center gap-3 rounded-xl bg-surface px-4 py-2.5 font-semibold text-ink disabled:cursor-not-allowed disabled:opacity-50"
        data-testid="signin-google"
      >
        <GoogleLogo /> Continue with Google
      </button>
      <button
        type="button"
        onClick={() => signIn('facebook')}
        disabled={!facebook}
        className="btn-candy flex items-center justify-center gap-3 rounded-xl bg-[#1877F2] px-4 py-2.5 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
        data-testid="signin-facebook"
      >
        <FacebookLogo /> Continue with Facebook
      </button>
      {(!google || !facebook) && (
        <p className={`text-xs font-semibold ${onColor ? 'text-white/80' : 'text-ink-soft'}`}>
          {!google && !facebook ? 'Google and Facebook sign-in' : !google ? 'Google sign-in' : 'Facebook sign-in'} isn’t set up on this server yet.
        </p>
      )}
      {providers.includes('dev') && (
        <div className={`rounded-xl border-2 border-dashed p-2.5 text-left ${onColor ? 'border-white/70' : 'border-line/40'}`}>
          <div className="mb-1.5 flex items-center gap-1.5 text-xs font-extrabold tracking-wide uppercase">
            <FlaskConical size={14} /> Local testing only
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="white" onClick={() => window.location.assign('/api/auth/dev/start?name=Test%20player')}>
              Test player
            </Button>
            <Button size="sm" variant="sun" onClick={() => window.location.assign('/api/auth/dev/start?name=Skin%20Tester&coins=50000')} data-testid="dev-rich">
              Tester · 50,000 coins
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Sign-out with a confirmation (it resets this device to a fresh guest) and a second
 * warning when the latest changes could not be saved to the account.
 */
export function useSignOut(): { request: () => void; busy: boolean; dialog: ReactNode } {
  const signOut = useAccountStore((s) => s.signOut);
  const [step, setStep] = useState<'confirm' | 'unsynced' | null>(null);
  const [busy, setBusy] = useState(false);

  const run = async (force: boolean) => {
    setStep(null);
    setBusy(true);
    const ok = await signOut(force);
    setBusy(false);
    if (!ok) setStep('unsynced');
  };

  const dialog =
    step === 'confirm' ? (
      <ConfirmDialog
        title="Sign out?"
        message="Your words, coins, skins and trophies stay saved in your account. This device goes back to a fresh guest game until you sign in again."
        confirmLabel="Sign out"
        onConfirm={() => void run(false)}
        onCancel={() => setStep(null)}
      />
    ) : step === 'unsynced' ? (
      <ConfirmDialog
        title="Sign out without saving?"
        message="Your latest changes couldn't be saved to your account (maybe you're offline). If you sign out now, those changes are lost on this device."
        confirmLabel="Sign out anyway"
        onConfirm={() => void run(true)}
        onCancel={() => setStep(null)}
      />
    ) : null;

  return { request: () => setStep('confirm'), busy, dialog };
}
