import { describe, it, expect } from 'vitest';
import { actorWeights, pickActorKind, monsterForKind, buildActor, type TableContext } from './tables';
import type { ActorKind } from './types';

function tctx(over: Partial<TableContext> = {}): TableContext {
  return { biomeId: 4, road: 'offroad', pop: 3, night: false, isWinter: false, ...over };
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
    const road = sample(tctx({ road: 'roads', pop: 8 }))['brigand'] ?? 0;
    const wild = sample(tctx({ road: 'offroad', pop: 0 }))['brigand'] ?? 0;
    expect(road).toBeGreaterThan(wild);
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
    expect(monsterForKind('beast', 9, 0.9)).toBe('wolf'); // taiga
    expect(monsterForKind('beast', 3, 0.9)).toBe('feral-dog'); // savanna
    expect(monsterForKind('beast', 6, 0.1)).toBe('black-bear'); // deciduous forest, low roll
  });
  it('undead map to skeletons in dry land and zombies in wetland', () => {
    expect(monsterForKind('undead', 2, 0.5)).toBe('skeleton');
    expect(monsterForKind('undead', 12, 0.5)).toBe('zombie');
  });
  it('every actor carries a fighting statblock; hostility is a separate flag', () => {
    const hostile = buildActor('brigand', 4, true, 0.5);
    expect(hostile.statblockId).toBeDefined();
    expect(hostile.hostile).toBe(true);
    const peaceful = buildActor('merchant', 4, false, 0.5);
    expect(peaceful.statblockId).toBeDefined(); // can still be attacked
    expect(peaceful.hostile).toBe(false);
    expect(peaceful.descriptor).toMatch(/caravan/);
  });
});
