import { describe, expect, it } from 'vitest';
import { shopsForBurg, travellingTraderShop, buildStock } from './shops';
import { getCatalogItem, qualityRank } from './catalog';
import type { Burg } from '../data/types';

function makeBurg(population: number, buildingTypes: { type: string; grade?: string; name?: string }[]): Burg {
  return {
    i: 7,
    name: 'Testburg',
    cell: 100,
    x: 0,
    y: 0,
    state: 1,
    culture: 1,
    type: 'Town',
    group: 'town',
    capital: false,
    port: false,
    citadel: false,
    walls: false,
    temple: false,
    plaza: true,
    shanty: false,
    population,
    buildings: buildingTypes.map((b) => ({ type: b.type, grade: b.grade, name: b.name })),
    landmarks: {},
  } as Burg;
}

function ceilingOf(itemIds: string[]): number {
  return Math.max(...itemIds.map((id) => qualityRank(getCatalogItem(id)!.quality)));
}

describe('shops', () => {
  it('gates a small village trader to common goods only', () => {
    const burg = makeBurg(800, [{ type: 'trader' }]);
    const [shop] = shopsForBurg(burg);
    expect(shop.qualityCeiling).toBe('common');
    expect(shop.stock.every((s) => qualityRank(getCatalogItem(s.itemId)!.quality) === 0)).toBe(true);
    expect(shop.stock.some((s) => s.itemId === 'greater-healing-potion')).toBe(false);
  });

  it('lets a big-city shop reach masterwork wares', () => {
    const burg = makeBurg(48000, [{ type: 'shop', grade: 'advanced', name: "Spring's Sundries" }]);
    const [shop] = shopsForBurg(burg);
    expect(shop.qualityCeiling).toBe('masterwork');
    expect(shop.title).toBe("Spring's Sundries");
  });

  it('caps a fine-tier item pool below masterwork in a mid-size town', () => {
    const burg = makeBurg(8000, [{ type: 'craftsman', grade: 'advanced' }]);
    const [shop] = shopsForBurg(burg);
    expect(shop.qualityCeiling).toBe('fine');
    expect(shop.stock.every((s) => qualityRank(getCatalogItem(s.itemId)!.quality) <= 1)).toBe(true);
  });

  it('produces one shop per vendor building and ignores non-vendors', () => {
    const burg = makeBurg(9000, [
      { type: 'trader' },
      { type: 'healer' },
      { type: 'tavern' },
      { type: 'central_square' },
      { type: 'craftsman', grade: 'simple' },
    ]);
    const shops = shopsForBurg(burg);
    expect(shops.map((s) => s.vendorKind).sort()).toEqual(['craftsman', 'healer', 'trader']);
  });

  it('builds deterministic stock for the same seed', () => {
    const a = buildStock(['weapon', 'gear'], 'fine', 1, 6, 12345);
    const b = buildStock(['weapon', 'gear'], 'fine', 1, 6, 12345);
    expect(a).toEqual(b);
  });

  it('keeps the travelling trader at or below fine', () => {
    const shop = travellingTraderShop(999);
    expect(shop.qualityCeiling).toBe('fine');
    expect(shop.stock.every((s) => qualityRank(getCatalogItem(s.itemId)!.quality) <= 1)).toBe(true);
    expect(ceilingOf(shop.stock.map((s) => s.itemId))).toBeLessThanOrEqual(1);
  });
});
