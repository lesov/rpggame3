import type { InventoryItem, PlayerCharacter } from '../player/types';
import { weaponStats } from '../combat/weapons';
import { getCatalogItem, type CatalogItem } from './catalog';

export interface ItemDisplay {
  typeLabel: string;
  statSummary: string;
  detailLines: string[];
  valueLabel: string;
  weightLabel: string;
  hidden: boolean;
  compareLabel?: string;
}

function valueLabel(item: CatalogItem): string {
  return item.basePrice > 0 ? `${item.basePrice} vosels` : 'No market value';
}

function weightLabel(item: CatalogItem): string {
  return item.weight > 0 ? `${item.weight} lb` : 'Weightless';
}

function qualityLabel(item: CatalogItem): string {
  return item.magic ? `Magic ${item.quality}` : item.quality;
}

function armorFormula(item: CatalogItem): string {
  const armor = item.armor;
  if (!armor) return 'No armor stats';
  const dex = armor.dexCap === Infinity ? 'full Dex' : `Dex max ${armor.dexCap}`;
  return `AC ${armor.acBase} + ${dex}`;
}

function armorAcFor(item: CatalogItem, player?: PlayerCharacter): number | undefined {
  if (!item.armor || !player) return undefined;
  return item.armor.acBase + Math.min(player.abilityModifiers.dex, item.armor.dexCap);
}

function equippedCatalog(player: PlayerCharacter | undefined, slot: 'weapon' | 'armor'): CatalogItem | undefined {
  if (!player) return undefined;
  const equipped = player.inventory.find((i) => i.equipped && getCatalogItem(i.id)?.slot === slot);
  return equipped ? getCatalogItem(equipped.id) : undefined;
}

function compareWeapon(item: CatalogItem, player?: PlayerCharacter): string | undefined {
  const current = equippedCatalog(player, 'weapon');
  if (!item.weapon || !current?.weapon || current.id === item.id) return undefined;
  const diff = item.weapon.bonus - current.weapon.bonus;
  if (diff === 0) return `Same magic/quality bonus as equipped ${current.name}`;
  return `${diff > 0 ? '+' : ''}${diff} attack/damage bonus vs equipped ${current.name}`;
}

function compareArmor(item: CatalogItem, player?: PlayerCharacter): string | undefined {
  const ac = armorAcFor(item, player);
  if (!item.armor || !player || ac === undefined) return undefined;
  const diff = ac - player.armorClass;
  if (diff === 0) return `Same AC as current (${player.armorClass})`;
  return `${diff > 0 ? '+' : ''}${diff} AC if equipped (${ac})`;
}

export function formatItemDisplay(inventoryItem: InventoryItem, player?: PlayerCharacter, catalogOverride?: CatalogItem): ItemDisplay {
  const catalog = catalogOverride ?? getCatalogItem(inventoryItem.id);
  if (!catalog) {
    return {
      typeLabel: inventoryItem.category,
      statSummary: 'Unknown item',
      detailLines: [inventoryItem.note ?? 'No catalog entry.'],
      valueLabel: 'Unknown value',
      weightLabel: 'Unknown weight',
      hidden: false,
    };
  }

  const hidden = Boolean(catalog.requiresIdentify && inventoryItem.identified !== true);
  if (hidden) {
    return {
      typeLabel: catalog.magic ? 'unidentified magic item' : 'unidentified item',
      statSummary: 'Requires identification',
      detailLines: ['Properties, value, and combat statistics are unknown until identified.'],
      valueLabel: 'Unknown value',
      weightLabel: weightLabel(catalog),
      hidden: true,
    };
  }

  if (catalog.weapon) {
    const stats = weaponStats(catalog.weapon.baseId);
    const bonus = catalog.weapon.bonus > 0 ? ` +${catalog.weapon.bonus}` : '';
    return {
      typeLabel: `${qualityLabel(catalog)} weapon`,
      statSummary: `${stats.damageDice}${bonus} ${stats.damageType}`,
      detailLines: [
        `Base: ${stats.name}`,
        `Attack/damage bonus: ${catalog.weapon.bonus >= 0 ? '+' : ''}${catalog.weapon.bonus}`,
        catalog.note,
      ],
      valueLabel: valueLabel(catalog),
      weightLabel: weightLabel(catalog),
      hidden: false,
      compareLabel: compareWeapon(catalog, player),
    };
  }

  if (catalog.armor) {
    return {
      typeLabel: `${qualityLabel(catalog)} armor`,
      statSummary: armorFormula(catalog),
      detailLines: [catalog.note],
      valueLabel: valueLabel(catalog),
      weightLabel: weightLabel(catalog),
      hidden: false,
      compareLabel: compareArmor(catalog, player),
    };
  }

  if (catalog.heal) {
    return {
      typeLabel: `${qualityLabel(catalog)} consumable`,
      statSummary: `Heals ${catalog.heal}`,
      detailLines: [catalog.note],
      valueLabel: valueLabel(catalog),
      weightLabel: weightLabel(catalog),
      hidden: false,
    };
  }

  return {
    typeLabel: `${qualityLabel(catalog)} ${catalog.category}`,
    statSummary: catalog.note,
    detailLines: [catalog.note],
    valueLabel: valueLabel(catalog),
    weightLabel: weightLabel(catalog),
    hidden: false,
  };
}
