import { useEffect, useRef } from 'react';
import type { GameBridge } from '@/game/GameBridge';
import { createGame } from '@/game/createGame';

/**
 * Mounts exactly one Phaser game for the given bridge and destroys it on unmount
 * (also safe under React StrictMode's double-invoked effects).
 */
export function PhaserCanvas({ bridge, onPointerDown }: { bridge: GameBridge; onPointerDown?: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const game = createGame(el, bridge);
    return () => {
      const scene = game.scene.getScene('game') as unknown as Parameters<GameBridge['detachScene']>[0] | null;
      if (scene) bridge.detachScene(scene);
      game.destroy(true);
    };
  }, [bridge]);
  return <div ref={ref} className="absolute inset-0 overflow-hidden" onPointerDown={onPointerDown} aria-hidden />;
}
