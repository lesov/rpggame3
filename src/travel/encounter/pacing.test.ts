import { describe, it, expect } from 'vitest';
import { advancePacing, initialPacing, pityFactor, resetPacing, PACING } from './pacing';

describe('pacing governor', () => {
  it('starts at no bonus', () => {
    expect(pityFactor(initialPacing)).toBe(1);
  });
  it('rises monotonically with idle time', () => {
    const a = pityFactor(advancePacing(initialPacing, 2));
    const b = pityFactor(advancePacing(initialPacing, 10));
    expect(b).toBeGreaterThan(a);
    expect(a).toBeGreaterThan(1);
  });
  it('is bounded by the cap no matter how long the quiet stretch', () => {
    const forever = pityFactor(advancePacing(initialPacing, 10_000));
    expect(forever).toBeCloseTo(1 + PACING.CAP, 10);
  });
  it('resets to no bonus after an encounter fires', () => {
    const idle = advancePacing(initialPacing, 50);
    expect(pityFactor(idle)).toBeGreaterThan(1);
    expect(pityFactor(resetPacing())).toBe(1);
  });
  it('accumulates across successive advances', () => {
    const twice = advancePacing(advancePacing(initialPacing, 3), 4);
    expect(twice.hoursSinceEncounter).toBe(7);
  });
});
