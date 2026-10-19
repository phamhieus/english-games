import Phaser from 'phaser';
import type { GameBridge } from './GameBridge';
import { BootScene } from './scenes/BootScene';
import { GameScene } from './scenes/GameScene';

/**
 * Creates one Phaser game inside `parent`. The caller must call `game.destroy(true)`
 * on unmount — there is exactly one game loop per mounted game screen.
 * Keyboard input is handled by React's answer field, so Phaser's keyboard plugin is off.
 */
export function createGame(parent: HTMLElement, bridge: GameBridge): Phaser.Game {
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    transparent: true,
    banner: false,
    scale: {
      mode: Phaser.Scale.RESIZE,
      width: parent.clientWidth || 800,
      height: parent.clientHeight || 600,
    },
    input: { keyboard: false },
    audio: { noAudio: true },
    render: { antialias: true, roundPixels: false },
    scene: [BootScene, GameScene],
  });
  game.registry.set('bridge', bridge);
  return game;
}
