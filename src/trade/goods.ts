/**
 * The trade-goods catalog (lepasoul_trade_framework.md §2): 24 goods across four
 * tiers. Every good's supply is derived from world data via structured
 * production rules (evaluated in production.ts) — adding a good means adding a
 * rule, not painting a map. This is the world-economy catalog and is distinct
 * from the player shop catalog in src/economy/catalog.ts.
 */

export type GoodTier = 'staple' | 'commodity' | 'luxury' | 'special';
export type MineResource = 'iron' | 'salt' | 'silver';
export type StateEconType = 'Nomadic' | 'Naval' | 'Hunting' | 'Highland' | 'Generic';

/** Biome ids as they appear in the geometry export. */
export const BIOME = {
  Marine: 0,
  HotDesert: 1,
  ColdDesert: 2,
  Savanna: 3,
  Grassland: 4,
  TropicalSeasonalForest: 5,
  TemperateDeciduousForest: 6,
  TropicalRainforest: 7,
  TemperateRainforest: 8,
  Taiga: 9,
  Tundra: 10,
  Glacier: 11,
  Wetland: 12,
} as const;

/** A production-rule matcher; each contributes a multiplier when it matches. */
export type ProductionRule =
  | { kind: 'biome'; biome: number; mult: number }
  | { kind: 'stateType'; stateType: StateEconType; mult: number }
  | { kind: 'culture'; culturePrefix: string; mult: number } // matches culture name prefix, e.g. 'Anor'
  | { kind: 'mine'; resource: MineResource; mult: number } // province holds a mine of this resource
  | { kind: 'port'; mult: number } // province has a port burg (coastal)
  | { kind: 'base'; mult: number }; // a flat everywhere-baseline

export interface Good {
  id: string;
  name: string;
  tier: GoodTier;
  basePrice: number; // gold per unit at equilibrium
  unitWeight: number; // caravan/ship capacity units
  perishDays: number | null; // null = non-perishing
  bulky: boolean; // bulky goods get a sea-freight discount
  productionRules: ProductionRule[];
}

const b = (biome: number, mult: number): ProductionRule => ({ kind: 'biome', biome, mult });
const st = (stateType: StateEconType, mult: number): ProductionRule => ({ kind: 'stateType', stateType, mult });
const cul = (culturePrefix: string, mult: number): ProductionRule => ({ kind: 'culture', culturePrefix, mult });
const mine = (resource: MineResource, mult: number): ProductionRule => ({ kind: 'mine', resource, mult });
const port = (mult: number): ProductionRule => ({ kind: 'port', mult });
const base = (mult: number): ProductionRule => ({ kind: 'base', mult });

export const GOODS: Good[] = [
  // --- Tier 1: staples (bulk, low margin, everyone demands) ---
  { id: 'grain', name: 'Grain', tier: 'staple', basePrice: 10, unitWeight: 1, perishDays: 90, bulky: true,
    productionRules: [b(BIOME.Grassland, 1.0), b(BIOME.TemperateDeciduousForest, 0.8), b(BIOME.Savanna, 0.4), st('Nomadic', 0.4)] },
  { id: 'livestock', name: 'Livestock & hides', tier: 'staple', basePrice: 14, unitWeight: 1, perishDays: 120, bulky: true,
    productionRules: [b(BIOME.Savanna, 1.0), b(BIOME.Grassland, 0.8), st('Nomadic', 1.5)] },
  { id: 'fish', name: 'Salted fish', tier: 'staple', basePrice: 8, unitWeight: 1, perishDays: 60, bulky: true,
    productionRules: [port(1.0), st('Naval', 1.5)] },
  { id: 'timber', name: 'Timber', tier: 'staple', basePrice: 9, unitWeight: 1, perishDays: null, bulky: true,
    productionRules: [b(BIOME.Taiga, 1.0), b(BIOME.TropicalRainforest, 1.0), b(BIOME.TemperateRainforest, 1.0), b(BIOME.TemperateDeciduousForest, 0.7)] },
  { id: 'salt', name: 'Salt', tier: 'staple', basePrice: 16, unitWeight: 1, perishDays: null, bulky: false,
    productionRules: [mine('salt', 3.0), b(BIOME.HotDesert, 0.5)] },
  { id: 'wool', name: 'Wool & cloth', tier: 'staple', basePrice: 12, unitWeight: 1, perishDays: null, bulky: true,
    productionRules: [st('Highland', 1.2), b(BIOME.Grassland, 0.8), b(BIOME.Tundra, 0.5)] },
  { id: 'ale', name: 'Ale & provisions', tier: 'staple', basePrice: 11, unitWeight: 1, perishDays: 120, bulky: true,
    productionRules: [base(0.6), b(BIOME.Grassland, 0.5), b(BIOME.TemperateDeciduousForest, 0.4)] },
  { id: 'stone', name: 'Cut stone', tier: 'staple', basePrice: 7, unitWeight: 1, perishDays: null, bulky: true,
    productionRules: [st('Highland', 1.5), base(0.3)] },

  // --- Tier 2: regional commodities (arbitrage workhorses) ---
  { id: 'iron', name: 'Iron & tools', tier: 'commodity', basePrice: 24, unitWeight: 1, perishDays: null, bulky: true,
    productionRules: [mine('iron', 3.0), st('Highland', 1.3), base(0.3)] },
  { id: 'horses', name: 'Steppe horses', tier: 'commodity', basePrice: 40, unitWeight: 1, perishDays: null, bulky: false,
    productionRules: [st('Nomadic', 2.0), b(BIOME.Grassland, 0.4)] },
  { id: 'furs', name: 'Furs', tier: 'commodity', basePrice: 30, unitWeight: 1, perishDays: null, bulky: false,
    productionRules: [b(BIOME.Taiga, 1.0), b(BIOME.Tundra, 1.0), st('Hunting', 1.5)] },
  { id: 'wine', name: 'Wine & spirits', tier: 'commodity', basePrice: 26, unitWeight: 1, perishDays: null, bulky: false,
    productionRules: [cul('Anor', 1.4), b(BIOME.TemperateDeciduousForest, 0.6)] },
  { id: 'spices', name: 'Spices & dyes', tier: 'commodity', basePrice: 45, unitWeight: 1, perishDays: null, bulky: false,
    productionRules: [b(BIOME.TropicalRainforest, 1.0), b(BIOME.TropicalSeasonalForest, 0.8)] },
  { id: 'cotton', name: 'Cotton & silks', tier: 'commodity', basePrice: 34, unitWeight: 1, perishDays: null, bulky: false,
    productionRules: [b(BIOME.TropicalSeasonalForest, 1.0), cul('Thyran', 1.3)] },
  { id: 'honey', name: 'Honey & wax', tier: 'commodity', basePrice: 20, unitWeight: 1, perishDays: 180, bulky: false,
    productionRules: [b(BIOME.TemperateDeciduousForest, 0.8), b(BIOME.TemperateRainforest, 0.8)] },
  { id: 'oils', name: 'Lamp oil & pitch', tier: 'commodity', basePrice: 22, unitWeight: 1, perishDays: null, bulky: false,
    productionRules: [b(BIOME.Wetland, 1.0), port(0.6)] },

  // --- Tier 3: luxuries (low volume, high margin, tier-gated demand) ---
  { id: 'silver', name: 'Silverwork', tier: 'luxury', basePrice: 80, unitWeight: 0.5, perishDays: null, bulky: false,
    productionRules: [mine('silver', 3.0), cul('Khiz', 0.6)] },
  { id: 'gems', name: 'Gems & jewelry', tier: 'luxury', basePrice: 120, unitWeight: 0.2, perishDays: null, bulky: false,
    productionRules: [cul('Khiz', 1.0), st('Highland', 0.8)] },
  { id: 'dwarfsteel', name: 'Dwarf-steel arms', tier: 'luxury', basePrice: 150, unitWeight: 0.5, perishDays: null, bulky: false,
    productionRules: [cul('Khiz', 1.0)] },
  { id: 'elfwork', name: 'Elf-craft', tier: 'luxury', basePrice: 130, unitWeight: 0.3, perishDays: null, bulky: false,
    productionRules: [cul('Thyran', 1.0), cul('Metheine', 1.0), cul('Mythlerion', 1.0)] },
  { id: 'clockwork', name: 'Gnomish clockwork', tier: 'luxury', basePrice: 140, unitWeight: 0.3, perishDays: null, bulky: false,
    productionRules: [cul('Litbarow', 1.0)] },
  { id: 'incense', name: 'Incense & relic-goods', tier: 'luxury', basePrice: 60, unitWeight: 0.3, perishDays: null, bulky: false,
    productionRules: [b(BIOME.TropicalSeasonalForest, 0.4), b(BIOME.TropicalRainforest, 0.4), base(0.2)] },

  // --- Tier 4: special (adventure-economy goods; players become producers later) ---
  { id: 'monsterparts', name: 'Monster parts & reagents', tier: 'special', basePrice: 90, unitWeight: 0.5, perishDays: 30, bulky: false,
    productionRules: [base(0.15)] },
  { id: 'relics', name: 'Relics & artifacts', tier: 'special', basePrice: 200, unitWeight: 0.3, perishDays: null, bulky: false,
    productionRules: [base(0.1)] },
];

const BY_ID = new Map(GOODS.map((g) => [g.id, g]));

export function getGood(id: string): Good | undefined {
  return BY_ID.get(id);
}

export const GOOD_IDS = GOODS.map((g) => g.id);

export const GOODS_BY_TIER: Record<GoodTier, Good[]> = {
  staple: GOODS.filter((g) => g.tier === 'staple'),
  commodity: GOODS.filter((g) => g.tier === 'commodity'),
  luxury: GOODS.filter((g) => g.tier === 'luxury'),
  special: GOODS.filter((g) => g.tier === 'special'),
};

/** Price elasticity by tier (§4.2): staples inelastic, luxuries swing hard. */
export const ELASTICITY: Record<GoodTier, number> = {
  staple: 0.5,
  commodity: 0.8,
  luxury: 1.2,
  special: 1.2,
};
