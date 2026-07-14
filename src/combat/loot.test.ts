import { describe, expect, it } from 'vitest';
import { getCatalogItem } from '../economy/catalog';
import { allLootItemIds, generateLoot } from './loot';

describe('combat loot', () => {
  it('generates deterministic loot for the same monster and seed', () => {
    expect(generateLoot('bandit', 42, 'victory')).toEqual(generateLoot('bandit', 42, 'victory'));
  });

  it('only drops loot for victories', () => {
    expect(generateLoot('bandit', 42, 'defeat')).toEqual([]);
    expect(generateLoot('bandit', 42, 'escaped')).toEqual([]);
    expect(generateLoot('bandit', 42, 'enemy-fled')).toEqual([]);
  });

  it('only references catalog-backed item ids', () => {
    for (const id of allLootItemIds()) {
      expect(getCatalogItem(id), id).toBeDefined();
    }
  });

  it('keeps animal and humanoid drops context-specific', () => {
    const animalIds = new Set<string>();
    const banditIds = new Set<string>();
    for (let seed = 1; seed <= 40; seed++) {
      for (const item of generateLoot('wolf', seed, 'victory')) animalIds.add(item.id);
      for (const item of generateLoot('bandit', seed, 'victory')) banditIds.add(item.id);
    }
    expect([...animalIds].every((id) => ['wolf-pelt', 'animal-teeth', 'raw-meat'].includes(id))).toBe(true);
    expect([...banditIds].some((id) => ['vosels', 'patched-gambeson', 'provisions', 'dagger', 'rusty-scrap'].includes(id))).toBe(true);
    expect(banditIds.has('wolf-pelt')).toBe(false);
  });
});
