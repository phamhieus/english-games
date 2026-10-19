import { useMemo } from 'react';
import type { CannonSkin } from '@/game/config/theme';
import { cannonSvg, PREVIEW_BOX, SHOT_BOX, shotSvg } from '@/game/config/cannonArt';

/** The cannon as an inline SVG, drawn from the same artwork the game uses (cannonArt.ts). */
export function CannonPreview({
  skin,
  size = 72,
  happy = false,
  mouthOpen = 0,
}: {
  skin: CannonSkin;
  size?: number;
  happy?: boolean;
  /** 0..1, how wide the muzzle "mouth" is open (firing). */
  mouthOpen?: number;
}) {
  // Markup is generated from our own skin constants, never from user input.
  const html = useMemo(() => cannonSvg(skin, happy, mouthOpen), [skin, happy, mouthOpen]);
  const b = PREVIEW_BOX;
  return (
    <svg
      width={size}
      height={(size * b.h) / b.w}
      viewBox={`${b.x} ${b.y} ${b.w} ${b.h}`}
      aria-hidden
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

/** The skin's projectile as an inline SVG. */
export function ShotPreview({ skin, size = 28 }: { skin: CannonSkin; size?: number }) {
  const html = useMemo(() => shotSvg(skin), [skin]);
  const b = SHOT_BOX;
  return <svg width={size} height={size} viewBox={`${b.x} ${b.y} ${b.w} ${b.h}`} aria-hidden dangerouslySetInnerHTML={{ __html: html }} />;
}
