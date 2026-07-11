/**
 * Currency and inventory helpers. Vosels are held as the inventory item with
 * id 'vosels' (category 'coin'); there is no separate money field. All helpers
 * are immutable — they return a new PlayerCharacter with a fresh inventory
 * array, mirroring the existing inline patterns in ui/store.tsx.
 */
import { getCatalogItem } from './catalog';
import type { InventoryItem, PlayerCharacter } from '../player/types';

export const VOSELS_ID = 'vosels';

export function voselsOf(player: PlayerCharacter): number {
  return player.inventory.find((i) => i.id === VOSELS_ID)?.quantity ?? 0;
}

function withInventory(player: PlayerCharacter, inventory: InventoryItem[]): PlayerCharacter {
  return { ...player, inventory };
}

/** Add `qty` of an item, merging into an existing stack when present. */
export function addItem(player: PlayerCharacter, id: string, qty: number): PlayerCharacter {
  if (qty <= 0) return player;
  const existing = player.inventory.find((i) => i.id === id);
  if (existing) {
    return withInventory(
      player,
      player.inventory.map((i) => (i.id === id ? { ...i, quantity: i.quantity + qty } : i)),
    );
  }
  const cat = getCatalogItem(id);
  const fresh: InventoryItem = {
    id,
    name: cat?.name ?? id,
    quantity: qty,
    category: cat?.category ?? 'gear',
    note: cat?.note,
  };
  return withInventory(player, [...player.inventory, fresh]);
}

/** Remove up to `qty` of an item; drops the stack when it hits zero. */
export function removeItem(player: PlayerCharacter, id: string, qty: number): PlayerCharacter {
  if (qty <= 0) return player;
  const inventory = player.inventory
    .map((i) => (i.id === id ? { ...i, quantity: i.quantity - qty } : i))
    .filter((i) => i.quantity > 0);
  return withInventory(player, inventory);
}

export function addVosels(player: PlayerCharacter, n: number): PlayerCharacter {
  return addItem(player, VOSELS_ID, Math.max(0, Math.round(n)));
}

/** Spend vosels; clamps at zero (callers should check affordability first). */
export function spendVosels(player: PlayerCharacter, n: number): PlayerCharacter {
  const cost = Math.min(voselsOf(player), Math.max(0, Math.round(n)));
  return removeItem(player, VOSELS_ID, cost);
}

export function quantityOf(player: PlayerCharacter, id: string): number {
  return player.inventory.find((i) => i.id === id)?.quantity ?? 0;
}
