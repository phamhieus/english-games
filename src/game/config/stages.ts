import type { StageId } from '@/types';

/** A play-field backdrop. The scenery itself is drawn by StageBackdrop.tsx (behind the transparent Phaser canvas). */
export interface StageDef {
  id: StageId;
  name: string;
  /** Player level that unlocks this stage. */
  unlock: number;
  /** Dark backdrops need light UI accents. */
  dark: boolean;
  /** Danger-line colour in the Phaser scene. */
  danger: number;
  /** Base colour behind the scenery (also used by the picker chip). */
  sky: string;
}

/** In journey order; each unlocks at a player level. */
export const STAGES: readonly StageDef[] = [
  { id: 'meadow', name: 'Sunny Meadow', unlock: 1, dark: false, danger: 0xe8506a, sky: '#cdeaf7' },
  { id: 'garden', name: 'Flower Garden', unlock: 2, dark: false, danger: 0xe8506a, sky: '#e4f7ec' },
  { id: 'sunset', name: 'Sunset Beach', unlock: 3, dark: false, danger: 0xa52e20, sky: '#ffb38a' },
  { id: 'autumn', name: 'Autumn Forest', unlock: 4, dark: false, danger: 0xa52e20, sky: '#ffe2c2' },
  { id: 'snow', name: 'Snowy Peaks', unlock: 5, dark: false, danger: 0xe8506a, sky: '#dcefff' },
  { id: 'desert', name: 'Desert Dunes', unlock: 6, dark: false, danger: 0xa52e20, sky: '#ffe9b8' },
  { id: 'candy', name: 'Candy Land', unlock: 7, dark: false, danger: 0x7c4dff, sky: '#ffd6e7' },
  { id: 'jungle', name: 'Jungle', unlock: 8, dark: false, danger: 0xe8506a, sky: '#d4f5e0' },
  { id: 'ocean', name: 'Under the Sea', unlock: 9, dark: true, danger: 0xffc43d, sky: '#2f8fd6' },
  { id: 'city', name: 'City Lights', unlock: 10, dark: true, danger: 0xffc43d, sky: '#1c2347' },
  { id: 'night', name: 'Starry Night', unlock: 11, dark: true, danger: 0xffc43d, sky: '#1f2a5a' },
  { id: 'volcano', name: 'Volcano', unlock: 12, dark: true, danger: 0xffe066, sky: '#2b1622' },
  { id: 'space', name: 'Outer Space', unlock: 13, dark: true, danger: 0xffc43d, sky: '#2b1d4f' },
  { id: 'aurora', name: 'Northern Lights', unlock: 14, dark: true, danger: 0xffc43d, sky: '#0f1e33' },
];

export const stageById = (id: StageId | undefined): StageDef => STAGES.find((s) => s.id === id) ?? STAGES[0]!;

export const randomStage = (from: readonly StageDef[] = STAGES): StageDef => from[Math.floor(Math.random() * from.length)] ?? STAGES[0]!;
