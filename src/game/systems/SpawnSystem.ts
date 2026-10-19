import type { Rng } from '@/types';

export interface Rect {
  x: number; // center
  y: number; // center
  width: number;
  height: number;
}

/**
 * Chooses a horizontal center for a new balloon that doesn't overlap balloons
 * still near the top of the field. Returns null when there's no free space yet
 * (the caller simply retries a little later — it never forces an overlap).
 */
export function findSpawnX(
  fieldWidth: number,
  newWidth: number,
  occupied: readonly Rect[],
  rng: Rng,
  margin = 12,
  attempts = 14,
): number | null {
  const half = newWidth / 2;
  const minX = half + margin;
  const maxX = fieldWidth - half - margin;
  if (maxX < minX) return occupied.length === 0 ? fieldWidth / 2 : null;
  const fits = (x: number) =>
    occupied.every((r) => Math.abs(r.x - x) >= (r.width + newWidth) / 2 + margin);
  for (let i = 0; i < attempts; i++) {
    const x = minX + rng.next() * (maxX - minX);
    if (fits(x)) return x;
  }
  // Deterministic sweep as a fallback.
  const step = Math.max(8, newWidth / 4);
  for (let x = minX; x <= maxX; x += step) if (fits(x)) return x;
  return null;
}
