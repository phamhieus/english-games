import { useMemo } from 'react';
import type { BossId } from '@/types';
import { BOSS_BOX, bossSvg } from '@/game/config/bosses';

/** A boss drawing as inline SVG (our own artwork constants, not user input). */
export function BossArt({ id, angry = false, size }: { id: BossId; angry?: boolean; size: number }) {
  const html = useMemo(() => bossSvg(id, angry), [id, angry]);
  const b = BOSS_BOX;
  return <svg width={size} height={size} viewBox={`${b.x} ${b.y} ${b.w} ${b.h}`} aria-hidden dangerouslySetInnerHTML={{ __html: html }} />;
}
