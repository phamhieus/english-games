import Phaser from 'phaser';
import type { GameBridge } from './GameBridge';
import { isTouchDevice } from '@/hooks/useScreenKeyboard';
import { BootScene } from './scenes/BootScene';
import { GameScene } from './scenes/GameScene';
import { BossScene } from './scenes/BossScene';

/** Device pixels per CSS pixel the game renders at (capped to keep phones fast: 3× screens fill 2.25× the pixels of 2×). */
export const renderScale = () => Math.min(isTouchDevice() ? 2 : 2.5, Math.max(1, window.devicePixelRatio || 1));

/**
 * Creates one Phaser game inside `parent`. The caller must call `game.destroy(true)`
 * on unmount — there is exactly one game loop per mounted game screen.
 * Keyboard input is handled by React's answer field, so Phaser's keyboard plugin is off.
 *
 * The canvas is rendered at device resolution (CSS size × devicePixelRatio) and shown at
 * CSS size, so it stays sharp on high-density screens. Scenes keep working in CSS pixels:
 * the camera is zoomed by the same factor (see GameScene.viewW / viewH).
 */
export function createGame(parent: HTMLElement, bridge: GameBridge): Phaser.Game {
  const dpr = renderScale();
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    transparent: true,
    banner: false,
    scale: {
      mode: Phaser.Scale.NONE,
      width: Math.max(1, Math.round((parent.clientWidth || 800) * dpr)),
      height: Math.max(1, Math.round((parent.clientHeight || 600) * dpr)),
      zoom: 1 / dpr,
    },
    input: { keyboard: false },
    audio: { noAudio: true },
    // At 2× and up, edges are already smooth; multisampling a phone-sized canvas costs frames.
    render: { antialias: dpr < 2, roundPixels: false },
    scene: [BootScene, GameScene, BossScene],
  });
  game.registry.set('bridge', bridge);
  game.registry.set('dpr', dpr);
  return game;
}
