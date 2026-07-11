/**
 * Pure buy / sell / equip operations. Each returns a new PlayerCharacter (and,
 * for buys, a new Shop with depleted stock) or an { error } so the UI can show
 * why an action was refused. Nothing here mutates its inputs.
 */
import { getCatalogItem } from './catalog';
import { addItem, addVosels, quantityOf, removeItem, spendVosels, voselsOf, VOSELS_ID } from './money';
import type { Shop, StockEntry } from './shops';
import type { PlayerCharacter } from '../player/types';

export interface BuyResult {
  player: PlayerCharacter;
  shop: Shop;
  error?: string;
}

export interface SellResult {
  player: PlayerCharacter;
  error?: string;
}

/** Worn AC from the equipped armor (if any), else the unarmored 10 + Dex. */
export function computeArmorClass(player: PlayerCharacter): number {
  const dex = player.abilityModifiers.dex;
  const worn = player.inventory.find((i) => i.category === 'armor' && i.equipped);
  const spec = worn ? getCatalogItem(worn.id)?.armor : undefined;
  if (!spec) return 10 + dex;
  return spec.acBase + Math.min(dex, spec.dexCap);
}

export function buyItem(player: PlayerCharacter, shop: Shop, entryIndex: number, qty = 1): BuyResult {
  const entry: StockEntry | undefined = shop.stock[entryIndex];
  if (!entry) return { player, shop, error: 'No such item.' };
  if (qty <= 0) return { player, shop, error: 'Nothing to buy.' };
  if (entry.qty < qty) return { player, shop, error: 'The vendor has no more of those.' };
  const cost = entry.price * qty;
  if (voselsOf(player) < cost) return { player, shop, error: 'You cannot afford that.' };

  const nextPlayer = addItem(spendVosels(player, cost), entry.itemId, qty);
  const nextShop: Shop = {
    ...shop,
    stock: shop.stock.map((s, i) => (i === entryIndex ? { ...s, qty: s.qty - qty } : s)),
  };
  return { player: nextPlayer, shop: nextShop };
}

export function sellPrice(shop: Shop, itemId: string): number {
  const base = getCatalogItem(itemId)?.basePrice ?? 0;
  return Math.max(1, Math.round(base * shop.sellRate));
}

export function isSellable(player: PlayerCharacter, itemId: string): boolean {
  if (itemId === VOSELS_ID) return false;
  const item = player.inventory.find((i) => i.id === itemId);
  if (!item) return false;
  if (item.equipped) return false; // unequip before selling
  return (getCatalogItem(itemId)?.basePrice ?? 0) > 0;
}

export function sellItem(player: PlayerCharacter, shop: Shop, itemId: string, qty = 1): SellResult {
  if (qty <= 0) return { player, error: 'Nothing to sell.' };
  if (!isSellable(player, itemId)) return { player, error: 'You cannot sell that.' };
  if (quantityOf(player, itemId) < qty) return { player, error: 'You do not have that many.' };
  const gain = sellPrice(shop, itemId) * qty;
  return { player: addVosels(removeItem(player, itemId, qty), gain) };
}

/**
 * Equip an item into its slot (weapon or armor). Unequips any other item in the
 * same slot and recomputes armorClass. A no-op (returns input) if the item is
 * missing or not equippable.
 */
export function equipItem(player: PlayerCharacter, itemId: string): PlayerCharacter {
  const target = player.inventory.find((i) => i.id === itemId);
  const cat = target ? getCatalogItem(target.id) : undefined;
  const slot = cat?.slot ?? (target?.category === 'weapon' ? 'weapon' : target?.category === 'armor' ? 'armor' : undefined);
  if (!target || !slot) return player;

  const inventory = player.inventory.map((i) => {
    const iSlot = getCatalogItem(i.id)?.slot ?? (i.category === 'weapon' ? 'weapon' : i.category === 'armor' ? 'armor' : undefined);
    if (iSlot !== slot) return i;
    return { ...i, equipped: i.id === itemId };
  });
  const withEquip: PlayerCharacter = { ...player, inventory };
  return { ...withEquip, armorClass: computeArmorClass(withEquip) };
}

/** Unequip the item in a slot (leaving that slot empty) and recompute AC. */
export function unequipItem(player: PlayerCharacter, itemId: string): PlayerCharacter {
  const inventory = player.inventory.map((i) => (i.id === itemId ? { ...i, equipped: false } : i));
  const next: PlayerCharacter = { ...player, inventory };
  return { ...next, armorClass: computeArmorClass(next) };
}
