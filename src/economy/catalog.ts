/**
 * The item catalog: the canonical registry of everything that can be bought,
 * sold, or carried. Combat and shops resolve an inventory item's real stats by
 * looking it up here by id, so the same id used in a PlayerCharacter's
 * inventory (e.g. 'longsword', 'healing-potion', 'vosels') resolves to price,
 * quality, and mechanical effect.
 *
 * Quality is what a shop gates: better grades are genuinely stronger in play
 * (greater potions heal more, finer weapons hit harder, better armor raises AC)
 * and are only stocked by the best shops in the biggest cities.
 */
import type { InventoryItem } from '../player/types';

export type ItemQuality = 'common' | 'fine' | 'masterwork';
export const QUALITY_ORDER: ItemQuality[] = ['common', 'fine', 'masterwork'];

export function qualityRank(q: ItemQuality): number {
  return QUALITY_ORDER.indexOf(q);
}

export type ItemCategory = InventoryItem['category'];

/** A weapon grade: which base weapon it is, plus a to-hit/damage bonus. */
export interface WeaponSpec {
  baseId: string; // key into combat WEAPON_STATS (damage dice, type, verb)
  bonus: number; // added to to-hit and damage (0 = plain, 1 = fine, 2 = masterwork)
}

/** An armor grade: worn AC = acBase + min(dexMod, dexCap). */
export interface ArmorSpec {
  acBase: number;
  dexCap: number; // Infinity for light armor
}

export interface CatalogItem {
  id: string;
  name: string;
  category: ItemCategory;
  quality: ItemQuality;
  basePrice: number; // in vosels; 0 = not purchasable on its own (e.g. coin)
  weight: number; // in pounds; counts toward carry capacity (coins are 0)
  note: string;
  weapon?: WeaponSpec;
  armor?: ArmorSpec;
  heal?: string; // dice for a healing consumable, e.g. '2d4+2'
  slot?: 'weapon' | 'armor'; // equippable slot
}

/** Default weight (lb) for any id without an explicit entry. */
export const DEFAULT_ITEM_WEIGHT = 1;

/** Weapon weight (lb) keyed by base weapon; grade variants weigh the same. */
const WEAPON_WEIGHT: Record<string, number> = {
  battleaxe: 4,
  longsword: 3,
  rapier: 2,
  shortsword: 2,
  spear: 3,
  mace: 4,
  quarterstaff: 4,
  dagger: 1,
};

function weapon(
  id: string,
  name: string,
  quality: ItemQuality,
  basePrice: number,
  baseId: string,
  bonus: number,
  note: string,
): CatalogItem {
  return {
    id,
    name,
    category: 'weapon',
    quality,
    basePrice,
    weight: WEAPON_WEIGHT[baseId] ?? 2,
    note,
    weapon: { baseId, bonus },
    slot: 'weapon',
  };
}

function armor(
  id: string,
  name: string,
  quality: ItemQuality,
  basePrice: number,
  acBase: number,
  dexCap: number,
  weight: number,
  note: string,
): CatalogItem {
  return { id, name, category: 'armor', quality, basePrice, weight, note, armor: { acBase, dexCap }, slot: 'armor' };
}

function potion(id: string, name: string, quality: ItemQuality, basePrice: number, heal: string, note: string): CatalogItem {
  return { id, name, category: 'consumable', quality, basePrice, weight: 0.5, note, heal };
}

/**
 * Every catalog entry, keyed by id. Base-weapon ids ('longsword', 'dagger', …)
 * match STARTING_WEAPON_BY_CLASS so starting inventories resolve cleanly; the
 * `-fine` / `-masterwork` variants are the higher grades a good shop stocks.
 */
export const CATALOG: CatalogItem[] = [
  // --- Currency (never sold; here so lookups by id always resolve) ---
  { id: 'vosels', name: 'Vosels', category: 'coin', quality: 'common', basePrice: 0, weight: 0, note: 'Common global currency.' },

  // --- Weapons: the 8 class weapons at common, plus fine & masterwork grades ---
  weapon('battleaxe', 'Battleaxe', 'common', 20, 'battleaxe', 0, 'A serviceable footman\'s axe.'),
  weapon('battleaxe-fine', 'Fine battleaxe', 'fine', 90, 'battleaxe', 1, 'Balanced head, honed edge — +1 to hit and damage.'),
  weapon('battleaxe-masterwork', 'Masterwork battleaxe', 'masterwork', 300, 'battleaxe', 2, 'A master smith\'s work — +2 to hit and damage.'),
  weapon('longsword', 'Longsword', 'common', 25, 'longsword', 0, 'A plain arming sword.'),
  weapon('longsword-fine', 'Fine longsword', 'fine', 100, 'longsword', 1, 'Fine steel, true edge — +1 to hit and damage.'),
  weapon('longsword-masterwork', 'Masterwork longsword', 'masterwork', 320, 'longsword', 2, 'Flawless folded steel — +2 to hit and damage.'),
  weapon('rapier', 'Rapier', 'common', 25, 'rapier', 0, 'A slender thrusting blade.'),
  weapon('rapier-fine', 'Fine rapier', 'fine', 100, 'rapier', 1, 'Perfectly weighted — +1 to hit and damage.'),
  weapon('rapier-masterwork', 'Masterwork rapier', 'masterwork', 320, 'rapier', 2, 'A duelist\'s treasure — +2 to hit and damage.'),
  weapon('shortsword', 'Shortsword', 'common', 15, 'shortsword', 0, 'A light, quick blade.'),
  weapon('shortsword-fine', 'Fine shortsword', 'fine', 70, 'shortsword', 1, 'Keen and light — +1 to hit and damage.'),
  weapon('spear', 'Spear', 'common', 4, 'spear', 0, 'A simple hafted spear.'),
  weapon('spear-fine', 'Fine spear', 'fine', 40, 'spear', 1, 'True-shafted, sharp head — +1 to hit and damage.'),
  weapon('mace', 'Mace', 'common', 10, 'mace', 0, 'A plain flanged mace.'),
  weapon('mace-fine', 'Fine mace', 'fine', 55, 'mace', 1, 'Well-forged flanges — +1 to hit and damage.'),
  weapon('quarterstaff', 'Quarterstaff', 'common', 2, 'quarterstaff', 0, 'A stout wooden staff.'),
  weapon('dagger', 'Dagger', 'common', 4, 'dagger', 0, 'A common belt knife.'),
  weapon('dagger-fine', 'Fine dagger', 'fine', 35, 'dagger', 1, 'A jeweller\'s edge — +1 to hit and damage.'),

  // --- Armor: worn AC = acBase + min(dexMod, dexCap) ---
  armor('padded-armor', 'Padded armor', 'common', 6, 11, Infinity, 8, 'Quilted cloth — AC 11 + full Dexterity.'),
  armor('leather-armor', 'Leather armor', 'common', 12, 11, Infinity, 10, 'Supple boiled leather — AC 11 + full Dexterity.'),
  armor('studded-leather', 'Studded leather', 'fine', 50, 12, Infinity, 13, 'Riveted leather — AC 12 + full Dexterity.'),
  armor('hide-armor', 'Hide armor', 'common', 12, 12, 2, 12, 'Thick furs and hide — AC 12 + Dexterity (max 2).'),
  armor('chain-shirt', 'Chain shirt', 'fine', 60, 13, 2, 20, 'A shirt of interlocking rings — AC 13 + Dexterity (max 2).'),
  armor('scale-mail', 'Scale mail', 'fine', 55, 14, 2, 45, 'Overlapping metal scales — AC 14 + Dexterity (max 2).'),
  armor('breastplate', 'Breastplate', 'masterwork', 420, 14, 2, 20, 'A fitted steel cuirass — AC 14 + Dexterity (max 2), finely made.'),
  armor('half-plate', 'Half plate', 'masterwork', 780, 15, 2, 40, 'Articulated plate — AC 15 + Dexterity (max 2).'),

  // --- Consumables ---
  potion('healing-potion', 'Healing potion', 'common', 50, '2d4+2', 'A red restorative draught in a wax-sealed vial.'),
  potion('greater-healing-potion', 'Greater healing potion', 'fine', 150, '4d4+4', 'A deep-crimson draught — closes even bad wounds.'),
  potion('superior-healing-potion', 'Superior healing potion', 'masterwork', 500, '8d4+8', 'A luminous elixir sold only in the great cities.'),
  { id: 'antitoxin', name: 'Antitoxin', category: 'consumable', quality: 'common', basePrice: 50, weight: 0, note: 'Neutralises a poison for a time.' },

  // --- Gear / tools (utility, no combat math) ---
  { id: 'provisions', name: 'Food provisions', category: 'gear', quality: 'common', basePrice: 1, weight: 2, note: 'A day of travel rations.' },
  { id: 'torch', name: 'Torch', category: 'gear', quality: 'common', basePrice: 1, weight: 1, note: 'Burns for about an hour.' },
  { id: 'rope', name: 'Hempen rope (50 ft)', category: 'gear', quality: 'common', basePrice: 2, weight: 10, note: 'Fifty feet of stout rope.' },
  { id: 'bedroll', name: 'Bedroll', category: 'gear', quality: 'common', basePrice: 2, weight: 7, note: 'For nights on the road.' },
  { id: 'tinderbox', name: 'Tinderbox', category: 'gear', quality: 'common', basePrice: 1, weight: 1, note: 'Flint, steel, and tinder.' },
  { id: 'backpack-fine', name: 'Fine travelling pack', category: 'gear', quality: 'fine', basePrice: 30, weight: 5, note: 'A well-made pack that carries more, comfortably.' },
  { id: 'lantern', name: 'Hooded lantern', category: 'tool', quality: 'fine', basePrice: 25, weight: 2, note: 'A shuttered oil lantern.' },
  { id: 'healers-kit', name: "Healer's kit", category: 'tool', quality: 'fine', basePrice: 40, weight: 3, note: 'Bandages and salves — stabilises the dying.' },

  // --- Clothing & the wizard spellbook: not sold (basePrice 0), but weighed ---
  { id: 'robe', name: 'Plain robe', category: 'clothing', quality: 'common', basePrice: 0, weight: 4, note: 'Coarse, travel-stained, and intentionally unmarked.' },
  { id: 'sandals', name: 'Worn sandals', category: 'clothing', quality: 'common', basePrice: 0, weight: 0, note: 'Enough for the road, barely.' },
  { id: 'shoes', name: 'Worn shoes', category: 'clothing', quality: 'common', basePrice: 0, weight: 1, note: 'Scuffed, serviceable, and not worth stealing.' },
  { id: 'coat', name: 'Plain coat', category: 'clothing', quality: 'common', basePrice: 0, weight: 6, note: 'Heavy enough for cold roads, but plain and unmarked.' },
  { id: 'spellbook', name: 'Spellbook', category: 'tool', quality: 'common', basePrice: 0, weight: 3, note: 'A compact working book for prepared spells and arcane notation.' },
];

const BY_ID = new Map(CATALOG.map((c) => [c.id, c]));

export function getCatalogItem(id: string): CatalogItem | undefined {
  return BY_ID.get(id);
}

export function basePriceOf(id: string): number {
  return BY_ID.get(id)?.basePrice ?? 0;
}

/** Weight in pounds for an item id; a light default for unknown ids. */
export function weightOf(id: string): number {
  return BY_ID.get(id)?.weight ?? DEFAULT_ITEM_WEIGHT;
}

export function catalogByCategory(category: ItemCategory): CatalogItem[] {
  return CATALOG.filter((c) => c.category === category);
}

/** Items at or below a quality ceiling, optionally filtered by category. */
export function catalogUpTo(ceiling: ItemQuality, categories?: ItemCategory[]): CatalogItem[] {
  const cap = qualityRank(ceiling);
  return CATALOG.filter(
    (c) => c.basePrice > 0 && qualityRank(c.quality) <= cap && (!categories || categories.includes(c.category)),
  );
}
