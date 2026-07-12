import { describe, expect, it } from 'vitest';
import { buyItem, sellItem, sellPrice, equipItem, unequipItem, computeArmorClass, isSellable } from './transaction';
import { voselsOf, quantityOf } from './money';
import type { Shop } from './shops';
import { getCatalogItem } from './catalog';
import { makeTestCharacter } from '../combat/fixtures';
import type { PlayerCharacter } from '../player/types';

function shopWith(...stock: { itemId: string; price: number; qty: number }[]): Shop {
  return {
    id: 'test-shop',
    title: 'Test',
    vendorKind: 'shop',
    qualityCeiling: 'masterwork',
    categories: ['weapon', 'armor', 'consumable', 'gear', 'tool'],
    priceMult: 1,
    sellRate: 0.4,
    stock,
  };
}

/** A player with a known purse and a couple of sellable items. */
function buyer(vosels = 200): PlayerCharacter {
  const pc = makeTestCharacter('fighter');
  return {
    ...pc,
    inventory: [
      { id: 'vosels', name: 'Vosels', quantity: vosels, category: 'coin' },
      { id: 'provisions', name: 'Food provisions', quantity: 5, category: 'gear' },
      { id: 'longsword', name: 'Longsword', quantity: 1, category: 'weapon', equipped: true },
    ],
  };
}

describe('buying', () => {
  it('deducts vosels, adds the item, and depletes stock', () => {
    const p0 = buyer(200);
    const shop = shopWith({ itemId: 'greater-healing-potion', price: 150, qty: 2 });
    const { player, shop: after, error } = buyItem(p0, shop, 0, 1);
    expect(error).toBeUndefined();
    expect(voselsOf(player)).toBe(50);
    expect(quantityOf(player, 'greater-healing-potion')).toBe(1);
    expect(after.stock[0].qty).toBe(1);
  });

  it('refuses purchases the player cannot afford', () => {
    const shop = shopWith({ itemId: 'superior-healing-potion', price: 500, qty: 1 });
    const { player, error } = buyItem(buyer(100), shop, 0, 1);
    expect(error).toBeTruthy();
    expect(voselsOf(player)).toBe(100);
  });

  it('refuses to buy more than the vendor stocks', () => {
    const shop = shopWith({ itemId: 'healing-potion', price: 50, qty: 1 });
    const { error } = buyItem(buyer(500), shop, 0, 3);
    expect(error).toBeTruthy();
  });

  it('refuses a purchase that would overload the carrier', () => {
    // A STR 8 buyer (cap 120 lb) already near capacity cannot take on 45 lb of mail.
    const heavy = {
      ...buyer(1000),
      abilityScores: { ...buyer().abilityScores, str: 8 },
      inventory: [
        { id: 'vosels', name: 'Vosels', quantity: 1000, category: 'coin' as const },
        { id: 'half-plate', name: 'Half plate', quantity: 2, category: 'armor' as const }, // 80 lb, cap 120
      ],
    };
    const shop = shopWith({ itemId: 'scale-mail', price: 55, qty: 1 }); // 45 lb -> 125 > 120
    const { player, error } = buyItem(heavy, shop, 0, 1);
    expect(error).toBe('That would overload you.');
    expect(voselsOf(player)).toBe(1000); // nothing spent
    expect(quantityOf(player, 'scale-mail')).toBe(0);
  });
});

describe('selling', () => {
  it('adds vosels at the sell rate and removes the item', () => {
    const p0 = buyer(0);
    const shop = shopWith();
    const price = sellPrice(shop, 'provisions');
    expect(price).toBe(Math.max(1, Math.round(getCatalogItem('provisions')!.basePrice * 0.4)));
    const { player, error } = sellItem(p0, shop, 'provisions', 5);
    expect(error).toBeUndefined();
    expect(quantityOf(player, 'provisions')).toBe(0);
    expect(voselsOf(player)).toBe(price * 5);
  });

  it('never sells coin or an equipped item', () => {
    const p0 = buyer(50);
    expect(isSellable(p0, 'vosels')).toBe(false);
    expect(isSellable(p0, 'longsword')).toBe(false); // equipped
    const { error } = sellItem(p0, shopWith(), 'longsword', 1);
    expect(error).toBeTruthy();
  });
});

describe('equipping and AC', () => {
  it('unarmored AC is 10 + Dex', () => {
    const pc = buyer();
    expect(computeArmorClass(pc)).toBe(10 + pc.abilityModifiers.dex);
  });

  it('equipping armor raises AC and swapping armor replaces it', () => {
    let pc = buyer();
    pc = { ...pc, inventory: [...pc.inventory, { id: 'chain-shirt', name: 'Chain shirt', quantity: 1, category: 'armor' }] };
    pc = equipItem(pc, 'chain-shirt');
    const spec = getCatalogItem('chain-shirt')!.armor!;
    expect(pc.armorClass).toBe(spec.acBase + Math.min(pc.abilityModifiers.dex, spec.dexCap));
    expect(pc.inventory.find((i) => i.id === 'chain-shirt')!.equipped).toBe(true);

    // Add a second armor and equip it: the first must unequip.
    pc = { ...pc, inventory: [...pc.inventory, { id: 'leather-armor', name: 'Leather armor', quantity: 1, category: 'armor' }] };
    pc = equipItem(pc, 'leather-armor');
    expect(pc.inventory.find((i) => i.id === 'chain-shirt')!.equipped).toBe(false);
    expect(pc.inventory.find((i) => i.id === 'leather-armor')!.equipped).toBe(true);
  });

  it('unequipping armor returns AC to unarmored', () => {
    let pc = buyer();
    pc = { ...pc, inventory: [...pc.inventory, { id: 'leather-armor', name: 'Leather armor', quantity: 1, category: 'armor' }] };
    pc = equipItem(pc, 'leather-armor');
    pc = unequipItem(pc, 'leather-armor');
    expect(pc.armorClass).toBe(10 + pc.abilityModifiers.dex);
  });

  it('equipping a weapon swaps the equipped weapon', () => {
    let pc = buyer();
    pc = { ...pc, inventory: [...pc.inventory, { id: 'longsword-masterwork', name: 'Masterwork longsword', quantity: 1, category: 'weapon' }] };
    pc = equipItem(pc, 'longsword-masterwork');
    expect(pc.inventory.find((i) => i.id === 'longsword')!.equipped).toBe(false);
    expect(pc.inventory.find((i) => i.id === 'longsword-masterwork')!.equipped).toBe(true);
  });
});
