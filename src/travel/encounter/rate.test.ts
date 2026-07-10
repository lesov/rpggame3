import { describe, it, expect } from 'vitest';
import { baseRate, lambdaFor, rateBreakdown, poissonHit, cumulativeHitProbability, RATE } from './rate';
import type { RateContext } from './types';

function ctx(over: Partial<RateContext> = {}): RateContext {
  return {
    biomeName: 'Grassland',
    habitability: 50,
    pop: 4,
    road: 'offroad',
    hourOfDay: 12,
    isWinter: false,
    storm: false,
    nearestBurgMi: 25,
    marker: undefined,
    war: { active: false, yearsSinceEnd: null },
    visibility: 1,
    ...over,
  };
}

describe('baseRate', () => {
  it('is higher in low-habitability country and lower in fertile country', () => {
    expect(baseRate({ biomeName: 'X', habitability: 0 })).toBeGreaterThan(baseRate({ biomeName: 'X', habitability: 100 }));
  });
  it('honours explicit biome overrides', () => {
    expect(baseRate({ biomeName: 'Wetland', habitability: 50 })).toBe(RATE.BASE_BY_BIOME.Wetland);
    expect(baseRate({ biomeName: 'Marine', habitability: 99 })).toBe(RATE.BASE_BY_BIOME.Marine);
  });
});

describe('multiplicative composition', () => {
  it('roads suppress and trackless raises relative to base exposure', () => {
    expect(lambdaFor(ctx({ road: 'roads' }))).toBeLessThan(lambdaFor(ctx({ road: 'trails' })));
    expect(lambdaFor(ctx({ road: 'trails' }))).toBeLessThan(lambdaFor(ctx({ road: 'offroad' })));
  });
  it('remoteness: dense population and a near burg suppress the rate', () => {
    const remote = lambdaFor(ctx({ pop: 0, nearestBurgMi: 60 }));
    const settled = lambdaFor(ctx({ pop: 40, nearestBurgMi: 2 }));
    expect(settled).toBeLessThan(remote);
  });
  it('night is more dangerous than midday', () => {
    expect(lambdaFor(ctx({ hourOfDay: 1 }))).toBeGreaterThan(lambdaFor(ctx({ hourOfDay: 13 })));
  });
  it('a nearby hostile marker multiplies the rate, fading with distance', () => {
    const atLair = lambdaFor(ctx({ marker: { type: 'brigands', distanceMi: 0 } }));
    const nearEdge = lambdaFor(ctx({ marker: { type: 'brigands', distanceMi: RATE.MARKER_RADIUS_MI - 1 } }));
    const none = lambdaFor(ctx());
    expect(atLair).toBeGreaterThan(nearEdge);
    expect(nearEdge).toBeGreaterThan(none);
    // beyond the radius it has no effect
    expect(lambdaFor(ctx({ marker: { type: 'brigands', distanceMi: RATE.MARKER_RADIUS_MI + 10 } }))).toBe(none);
  });
  it('active war doubles the rate; the post-war tail decays back to baseline', () => {
    const base = lambdaFor(ctx());
    const active = lambdaFor(ctx({ war: { active: true, yearsSinceEnd: null } }));
    const justEnded = lambdaFor(ctx({ war: { active: false, yearsSinceEnd: 0 } }));
    const longAfter = lambdaFor(ctx({ war: { active: false, yearsSinceEnd: RATE.POST_WAR_YEARS } }));
    expect(active).toBeCloseTo(base * 2, 5);
    expect(justEnded).toBeGreaterThan(base);
    expect(justEnded).toBeLessThan(active);
    expect(longAfter).toBeCloseTo(base, 5);
  });
  it('storms suppress everyone', () => {
    expect(lambdaFor(ctx({ storm: true }))).toBeLessThan(lambdaFor(ctx({ storm: false })));
  });
  it('clamps stacked danger to the ceiling', () => {
    const insane = ctx({
      road: 'offroad',
      pop: 0,
      nearestBurgMi: 100,
      hourOfDay: 2,
      marker: { type: 'brigands', distanceMi: 0 },
      war: { active: true, yearsSinceEnd: null },
      isWinter: true,
    });
    const b = baseRate(insane);
    expect(lambdaFor(insane)).toBeLessThanOrEqual(RATE.CEILING_MULT * b + 1e-9);
  });
});

describe('the split: λ ignores disposition entirely', () => {
  it('has no argument through which reputation/diplomacy could enter', () => {
    // Structural guarantee: rateBreakdown only accepts RateContext. This test
    // documents the invariant — two identical density contexts give identical
    // λ regardless of any player identity, because identity is not an input.
    const a = rateBreakdown(ctx());
    const b = rateBreakdown(ctx());
    expect(a.lambda).toBe(b.lambda);
    // dominant-factor label is exposed for the danger read
    expect(typeof a.dominant).toBe('string');
  });
});

describe('Poisson probability', () => {
  it('is 0 at t=0, rises with time, and never mathematically reaches 1', () => {
    expect(poissonHit(0.2, 0)).toBe(0);
    expect(poissonHit(0.2, 5)).toBeGreaterThan(poissonHit(0.2, 1));
    // realistic travel spans stay strictly below certainty
    expect(poissonHit(0.3, 6)).toBeLessThan(1);
    expect(poissonHit(4, 100)).toBeLessThanOrEqual(1);
  });
  it('cumulative probability matches the closed form over segments', () => {
    const segs = [
      { lambda: 0.1, hours: 2 },
      { lambda: 0.3, hours: 1 },
    ];
    const expected = 1 - Math.exp(-(0.1 * 2 + 0.3 * 1));
    expect(cumulativeHitProbability(segs)).toBeCloseTo(expected, 10);
  });
});
