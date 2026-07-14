import { describe, expect, it } from 'vitest';
import { makeTestCharacter } from '../combat/fixtures';
import type { InventoryItem } from '../player/types';
import type { CatalogItem } from './catalog';
import { formatItemDisplay } from './itemDisplay';

describe('inventory item display', () => {
  it('shows weapon damage, quality bonus, value, and equipped comparison', () => {
    const player = {
      ...makeTestCharacter('fighter'),
      inventory: [
        ...makeTestCharacter('fighter').inventory,
        { id: 'longsword', name: 'Longsword', quantity: 1, category: 'weapon' as const, equipped: true },
      ],
    };
    const item: InventoryItem = { id: 'longsword-fine', name: 'Fine longsword', quantity: 1, category: 'weapon' };
    const display = formatItemDisplay(item, player);
    expect(display.statSummary).toContain('1d8');
    expect(display.statSummary).toContain('slashing');
    expect(display.detailLines.join(' ')).toContain('+1');
    expect(display.valueLabel).toBe('100 vosels');
    expect(display.compareLabel).toContain('+1 attack/damage');
  });

  it('shows armor AC formula, value, and resulting AC comparison', () => {
    const player = makeTestCharacter('fighter');
    const item: InventoryItem = { id: 'chain-shirt', name: 'Chain shirt', quantity: 1, category: 'armor' };
    const display = formatItemDisplay(item, player);
    expect(display.statSummary).toContain('AC 13');
    expect(display.statSummary).toContain('Dex max 2');
    expect(display.valueLabel).toBe('60 vosels');
    expect(display.compareLabel).toContain('AC if equipped');
  });

  it('shows consumable healing dice and value', () => {
    const item: InventoryItem = { id: 'greater-healing-potion', name: 'Greater healing potion', quantity: 1, category: 'consumable' };
    const display = formatItemDisplay(item);
    expect(display.statSummary).toBe('Heals 4d4+4');
    expect(display.valueLabel).toBe('150 vosels');
  });

  it('hides stats and value for unidentified magic items', () => {
    const catalog: CatalogItem = {
      id: 'mystery-blade',
      name: 'Mystery blade',
      category: 'weapon',
      quality: 'masterwork',
      basePrice: 1000,
      weight: 3,
      note: 'A blade with unreadable runes.',
      weapon: { baseId: 'longsword', bonus: 2 },
      slot: 'weapon',
      magic: true,
      requiresIdentify: true,
    };
    const item: InventoryItem = { id: 'mystery-blade', name: 'Mystery blade', quantity: 1, category: 'weapon' };
    const display = formatItemDisplay(item, undefined, catalog);
    expect(display.hidden).toBe(true);
    expect(display.statSummary).toBe('Requires identification');
    expect(display.valueLabel).toBe('Unknown value');
    expect(display.detailLines.join(' ')).not.toContain('+2');
  });

  it('reveals identified magic item stats', () => {
    const catalog: CatalogItem = {
      id: 'mystery-blade',
      name: 'Mystery blade',
      category: 'weapon',
      quality: 'masterwork',
      basePrice: 1000,
      weight: 3,
      note: 'A blade with readable runes.',
      weapon: { baseId: 'longsword', bonus: 2 },
      slot: 'weapon',
      magic: true,
      requiresIdentify: true,
    };
    const item: InventoryItem = { id: 'mystery-blade', name: 'Mystery blade', quantity: 1, category: 'weapon', identified: true };
    const display = formatItemDisplay(item, undefined, catalog);
    expect(display.hidden).toBe(false);
    expect(display.detailLines.join(' ')).toContain('+2');
    expect(display.valueLabel).toBe('1000 vosels');
  });
});
