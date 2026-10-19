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
    // Keep the canvas matching its box (keyboard opening, rotation, window resize).
    const observer = new ResizeObserver(() => {
      const dpr = (game.registry.get('dpr') as number | undefined) ?? 1;
      const w = Math.max(1, Math.round(el.clientWidth * dpr));
      const h = Math.max(1, Math.round(el.clientHeight * dpr));
      if (w !== game.scale.width || h !== game.scale.height) game.scale.resize(w, h);
    });
    observer.observe(el);
    return () => {
      observer.disconnect();
      const scene = game.scene.getScene('game') as unknown as Parameters<GameBridge['detachScene']>[0] | null;
      if (scene) bridge.detachScene(scene);
      game.destroy(true);
    };
  }, [bridge]);
  return <div ref={ref} className="absolute inset-0 overflow-hidden" onPointerDown={onPointerDown} aria-hidden />;
}
