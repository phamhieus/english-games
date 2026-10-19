import type { CSSProperties, ReactNode } from 'react';
import { effectsOf, rarityOf, type CannonSkin } from '@/game/config/theme';
import { SHOT_MOTION } from '@/game/config/cannonArt';
import { ShotPreview } from '@/components/common/CannonPreview';

/**
 * Test-fire show for the skin shop: muzzle flash, a burst out of the muzzle (petals for
 * flower skins, stars for fantasy/legendary, confetti otherwise), the skin's shot flying
 * up with a trail for rarer skins, and an impact burst (fireworks for epic+).
 * Everything is CSS-animated and restarts whenever `shotKey` changes.
 */

const hex = (n: number) => `#${n.toString(16).padStart(6, '0')}`;
const RAINBOW = ['#ff6b8a', '#ffc43d', '#7ed957', '#7cc4f5', '#b388ff'];
const INK = '#1f2a44';

const rnd = (i: number, k: number) => {
  const x = Math.sin(i * 127.1 + k * 311.7) * 43758.5453;
  return x - Math.floor(x);
};

const light = (c: number) => ((c >> 16) & 255) * 0.299 + ((c >> 8) & 255) * 0.587 + (c & 255) * 0.114 > 110;

function Piece({ shape, color, size }: { shape: 'petal' | 'star' | 'dot'; color: string; size: number }) {
  if (shape === 'dot') return <span className="block rounded-full border-2 border-line" style={{ width: size, height: size, background: color }} />;
  return (
    <svg viewBox="-12 -13 24 26" width={size} height={size} aria-hidden>
      {shape === 'petal' ? (
        <path d="M0 12C-9 6 -9 -6 -3 -12L0 -8L3 -12C9 -6 9 6 0 12Z" fill={color} stroke={INK} strokeWidth="1.6" />
      ) : (
        <path d="M0 -11L3 -3L11 0L3 3L0 11L-3 3L-11 0L-3 -3Z" fill={color} stroke={INK} strokeWidth="1.6" strokeLinejoin="round" />
      )}
    </svg>
  );
}

/** `bottom` = muzzle height (px) above the bottom of the stage; `fly` = how far the shot travels up. */
export function FireFx({ skin, shotKey, bottom, fly }: { skin: CannonSkin; shotKey: number; bottom: number; fly: number }) {
  if (shotKey === 0) return null;
  const rarity = rarityOf(skin);
  const fx = effectsOf(skin);
  const petals = skin.group === 'Flowers';
  const shape = petals ? 'petal' : skin.group === 'Fantasy' || rarity === 'legendary' ? 'star' : 'dot';
  const palette = fx.rainbow
    ? RAINBOW
    : (petals ? [skin.accent, skin.bodyColor, 0xffffff, 0xffb7c5] : [skin.accent, skin.trim, skin.barrel, 0xffffff]).filter(light).map(hex);
  const colors = palette.length ? palette : ['#ffffff'];
  const at = (b: number): CSSProperties => ({ position: 'absolute', left: '50%', bottom: b, opacity: 0 });
  const seed = shotKey * 7;

  const burst = (n: number, spread: number, dist: [number, number], size: [number, number], delay: number, kind: typeof shape, base: number): ReactNode[] =>
    Array.from({ length: n }, (_, i) => {
      // angle around straight up (-90°), ±spread
      const a = ((-90 + (rnd(i + seed, 1) * 2 - 1) * spread) * Math.PI) / 180;
      const d = dist[0] + rnd(i + seed, 2) * (dist[1] - dist[0]);
      return (
        <span
          key={`${base}-${i}`}
          style={{
            ...at(base),
            animation: `fx-burst ${0.65 + rnd(i + seed, 3) * 0.35}s cubic-bezier(.2,.7,.3,1) ${delay}s forwards`,
            ['--dx' as string]: `${Math.cos(a) * d}px`,
            ['--dy' as string]: `${Math.sin(a) * d + 30}px`,
            ['--rot' as string]: `${(rnd(i + seed, 4) - 0.5) * 720}deg`,
          }}
        >
          <Piece shape={kind} color={colors[i % colors.length]!} size={size[0] + rnd(i + seed, 5) * (size[1] - size[0])} />
        </span>
      );
    });

  const muzzleCount = (petals ? { common: 16, rare: 20, epic: 24, legendary: 30 } : { common: 10, rare: 14, epic: 18, legendary: 24 })[rarity];
  const spin = SHOT_MOTION[skin.shot] === 'spin' ? '540deg' : '0deg';
  const hitAt = bottom - fly; // fly is negative (upwards)

  return (
    <span key={shotKey} className="pointer-events-none absolute inset-0" aria-hidden>
      {/* muzzle flash */}
      <span
        className="rounded-full"
        style={{ ...at(bottom), width: 90, height: 90, background: `radial-gradient(circle, #fff 0%, ${colors[0]} 45%, transparent 70%)`, animation: 'fx-flash .35s ease-out forwards' }}
      />
      {/* burst out of the muzzle */}
      {burst(muzzleCount, petals ? 75 : 55, petals ? [90, 170] : [70, 140], petals ? [18, 28] : [10, 16], 0, shape, bottom)}
      {/* flower skins: a second, lazier wave of petals */}
      {petals && burst(12, 40, [120, 200], [14, 22], 0.12, 'petal', bottom)}
      {/* trail ghosts for rare+ */}
      {petals &&
        [1, 2, 3, 4, 5, 6].map((g) => (
          <span key={`p${g}`} style={{ ...at(bottom), animation: `fx-ghost .7s ease-in ${g * 0.045}s forwards`, ['--fly' as string]: `${fly}px` }}>
            <span className="block" style={{ transform: `translate(${(g % 2 ? -1 : 1) * (8 + g * 3)}px, 0) rotate(${g * 50}deg)` }}>
              <Piece shape="petal" color={colors[g % colors.length]!} size={22 - g} />
            </span>
          </span>
        ))}
      {fx.trail &&
        !petals &&
        [1, 2, 3, 4].map((g) => (
          <span key={`g${g}`} style={{ ...at(bottom), animation: `fx-ghost .6s ease-in ${g * 0.05}s forwards`, ['--fly' as string]: `${fly}px` }}>
            {fx.rainbow ? (
              <span className="block h-4 w-4 rounded-full" style={{ background: RAINBOW[g % RAINBOW.length] }} />
            ) : (
              <ShotPreview skin={skin} size={30 - g * 3} />
            )}
          </span>
        ))}
      {/* the shot */}
      <span style={{ ...at(bottom), opacity: 1, animation: 'fx-shot .55s ease-in forwards', ['--fly' as string]: `${fly}px`, ['--spin' as string]: spin }}>
        <span className="relative block">
          {fx.aura && <span className="absolute inset-[-10px] animate-[pulse-soft_.3s_ease-in-out_infinite] rounded-full" style={{ background: `${colors[0]}66` }} />}
          <ShotPreview skin={skin} size={{ common: 54, rare: 58, epic: 62, legendary: 68 }[rarity]} />
        </span>
      </span>
      {/* impact */}
      <span
        className="rounded-full border-4"
        style={{ ...at(hitAt), width: 80, height: 80, borderColor: colors[0], animation: 'fx-flash .5s ease-out .5s forwards' }}
      />
      {burst(fx.fireworks ? 16 : 8, 180, fx.fireworks ? [60, 130] : [35, 70], fx.fireworks ? [12, 18] : [8, 12], 0.5, fx.fireworks ? 'star' : shape, hitAt)}
      {fx.fireworks && burst(10, 180, [90, 160], [8, 12], 0.62, 'dot', hitAt)}
    </span>
  );
}
