import { useEffect, useRef, useState } from 'react';
import { Check, Crosshair, Lock, ShoppingBag, Sparkles } from 'lucide-react';
import { CANNON_SKINS, effectsOf, RARITY_INFO, rarityOf, skinById, type CannonSkin, type SkinGroup } from '@/game/config/theme';
import { isSkinOwned } from '@/features/progression/progression';
import { useProgress } from '@/hooks/useProgress';
import { sfx } from '@/services/audio/sfx';
import { useSettingsStore } from '@/stores/settingsStore';
import { Button } from '@/components/common/ui';
import { CannonPreview, ShotPreview } from '@/components/common/CannonPreview';
import { BrandTitle, Coin, Sunburst } from '@/components/common/Art';
import { FireFx } from './FireFx';

const LABELS = {
  body: { round: 'Round', square: 'Boxy', hex: 'Hexagon', egg: 'Egg', dome: 'Dome', tulip: 'Tulip cup' },
  barrelShape: { tube: 'Tube', tapered: 'Tapered', flared: 'Flared', double: 'Double', chunky: 'Chunky' },
  legs: { feet: 'Feet', wheels: 'Wheels', treads: 'Treads', jets: 'Jets' },
} as const;

const SHOT_NAMES: Record<CannonSkin['shot'], string> = {
  bubble: 'Bubble',
  heart: 'Heart',
  carrot: 'Carrot',
  bamboo: 'Bamboo',
  leaf: 'Leaf',
  egg: 'Dino egg',
  drop: 'Water drop',
  sun: 'Sunburst',
  bolt: 'Lightning',
  shuriken: 'Shuriken',
  fireball: 'Fireball',
  gem: 'Gem',
  moon: 'Moon',
  feather: 'Feather',
  petal: 'Sakura petal',
  seed: 'Sunflower seed',
  rosebud: 'Rosebud',
  lily: 'Lotus bloom',
  pollen: 'Pollen puff',
};

const GROUPS: ('All' | SkinGroup)[] = ['All', 'Classic', 'Animals', 'Flowers', 'Fantasy'];
/** Shop order: cheapest first. */
const SHOP = [...CANNON_SKINS].sort((a, b) => a.price - b.price);

function RarityBadge({ skin }: { skin: CannonSkin }) {
  const info = RARITY_INFO[rarityOf(skin)];
  return (
    <span className="rounded-full border-2 border-line px-2 text-[10px] font-extrabold tracking-wide text-line uppercase" style={{ background: info.color }}>
      {info.label}
    </span>
  );
}

const ORBIT_COLORS = ['#ff6b8a', '#ffc43d', '#7ed957', '#7cc4f5'];

/** Rarity effects around a preview: glowing aura (epic+) and orbiting stars (legendary). */
function PreviewFx({ skin, size }: { skin: CannonSkin; size: number }) {
  const fx = effectsOf(skin);
  const accent = `#${skin.accent.toString(16).padStart(6, '0')}`;
  return (
    <>
      {fx.aura && (
        <span
          className="absolute left-1/2 -translate-x-1/2 animate-[pulse-soft_1.8s_ease-in-out_infinite] rounded-full"
          style={{
            width: size * 0.95,
            height: size * 0.95,
            bottom: size * 0.08,
            background: `radial-gradient(circle, ${accent}88 0%, ${accent}33 55%, transparent 72%)`,
          }}
        />
      )}
      {fx.orbit && (
        <span className="absolute left-1/2 animate-spin" style={{ width: size, height: size, bottom: size * 0.02, marginLeft: -size / 2, animationDuration: '4s' }}>
          {ORBIT_COLORS.map((c, i) => (
            <svg
              key={c}
              viewBox="-10 -10 20 20"
              width={size * 0.13}
              className="absolute"
              style={{
                left: `${50 + 46 * Math.cos((i * Math.PI) / 2)}%`,
                top: `${50 + 46 * Math.sin((i * Math.PI) / 2)}%`,
                transform: 'translate(-50%,-50%)',
              }}
              aria-hidden
            >
              <path d="M0 -9L2.6 -2.6L9 0L2.6 2.6L0 9L-2.6 2.6L-9 0L-2.6 -2.6Z" fill={c} stroke="#1f2a44" strokeWidth="1.5" />
            </svg>
          ))}
        </span>
      )}
    </>
  );
}
const GROUP_TILE: Record<SkinGroup, string> = {
  Classic: 'bg-candy-blue',
  Animals: 'bg-candy-sun',
  Flowers: 'bg-[#ff9fc8]',
  Fantasy: 'bg-[#b7a4f7]',
};

export function SkinsScreen() {
  const equippedId = useSettingsStore((s) => s.settings.cannonSkin);
  const owned = useSettingsStore((s) => s.settings.ownedSkins);
  const spent = useSettingsStore((s) => s.settings.coinsSpent);
  const update = useSettingsStore((s) => s.update);
  const progress = useProgress();
  const coins = progress?.coins ?? 0;
  const [justBought, setJustBought] = useState<string | null>(null);
  const [previewId, setPreviewId] = useState(equippedId);
  const [firing, setFiring] = useState(false);
  const [shotKey, setShotKey] = useState(0);
  const [group, setGroup] = useState<'All' | SkinGroup>('All');
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const skin = skinById(previewId);
  const equipped = skin.id === skinById(equippedId).id;

  const testFire = () => {
    setFiring(true);
    setShotKey((k) => k + 1);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setFiring(false), 700);
  };

  const isOwned = isSkinOwned(skin, owned);
  const canAfford = coins >= skin.price;
  const perks = RARITY_INFO[rarityOf(skin)].perks;

  const buy = () => {
    if (isOwned || !progress || !canAfford) return;
    update({ ownedSkins: [...owned, skin.id], cannonSkin: skin.id, coinsSpent: spent + skin.price });
    sfx.play('complete');
    setJustBought(skin.id);
    testFire();
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(320px,400px)_1fr]">
      {/* Stage */}
      <section className="card relative flex flex-col items-center overflow-hidden rounded-2xl bg-candy-purple p-5 text-white lg:sticky lg:top-0 lg:self-start">
        <Sunburst />
        <div className="relative flex w-full items-center justify-between">
          <h1 className="text-3xl">
            <BrandTitle onColor>Skin shop</BrandTitle>
          </h1>
          <span className="flex items-center gap-1.5 rounded-full border-2 border-line bg-surface py-0.5 pr-3 pl-1 text-ink shadow-[0_2px_0_var(--color-line)]">
            <Coin size={20} />
            <span className="font-display font-bold tabular-nums">{coins}</span>
          </span>
        </div>

        <button
          type="button"
          onClick={testFire}
          aria-label={`Test fire ${skin.name}`}
          className="relative mt-4 flex h-72 w-full items-end justify-center"
        >
          {/* pedestal */}
          <span className="absolute bottom-3 h-7 w-52 rounded-[50%] bg-candy-purple-dark" />
          <PreviewFx skin={skin} size={210} />
          <span className={`relative ${firing ? 'animate-[recoil_.25s_ease-out]' : 'animate-bob'}`}>
            <CannonPreview skin={skin} size={176} happy={firing} mouthOpen={firing ? 1 : 0} />
          </span>
          {/* muzzle sits ~185px above the stage bottom for a 176px cannon */}
          <FireFx skin={skin} shotKey={shotKey} bottom={185} fly={-150} />
          {justBought === skin.id && (
            <span className="animate-pop-in absolute top-2 left-1/2 -translate-x-1/2 rounded-full border-2 border-line bg-candy-sun px-3 py-1 font-display text-sm font-bold text-ink">
              Unlocked!
            </span>
          )}
        </button>

        <div className="relative mt-3 text-center">
          <h2 className="title-3d text-4xl text-white">{skin.name}</h2>
          <p className="mt-1 font-semibold text-white/85">{skin.tagline}</p>
          <div className="mt-2 flex flex-wrap items-center justify-center gap-1.5">
            <RarityBadge skin={skin} />
            {perks.map((perk) => (
              <span key={perk} className="rounded-full bg-white/20 px-2 py-0.5 text-xs font-bold">
                {perk}
              </span>
            ))}
          </div>
        </div>

        <dl className="relative mt-4 grid w-full grid-cols-2 gap-2 text-sm">
          {(
            [
              ['Body', LABELS.body[skin.body]],
              ['Barrel', LABELS.barrelShape[skin.barrelShape]],
              ['Moves on', LABELS.legs[skin.legs]],
            ] as const
          ).map(([k, v]) => (
            <div key={k} className="rounded-xl border-2 border-line bg-surface px-3 py-1.5 text-ink">
              <dt className="text-xs font-bold text-ink-soft uppercase">{k}</dt>
              <dd className="font-display font-semibold">{v}</dd>
            </div>
          ))}
          <div className="flex items-center gap-2 rounded-xl border-2 border-line bg-candy-sun px-3 py-1.5 text-ink">
            <ShotPreview skin={skin} size={26} />
            <div>
              <dt className="text-xs font-bold uppercase">Shoots</dt>
              <dd className="font-display font-semibold">{SHOT_NAMES[skin.shot]}</dd>
            </div>
          </div>
        </dl>

        <div className="relative mt-4 flex w-full gap-2">
          <Button variant="white" className="flex-1" icon={<Crosshair size={18} />} onClick={testFire}>
            Test fire
          </Button>
          {!isOwned ? (
            <Button variant="sun" className="flex-1" icon={<ShoppingBag size={18} />} disabled={!canAfford} onClick={buy} data-testid="buy-skin">
              Buy <Coin size={18} /> {skin.price}
            </Button>
          ) : equipped ? (
            <span className="flex flex-1 items-center justify-center gap-2 rounded-xl border-2 border-line bg-candy-mint px-4 py-2 font-display font-semibold text-ink">
              <Check size={18} strokeWidth={3} /> Equipped
            </span>
          ) : (
            <Button variant="sun" className="flex-1" icon={<Sparkles size={18} />} onClick={() => update({ cannonSkin: skin.id })} data-testid="equip-skin">
              Equip
            </Button>
          )}
        </div>
        {!isOwned && !canAfford && (
          <p className="relative mt-2 text-sm font-semibold text-white/90">You need {skin.price - coins} more coins. Play games to earn them!</p>
        )}
      </section>

      {/* Collection */}
      <section className="card rounded-2xl p-4 sm:p-5">
        <h2 className="mb-1 text-xl font-bold">Choose your cannon</h2>
        <p className="mb-3 text-sm text-ink-soft">
          Every skin has its own shape and shot. Rarer skins add trails, auras and fireworks. Earn coins by playing, then buy the ones you like.
        </p>
        <div className="mb-4 flex flex-wrap gap-2" role="tablist" aria-label="Skin groups">
          {GROUPS.map((g) => {
            const count = g === 'All' ? CANNON_SKINS.length : CANNON_SKINS.filter((s) => s.group === g).length;
            const active = g === group;
            return (
              <button
                key={g}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setGroup(g)}
                className={`btn-candy flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-bold ${active ? 'bg-line text-white' : 'bg-surface'}`}
              >
                {g !== 'All' && <span className={`h-3 w-3 rounded-full border-2 border-line ${GROUP_TILE[g]}`} />}
                {g}
                <span className={active ? 'text-white/70' : 'text-ink-soft'}>{count}</span>
              </button>
            );
          })}
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4" role="radiogroup" aria-label="Cannon skin">
          {SHOP.filter((s) => group === 'All' || s.group === group).map((s) => {
            const isPreview = s.id === skin.id;
            const isEquipped = s.id === skinById(equippedId).id;
            const has = isSkinOwned(s, owned);
            return (
              <button
                key={s.id}
                type="button"
                role="radio"
                aria-checked={isPreview}
                data-testid={`skin-${s.id}`}
                onClick={() => setPreviewId(s.id)}
                onDoubleClick={() => has && update({ cannonSkin: s.id })}
                className={`pick group relative flex flex-col items-center gap-1 rounded-2xl px-2 pt-3 pb-2 ${
                  isPreview ? 'bg-tint-purple' : 'bg-surface'
                }`}
              >
                {isEquipped && (
                  <span className="absolute top-2 left-2 flex h-6 w-6 items-center justify-center rounded-full border-2 border-line bg-candy-mint">
                    <Check size={14} strokeWidth={3} />
                  </span>
                )}
                <span className="absolute top-2 right-2">
                  <ShotPreview skin={s} size={22} />
                </span>
                <span className="relative flex h-[104px] w-full items-end justify-center">
                  <PreviewFx skin={s} size={100} />
                  <span className={`relative transition-transform group-hover:-translate-y-1 ${has ? '' : 'grayscale-[35%]'}`}>
                    <CannonPreview skin={s} size={84} />
                  </span>
                </span>
                <span className="font-display font-bold">{s.name}</span>
                <RarityBadge skin={s} />
                {has ? (
                  <span className="text-xs font-bold text-candy-mint-dark">{isEquipped ? 'Equipped' : 'Owned'}</span>
                ) : (
                  <span className={`flex items-center gap-1 text-sm font-bold ${coins >= s.price ? 'text-ink' : 'text-ink-soft'}`}>
                    <Lock size={12} strokeWidth={3} /> <Coin size={16} /> {s.price}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
