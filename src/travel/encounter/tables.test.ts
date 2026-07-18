import { describe, it, expect } from 'vitest';
import { actorWeights, pickActorKind, monsterForKind, buildActor, wildernessLevel, type TableContext } from './tables';
import type { ActorKind } from './types';

function tctx(over: Partial<TableContext> = {}): TableContext {
  return { biomeId: 4, road: 'offroad', pop: 3, nearestBurgMi: 30, night: false, isWinter: false, ...over };
}

/** Sample the table across many seeds to get an empirical distribution. */
function sample(ctx: TableContext, n = 400): Record<string, number> {
  const counts: Record<string, number> = {};
  for (let i = 0; i < n; i++) {
    const roll = (i + 0.5) / n;
    const kind = pickActorKind(ctx, roll);
    counts[kind] = (counts[kind] ?? 0) + 1;
  }
  return counts;
}

function dominant(counts: Record<string, number>): string {
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
}

describe('actor tables', () => {
  it('a hostile marker pins the draw to that marker type', () => {
    expect(dominant(sample(tctx({ markerType: 'brigands' })))).toBe('brigand');
    expect(dominant(sample(tctx({ markerType: 'dungeons' })))).toBe('undead');
    expect(dominant(sample(tctx({ markerType: 'sea-monsters' })))).toBe('beast');
  });

  it('undead are common in the wastes and scarce in lush forest (without a marker)', () => {
    const desert = sample(tctx({ biomeId: 2 }))['undead'] ?? 0;
    const forest = sample(tctx({ biomeId: 6 }))['undead'] ?? 0;
    expect(desert).toBeGreaterThan(forest);
  });

  it('brigands need traffic — commoner on roads than trackless wilds', () => {
    const road = sample(tctx({ road: 'roads', pop: 8, nearestBurgMi: 5 }))['brigand'] ?? 0;
    const wild = sample(tctx({ road: 'offroad', pop: 0, nearestBurgMi: 80 }))['brigand'] ?? 0;
    expect(road).toBeGreaterThan(wild);
  });

  it('deep wilderness strongly suppresses human road traffic and brigands', () => {
    const settled = actorWeights(tctx({ road: 'roads', pop: 12, nearestBurgMi: 3 }));
    const deep = actorWeights(tctx({ road: 'offroad', pop: 0, nearestBurgMi: 90 }));
    const settledBrigand = settled.find((w) => w.kind === 'brigand')?.weight ?? 0;
    const deepBrigand = deep.find((w) => w.kind === 'brigand')?.weight ?? 0;
    const settledMerchant = settled.find((w) => w.kind === 'merchant')?.weight ?? 0;
    const deepMerchant = deep.find((w) => w.kind === 'merchant')?.weight ?? 0;
    expect(deepBrigand).toBeLessThan(settledBrigand * 0.1);
    expect(deepMerchant).toBeLessThan(settledMerchant * 0.1);
  });

  it('classifies roadless empty country far from burgs as deep wilderness', () => {
    expect(wildernessLevel(tctx({ road: 'roads', pop: 12, nearestBurgMi: 2 }))).toBe('settled');
    expect(wildernessLevel(tctx({ road: 'offroad', pop: 0, nearestBurgMi: 85 }))).toBe('deepWild');
  });

  it('night thins peaceful human traffic', () => {
    const dayMerchants = sample(tctx({ road: 'roads', pop: 8, night: false }))['merchant'] ?? 0;
    const nightMerchants = sample(tctx({ road: 'roads', pop: 8, night: true }))['merchant'] ?? 0;
    expect(dayMerchants).toBeGreaterThan(nightMerchants);
  });

  it('is deterministic for a given roll', () => {
    const c = tctx({ biomeId: 9 });
    expect(pickActorKind(c, 0.42)).toBe(pickActorKind(c, 0.42));
  });

  it('all weights are positive and a pick always resolves', () => {
    for (const w of actorWeights(tctx())) expect(w.weight).toBeGreaterThan(0);
    const kinds: ActorKind[] = [];
    for (let i = 0; i < 20; i++) kinds.push(pickActorKind(tctx(), i / 20));
    expect(kinds.length).toBe(20);
  });
});

describe('statblock mapping', () => {
  it('beasts map to biome-appropriate animals', () => {
    expect(monsterForKind('beast', 9, 0.3, tctx({ biomeId: 9, nearestBurgMi: 70, pop: 0 }))).toBe('wolf'); // taiga
    expect(monsterForKind('beast', 3, 0.3, tctx({ biomeId: 3, road: 'roads', nearestBurgMi: 4, pop: 8 }))).toBe('feral-dog'); // settled savanna
    expect(monsterForKind('beast', 6, 0.55, tctx({ biomeId: 6, nearestBurgMi: 80, pop: 0 }))).toBe('black-bear'); // remote deciduous forest
  });
  it('undead map to skeletons in dry land and zombies in wetland', () => {
    expect(monsterForKind('undead', 2, 0.2, tctx({ biomeId: 2 }))).toBe('skeleton');
    expect(monsterForKind('undead', 12, 0.2, tctx({ biomeId: 12 }))).toBe('zombie');
  });
  it('uses climate and wilderness affinity for newer D&D-flavored foes', () => {
    expect(monsterForKind('elemental', 10, 0.2, tctx({ biomeId: 10, isWinter: true, pop: 0, nearestBurgMi: 90 }))).toBe('ice-mephit');
    expect(monsterForKind('elemental', 1, 0.8, tctx({ biomeId: 1, pop: 0, nearestBurgMi: 90 }))).toBe('dust-mephit');
    expect(actorWeights(tctx({ biomeId: 10, pop: 0, nearestBurgMi: 90 })).some((w) => w.kind === 'fiend')).toBe(false);
    expect(monsterForKind('fiend', 6, 0.9, tctx({ biomeId: 6, markerType: 'dungeons' }))).toBe('imp');
    expect(monsterForKind('beast', 12, 0.8, tctx({ biomeId: 12, night: true, pop: 0, nearestBurgMi: 60 }))).toBe('stirge-swarm');
  });
  it('every actor carries a fighting statblock; hostility is a separate flag', () => {
    const hostile = buildActor('brigand', 4, true, 0.5, tctx());
    expect(hostile.statblockId).toBeDefined();
    expect(hostile.hostile).toBe(true);
    const peaceful = buildActor('merchant', 4, false, 0.5, tctx({ road: 'roads', pop: 8, nearestBurgMi: 5 }));
    expect(peaceful.statblockId).toBeDefined(); // can still be attacked
    expect(peaceful.hostile).toBe(false);
    expect(peaceful.descriptor).toMatch(/caravan/);
  });
});
