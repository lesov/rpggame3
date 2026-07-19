import { describe, expect, it } from 'vitest';
import { buildAppearance, bodyBuildForStrength, DEFAULT_APPEARANCE } from './appearance';
import type { AbilityScores } from './types';

const scores = (str: number): AbilityScores => ({ str, dex: 10, con: 10, int: 10, wis: 10, cha: 10 });

describe('character appearance', () => {
  it('derives body build from Strength bands', () => {
    expect(bodyBuildForStrength(6)).toBe('slight');
    expect(bodyBuildForStrength(9)).toBe('lean');
    expect(bodyBuildForStrength(12)).toBe('balanced');
    expect(bodyBuildForStrength(15)).toBe('sturdy');
    expect(bodyBuildForStrength(17)).toBe('powerful');
    expect(bodyBuildForStrength(18)).toBe('massive');
  });

  it('builds a descriptor from selected appearance choices', () => {
    const appearance = buildAppearance(
      {
        ...DEFAULT_APPEARANCE,
        skinColor: 'olive',
        hairColor: 'black',
        hairLength: 'close-cropped',
        facialHair: 'trimmed-beard',
        eyeColor: 'amber',
        relativeHeight: 'tall',
        posture: 'forward-leaning',
      },
      'human',
      'Human',
      scores(16),
    );
    expect(appearance.build).toBe('powerful');
    expect(appearance.descriptor).toContain('tall human');
    expect(appearance.descriptor).toContain('olive skin');
    expect(appearance.descriptor).toContain('close-cropped black hair');
    expect(appearance.descriptor).toContain('a trimmed beard');
    expect(appearance.descriptor).toContain('forward-leaning posture');
  });

  it('uses scales for dragonborn and handles shaved heads cleanly', () => {
    const appearance = buildAppearance(
      {
        ...DEFAULT_APPEARANCE,
        skinColor: 'red-bronze',
        hairColor: 'none',
        hairLength: 'shaved',
        facialHair: 'none',
        eyeColor: 'gold',
      },
      'dragonborn',
      'Dragonborn',
      scores(14),
    );
    expect(appearance.descriptor).toContain('red-bronze scales');
    expect(appearance.descriptor).toContain('a shaved head');
    expect(appearance.descriptor).not.toContain('beard');
  });
});
