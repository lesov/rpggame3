/**
 * Vendors and their stock. A settlement's vendor buildings (trader, healer,
 * craftsman, city shop) each become a Shop whose quality ceiling is set by the
 * vendor type crossed with the settlement's size — so the best potions, weapons
 * and armor are only stocked by the best shops in the biggest cities. Stock is
 * deterministic (seeded), so revisiting a settlement shows the same wares
 * (a simple storefront that "restocks on revisit").
 */
import type { Burg, SettlementBuilding } from '../data/types';
import { mulberry32, hash } from '../sim/rng';
import { catalogUpTo, getCatalogItem, type CatalogItem, type ItemCategory, type ItemQuality } from './catalog';

export type VendorKind = 'trader' | 'healer' | 'craftsman' | 'shop' | 'travelling';

export interface StockEntry {
  itemId: string;
  price: number;
  qty: number;
}

export interface Shop {
  id: string;
  title: string;
  vendorKind: VendorKind;
  qualityCeiling: ItemQuality;
  categories: ItemCategory[];
  priceMult: number;
  sellRate: number;
  stock: StockEntry[];
}

const SELL_RATE = 0.4;

/** Population tier → the highest quality any vendor in that settlement can reach. */
function sizeCeiling(population: number): ItemQuality {
  if (population >= 20000) return 'masterwork'; // city
  if (population >= 5000) return 'fine'; // town / large town
  return 'common'; // hamlet / village
}

function minQuality(a: ItemQuality, b: ItemQuality): ItemQuality {
  const order: ItemQuality[] = ['common', 'fine', 'masterwork'];
  return order.indexOf(a) <= order.indexOf(b) ? a : b;
}

/** Per-vendor focus: which categories it deals in and its own quality reach. */
function vendorProfile(kind: VendorKind, grade: string | undefined): {
  categories: ItemCategory[];
  ownCeiling: ItemQuality;
  priceMult: number;
  count: number;
} {
  switch (kind) {
    case 'healer':
      return { categories: ['consumable', 'tool'], ownCeiling: 'masterwork', priceMult: 1, count: 5 };
    case 'craftsman':
      return {
        categories: ['weapon', 'armor'],
        ownCeiling: grade === 'advanced' ? 'fine' : 'common',
        priceMult: 1,
        count: grade === 'advanced' ? 8 : 5,
      };
    case 'shop':
      return { categories: ['weapon', 'armor', 'consumable', 'gear', 'tool'], ownCeiling: 'masterwork', priceMult: 1.1, count: 12 };
    case 'travelling':
      return { categories: ['weapon', 'consumable', 'gear', 'tool'], ownCeiling: 'fine', priceMult: 1.25, count: 6 };
    case 'trader':
    default:
      return { categories: ['weapon', 'gear', 'consumable'], ownCeiling: 'common', priceMult: 1, count: 6 };
  }
}

const VENDOR_TITLE: Record<VendorKind, string> = {
  trader: 'General Trader',
  healer: 'Healer',
  craftsman: 'Craftsman',
  shop: 'Shop',
  travelling: 'Travelling Trader',
};

/**
 * Build a shop's stock: a seeded selection from the catalog within the vendor's
 * categories and quality ceiling. Deterministic in `seed`.
 */
export function buildStock(
  categories: ItemCategory[],
  ceiling: ItemQuality,
  priceMult: number,
  count: number,
  seed: number,
): StockEntry[] {
  const pool: CatalogItem[] = catalogUpTo(ceiling, categories);
  const rand = mulberry32(seed >>> 0);
  // Shuffle a copy (Fisher–Yates) so the pick is seeded and stable.
  const shuffled = [...pool];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, Math.min(count, shuffled.length)).map((item) => {
    // Cheap staples come in bundles; expensive gear one or two at a time.
    const qty = item.basePrice <= 5 ? 5 + Math.floor(rand() * 10) : item.basePrice >= 200 ? 1 : 1 + Math.floor(rand() * 3);
    return { itemId: item.id, price: Math.max(1, Math.round(item.basePrice * priceMult)), qty };
  });
}

/** Items every vendor carries no matter their focus (food, water, the basics). */
const STAPLE_ITEMS: { itemId: string; qty: number }[] = [{ itemId: 'provisions', qty: 30 }];

/** Guarantee the staples are stocked, priced by the vendor's multiplier. */
function withStaples(stock: StockEntry[], priceMult: number): StockEntry[] {
  const present = new Set(stock.map((s) => s.itemId));
  const staples = STAPLE_ITEMS.filter((s) => !present.has(s.itemId)).map((s) => ({
    itemId: s.itemId,
    price: Math.max(1, Math.round((getCatalogItem(s.itemId)?.basePrice ?? 1) * priceMult)),
    qty: s.qty,
  }));
  return [...staples, ...stock];
}

function makeShop(id: string, kind: VendorKind, grade: string | undefined, ceiling: ItemQuality, seed: number): Shop {
  const profile = vendorProfile(kind, grade);
  const qualityCeiling = minQuality(profile.ownCeiling, ceiling);
  return {
    id,
    title: VENDOR_TITLE[kind],
    vendorKind: kind,
    qualityCeiling,
    categories: profile.categories,
    priceMult: profile.priceMult,
    sellRate: SELL_RATE,
    stock: withStaples(buildStock(profile.categories, qualityCeiling, profile.priceMult, profile.count, seed), profile.priceMult),
  };
}

const VENDOR_BUILDINGS: Record<string, VendorKind> = {
  trader: 'trader',
  healer: 'healer',
  craftsman: 'craftsman',
  shop: 'shop',
};

/** The shops a player can visit while standing in `burg`. */
export function shopsForBurg(burg: Burg): Shop[] {
  const ceiling = sizeCeiling(burg.population);
  const shops: Shop[] = [];
  burg.buildings.forEach((b: SettlementBuilding, i) => {
    const kind = VENDOR_BUILDINGS[b.type];
    if (!kind) return;
    const seed = hash(burg.i, i, b.type.length, kind.length);
    const shop = makeShop(`burg-${burg.i}-${b.type}-${i}`, kind, b.grade, ceiling, seed);
    if (kind === 'shop' && b.name) shop.title = b.name;
    else if (kind === 'craftsman' && b.grade) shop.title = `Craftsman (${b.grade})`;
    shops.push(shop);
  });
  return shops;
}

/** A caravan met on the road: a small general stock, never above `fine`. */
export function travellingTraderShop(seed: number): Shop {
  return makeShop(`travelling-${seed >>> 0}`, 'travelling', undefined, 'fine', seed);
}
