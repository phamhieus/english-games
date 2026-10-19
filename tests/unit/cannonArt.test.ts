import { describe, expect, it } from 'vitest';
import { CANNON_SKINS, skinById } from '@/game/config/theme';
import { barrelSvg, bodySvg, cannonSvg, faceSvg, shotSvg } from '@/game/config/cannonArt';

describe('cannon artwork', () => {
  it('draws every skin without missing values', () => {
    for (const skin of CANNON_SKINS) {
      for (const svg of [barrelSvg(skin), bodySvg(skin), faceSvg(skin, false), faceSvg(skin, true), shotSvg(skin), cannonSvg(skin)]) {
        expect(svg, skin.id).not.toMatch(/undefined|NaN|null/);
      }
    }
  });

  it('gives each skin a distinct look and unique id', () => {
    const ids = new Set(CANNON_SKINS.map((s) => s.id));
    expect(ids.size).toBe(CANNON_SKINS.length);
    const looks = new Set(CANNON_SKINS.map((s) => cannonSvg(s)));
    expect(looks.size).toBe(CANNON_SKINS.length);
  });

  it('falls back to the classic skin for unknown ids', () => {
    expect(skinById(undefined).id).toBe('classic');
  });
});
