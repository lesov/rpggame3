import { describe, it, expect } from 'vitest';
import { hostileChance } from './disposition';
import type { DispositionContext } from './types';

function dctx(over: Partial<DispositionContext> = {}): DispositionContext {
  return {
    actorKind: 'patrol',
    cultureRep: 0,
    religionRep: 0,
    alert: 1,
    diplomacy: 'Neutral',
    sameCulture: false,
    sameReligion: false,
    ...over,
  };
}

describe('the split: P(hostile) ignores density entirely', () => {
  it('two identical disposition contexts give identical hostility (no density input exists)', () => {
    expect(hostileChance(dctx())).toBe(hostileChance(dctx()));
  });
});

describe('sentient hostility responds to disposition', () => {
  it('hated reputation raises hostility, revered lowers it', () => {
    const hated = hostileChance(dctx({ cultureRep: -100, religionRep: -100 }));
    const neutral = hostileChance(dctx());
    const revered = hostileChance(dctx({ cultureRep: 100, religionRep: 100 }));
    expect(hated).toBeGreaterThan(neutral);
    expect(revered).toBeLessThan(neutral);
  });
  it('the most hostile local faction governs', () => {
    const oneFactionHates = hostileChance(dctx({ cultureRep: 100, religionRep: -100 }));
    const bothLove = hostileChance(dctx({ cultureRep: 100, religionRep: 100 }));
    expect(oneFactionHates).toBeGreaterThan(bothLove);
  });
  it('enemy diplomacy turns even patrols hostile', () => {
    const enemy = hostileChance(dctx({ diplomacy: 'Enemy' }));
    const ally = hostileChance(dctx({ diplomacy: 'Ally' }));
    expect(enemy).toBeGreaterThan(ally);
  });
  it('a weak garrison (low/no alert) raises hostility', () => {
    const lawless = hostileChance(dctx({ alert: undefined }));
    const patrolled = hostileChance(dctx({ alert: 3 }));
    expect(lawless).toBeGreaterThan(patrolled);
  });
  it('shared faith and culture ease things', () => {
    const stranger = hostileChance(dctx());
    const kin = hostileChance(dctx({ sameCulture: true, sameReligion: true }));
    expect(kin).toBeLessThan(stranger);
  });
  it('stays within [0,1]', () => {
    const p = hostileChance(dctx({ actorKind: 'brigand', cultureRep: -100, religionRep: -100, diplomacy: 'Enemy', alert: undefined }));
    expect(p).toBeLessThanOrEqual(1);
    expect(p).toBeGreaterThanOrEqual(0);
  });
});

describe('mindless actors ignore who you are', () => {
  it('beasts and undead have fixed hostility regardless of reputation/diplomacy', () => {
    const beastA = hostileChance(dctx({ actorKind: 'beast', cultureRep: 100, religionRep: 100, diplomacy: 'Ally' }));
    const beastB = hostileChance(dctx({ actorKind: 'beast', cultureRep: -100, religionRep: -100, diplomacy: 'Enemy' }));
    expect(beastA).toBe(beastB);
    const undead = hostileChance(dctx({ actorKind: 'undead', cultureRep: 100, religionRep: 100 }));
    expect(undead).toBe(1);
  });
});
