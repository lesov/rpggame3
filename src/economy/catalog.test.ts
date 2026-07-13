import { describe, expect, it } from 'vitest';
import { CATALOG, catalogUpTo, getCatalogItem, qualityRank, weightOf, DEFAULT_ITEM_WEIGHT } from './catalog';
import { WEAPON_STATS } from '../combat/weapons';

describe('item catalog', () => {
  it('has unique ids and well-formed entries', () => {
    const ids = new Set<string>();
    for (const item of CATALOG) {
      expect(ids.has(item.id), `duplicate id ${item.id}`).toBe(false);
      ids.add(item.id);
      expect(item.name.length).toBeGreaterThan(0);
      expect(item.basePrice).toBeGreaterThanOrEqual(0);
    }
  });

  it('gives every entry a non-negative weight and weightOf falls back for unknown ids', () => {
    for (const item of CATALOG) {
      expect(typeof item.weight, item.id).toBe('number');
      expect(item.weight, item.id).toBeGreaterThanOrEqual(0);
    }
    expect(weightOf('longsword')).toBe(getCatalogItem('longsword')!.weight);
    expect(weightOf('vosels')).toBe(0); // coins are weightless
    expect(weightOf('nonexistent-item')).toBe(DEFAULT_ITEM_WEIGHT);
  });

  it('resolves every weapon baseId in the combat weapon table', () => {
    for (const item of CATALOG) {
      if (item.weapon) expect(WEAPON_STATS[item.weapon.baseId], item.id).toBeDefined();
    }
  });

  it('orders quality common < fine < masterwork', () => {
    expect(qualityRank('common')).toBeLessThan(qualityRank('fine'));
    expect(qualityRank('fine')).toBeLessThan(qualityRank('masterwork'));
  });

  it('gives higher weapon grades a larger bonus and higher price', () => {
    const plain = getCatalogItem('longsword')!;
    const fine = getCatalogItem('longsword-fine')!;
    const master = getCatalogItem('longsword-masterwork')!;
    expect(fine.weapon!.bonus).toBeGreaterThan(plain.weapon!.bonus);
    expect(master.weapon!.bonus).toBeGreaterThan(fine.weapon!.bonus);
    expect(master.basePrice).toBeGreaterThan(fine.basePrice);
    expect(fine.basePrice).toBeGreaterThan(plain.basePrice);
  });

  it('catalogUpTo excludes items above the ceiling and non-purchasable coin', () => {
    const common = catalogUpTo('common');
    expect(common.every((c) => qualityRank(c.quality) === 0)).toBe(true);
    expect(common.some((c) => c.id === 'greater-healing-potion')).toBe(false);
    expect(common.some((c) => c.id === 'vosels')).toBe(false);
    expect(common.some((c) => c.id === 'sealed-guild-letter')).toBe(false);
    expect(common.some((c) => c.id === 'guild-response-letter')).toBe(false);

    const all = catalogUpTo('masterwork', ['consumable']);
    expect(all.some((c) => c.id === 'superior-healing-potion')).toBe(true);
    expect(all.every((c) => c.category === 'consumable')).toBe(true);
  });

  it('keeps the sealed guild letter as a weightless quest item', () => {
    const letter = getCatalogItem('sealed-guild-letter')!;
    expect(letter.category).toBe('quest');
    expect(letter.basePrice).toBe(0);
    expect(letter.weight).toBe(0);
  });

  it('keeps the guild response letter as a weightless quest item', () => {
    const letter = getCatalogItem('guild-response-letter')!;
    expect(letter.category).toBe('quest');
    expect(letter.basePrice).toBe(0);
    expect(letter.weight).toBe(0);
  });
});
