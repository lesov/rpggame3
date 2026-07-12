import { describe, expect, it } from 'vitest';
import { carriedWeight, carryCapacity, remainingCapacity, wouldExceedCapacity, loadRatio, travelSpeedFactor } from './encumbrance';
import { weightOf } from './catalog';
import { makeTestCharacter } from '../combat/fixtures';
import type { PlayerCharacter } from '../player/types';

/** A player with a chosen Strength and an explicit inventory. */
function player(str: number, inventory: PlayerCharacter['inventory']): PlayerCharacter {
  const pc = makeTestCharacter('fighter');
  return { ...pc, abilityScores: { ...pc.abilityScores, str }, inventory };
}

describe('carry capacity and weight', () => {
  it('capacity is 15 x Strength', () => {
    expect(carryCapacity(player(12, []))).toBe(180);
    expect(carryCapacity(player(8, []))).toBe(120);
  });

  it('carried weight sums quantity x unit weight and ignores coins', () => {
    const pc = player(12, [
      { id: 'vosels', name: 'Vosels', quantity: 500, category: 'coin' },
      { id: 'provisions', name: 'Food provisions', quantity: 5, category: 'gear' }, // 2 lb each
      { id: 'longsword', name: 'Longsword', quantity: 1, category: 'weapon' }, // 3 lb
    ]);
    expect(carriedWeight(pc)).toBe(5 * weightOf('provisions') + weightOf('longsword'));
    expect(carriedWeight(pc)).toBe(13);
  });

  it('reports remaining capacity and flags overloading purchases', () => {
    const pc = player(10, [{ id: 'scale-mail', name: 'Scale mail', quantity: 1, category: 'armor' }]); // cap 150, 45 lb
    expect(remainingCapacity(pc)).toBe(150 - 45);
    expect(wouldExceedCapacity(pc, 'scale-mail', 2)).toBe(false); // 45 + 90 = 135 <= 150
    expect(wouldExceedCapacity(pc, 'half-plate', 3)).toBe(true); // 45 + 120 = 165 > 150
    expect(wouldExceedCapacity(pc, 'dagger', 1)).toBe(false); // 45 + 1 <= 150
  });
});

describe('travel speed under load', () => {
  it('a light pack does not slow you', () => {
    const light = player(12, [{ id: 'dagger', name: 'Dagger', quantity: 1, category: 'weapon' }]); // 1 / 180
    expect(loadRatio(light)).toBeLessThan(0.5);
    expect(travelSpeedFactor(light)).toBe(1);
  });

  it('a pack at the cap slows you to the floor', () => {
    // cap 120 (STR 8); load it to ~capacity with scale mail x2 + half-plate = 45+45+40 = 130 > cap,
    // but for the factor we just need loadRatio ~1: use items summing >= 120.
    const heavy = player(8, [
      { id: 'half-plate', name: 'Half plate', quantity: 3, category: 'armor' }, // 120 lb == cap
    ]);
    expect(loadRatio(heavy)).toBe(1);
    expect(travelSpeedFactor(heavy)).toBeCloseTo(0.6, 5);
  });

  it('a mid load slows you between 1.0 and the floor', () => {
    const mid = player(10, [{ id: 'half-plate', name: 'Half plate', quantity: 3, category: 'armor' }]); // 120 / 150 = 0.8
    const f = travelSpeedFactor(mid);
    expect(f).toBeLessThan(1);
    expect(f).toBeGreaterThan(0.6);
  });
});
