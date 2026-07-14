import { getCatalogItem } from '../economy/catalog';
import { hash, mulberry32 } from '../sim/rng';
import type { CombatOutcome } from './types';

export interface LootItem {
  id: string;
  name: string;
  quantity: number;
}

interface LootEntry {
  itemId: string;
  chance: number;
  min?: number;
  max?: number;
}

const TABLES: Record<string, LootEntry[]> = {
  'feral-dog': [
    { itemId: 'dog-pelt', chance: 0.35 },
    { itemId: 'animal-teeth', chance: 0.45 },
    { itemId: 'raw-meat', chance: 0.2 },
  ],
  wolf: [
    { itemId: 'wolf-pelt', chance: 0.55 },
    { itemId: 'animal-teeth', chance: 0.5 },
    { itemId: 'raw-meat', chance: 0.25 },
  ],
  bandit: [
    { itemId: 'vosels', chance: 0.65, min: 3, max: 18 },
    { itemId: 'patched-gambeson', chance: 0.25 },
    { itemId: 'provisions', chance: 0.35, min: 1, max: 2 },
    { itemId: 'rusty-scrap', chance: 0.25 },
    { itemId: 'dagger', chance: 0.15 },
  ],
  cultist: [
    { itemId: 'cult-token', chance: 0.7 },
    { itemId: 'tarnished-charm', chance: 0.25 },
    { itemId: 'dagger', chance: 0.18 },
    { itemId: 'vosels', chance: 0.25, min: 1, max: 8 },
  ],
  goblin: [
    { itemId: 'vosels', chance: 0.45, min: 1, max: 10 },
    { itemId: 'rusty-scrap', chance: 0.55 },
    { itemId: 'dagger', chance: 0.25 },
    { itemId: 'provisions', chance: 0.2 },
  ],
  skeleton: [
    { itemId: 'bone-fragments', chance: 0.55 },
    { itemId: 'old-signet', chance: 0.18 },
    { itemId: 'shortsword', chance: 0.12 },
    { itemId: 'rusty-scrap', chance: 0.4 },
  ],
  zombie: [
    { itemId: 'tarnished-charm', chance: 0.18 },
    { itemId: 'bone-fragments', chance: 0.25 },
    { itemId: 'vosels', chance: 0.12, min: 1, max: 6 },
  ],
  thug: [
    { itemId: 'vosels', chance: 0.75, min: 8, max: 32 },
    { itemId: 'mace', chance: 0.28 },
    { itemId: 'patched-gambeson', chance: 0.35 },
    { itemId: 'provisions', chance: 0.3, min: 1, max: 2 },
  ],
  'black-bear': [
    { itemId: 'bear-pelt', chance: 0.65 },
    { itemId: 'animal-teeth', chance: 0.55, min: 1, max: 2 },
    { itemId: 'raw-meat', chance: 0.45, min: 2, max: 4 },
  ],
  'orc-soldier': [
    { itemId: 'vosels', chance: 0.45, min: 2, max: 14 },
    { itemId: 'orc-tusk', chance: 0.7 },
    { itemId: 'battleaxe', chance: 0.22 },
    { itemId: 'patched-gambeson', chance: 0.28 },
  ],
};

function textHash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function qty(rand: () => number, entry: LootEntry): number {
  const min = entry.min ?? 1;
  const max = entry.max ?? min;
  return min + Math.floor(rand() * (max - min + 1));
}

export function generateLoot(monsterId: string, seed: number, outcome: CombatOutcome | null): LootItem[] {
  if (outcome !== 'victory') return [];
  const table = TABLES[monsterId] ?? [];
  const rand = mulberry32(hash(seed, textHash(monsterId), 0x10f7));
  const items: LootItem[] = [];
  for (const entry of table) {
    if (rand() > entry.chance) continue;
    const catalog = getCatalogItem(entry.itemId);
    if (!catalog) continue;
    const quantity = qty(rand, entry);
    const existing = items.find((item) => item.id === entry.itemId);
    if (existing) existing.quantity += quantity;
    else items.push({ id: entry.itemId, name: catalog.name, quantity });
  }
  return items;
}

export function allLootItemIds(): string[] {
  return [...new Set(Object.values(TABLES).flatMap((entries) => entries.map((entry) => entry.itemId)))];
}
