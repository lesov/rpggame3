/**
 * Actor tables: who shows up. This sits between the two questions and may read
 * anything (density and geography) — the split rule only forbids λ from seeing
 * disposition and P(hostile) from seeing density. "Bandits prefer roads"
 * belongs here, not in the rate: they need traffic.
 *
 * A draw yields an ActorKind and the statblock it would fight as (so a patrol
 * that turns hostile has a body). Hostility itself is decided by disposition.
 */
import { MONSTERS, getMonster, defaultOpponentFor, type EncounterActorAffinity, type Monster } from '../../combat/monsters';
import type { ActorKind, EncounterActor, WildernessLevel } from './types';

export interface TableContext {
  biomeId: number;
  road: 'roads' | 'trails' | 'offroad';
  pop: number;
  nearestBurgMi: number;
  night: boolean;
  isWinter: boolean;
  markerType?: string;
  wilderness?: WildernessLevel;
}

const WETLAND = 12;
const DESERT_WASTES = new Set([1, 2]); // hot/cold desert
const FORESTS = new Set([5, 6, 7, 8, 9]);
const COLD = new Set([2, 9, 10, 11]);
const GLACIER = 11;

/** Map a placed hostile marker to the actor kind it spawns. */
function markerKind(type: string): ActorKind | undefined {
  switch (type) {
    case 'brigands':
      return 'brigand';
    case 'pirates':
      return 'raider';
    case 'lake-monsters':
    case 'sea-monsters':
      return 'beast';
    case 'dungeons':
    case 'ruins':
      return 'undead';
    default:
      return undefined;
  }
}

type Weighted = { kind: ActorKind; weight: number };

function mult(level: WildernessLevel, values: Partial<Record<WildernessLevel, number>>): number {
  return values[level] ?? 1;
}

export function wildernessLevel(ctx: Pick<TableContext, 'road' | 'pop' | 'nearestBurgMi' | 'markerType'>): WildernessLevel {
  if (ctx.markerType === 'dungeons' || ctx.markerType === 'ruins' || ctx.markerType === 'lake-monsters' || ctx.markerType === 'sea-monsters') {
    return 'deepWild';
  }
  let score = 0;
  if (ctx.road === 'offroad') score += 1.1;
  else if (ctx.road === 'trails') score += 0.45;
  else score -= 0.45;
  if (ctx.nearestBurgMi >= 70) score += 1.6;
  else if (ctx.nearestBurgMi >= 45) score += 1.1;
  else if (ctx.nearestBurgMi >= 20) score += 0.45;
  else score -= 0.55;
  if (ctx.pop <= 0.15) score += 0.85;
  else if (ctx.pop < 2) score += 0.35;
  else if (ctx.pop >= 8) score -= 0.7;
  if (score >= 2.4) return 'deepWild';
  if (score >= 1.25) return 'remote';
  if (score >= 0.15) return 'frontier';
  return 'settled';
}

/** Weighted candidate kinds for a waypoint, before the seeded pick. */
export function actorWeights(ctx: TableContext): Weighted[] {
  const wild = ctx.wilderness ?? wildernessLevel(ctx);
  // A marker in range dominates the draw and pins the type.
  const mk = ctx.markerType ? markerKind(ctx.markerType) : undefined;
  if (mk) {
    return [
      { kind: mk, weight: 8 },
      { kind: 'beast', weight: 1 },
      { kind: 'traveler', weight: 1 },
    ];
  }

  const w: Weighted[] = [];

  // Beasts: forests/taiga/tundra/wetlands, and more at night, in winter, and away from towns.
  const beastBiome = FORESTS.has(ctx.biomeId) || ctx.biomeId === 10 || ctx.biomeId === WETLAND;
  w.push({
    kind: 'beast',
    weight: (beastBiome ? 3 : 1.1) * (ctx.night ? 1.45 : 1) * (ctx.isWinter ? 1.2 : 1) * mult(wild, {
      settled: 0.65,
      frontier: 1.0,
      remote: 1.35,
      deepWild: 1.65,
    }),
  });

  // Undead: wastes and old battlefields — dry deserts here.
  w.push({
    kind: 'undead',
    weight: (DESERT_WASTES.has(ctx.biomeId) || ctx.biomeId === WETLAND ? 1.35 : 0.25) * (ctx.night ? 1.6 : 1) * mult(wild, {
      settled: 0.55,
      frontier: 0.9,
      remote: 1.25,
      deepWild: 1.45,
    }),
  });

  // Goblinoids: badlands, cold, mountains-ish.
  w.push({
    kind: 'goblinoid',
    weight: (DESERT_WASTES.has(ctx.biomeId) || COLD.has(ctx.biomeId) ? 1.45 : 0.55) * mult(wild, {
      settled: 0.45,
      frontier: 1.0,
      remote: 1.25,
      deepWild: 1.0,
    }),
  });

  // Brigands need traffic. They should fade hard in true wilderness unless a
  // brigand marker pinned the draw above.
  const traffic = ctx.road === 'roads' ? 2.4 : ctx.road === 'trails' ? 1.25 : 0.35;
  w.push({ kind: 'brigand', weight: traffic * mult(wild, { settled: 1.45, frontier: 1.0, remote: 0.35, deepWild: 0.08 }) });

  // Stranger creatures become plausible where the road system thins out.
  w.push({
    kind: 'elemental',
    weight: ((COLD.has(ctx.biomeId) || DESERT_WASTES.has(ctx.biomeId)) ? 1.0 : 0.06) * mult(wild, {
      settled: 0.2,
      frontier: 0.75,
      remote: 1.35,
      deepWild: 1.55,
    }) * (ctx.isWinter && COLD.has(ctx.biomeId) ? 1.5 : 1),
  });
  w.push({
    kind: 'fiend',
    weight: (ctx.biomeId === GLACIER || ctx.biomeId === 10 || ctx.biomeId === 2 ? 0 : 0.18) * mult(wild, {
      settled: 0.75,
      frontier: 1.0,
      remote: 0.8,
      deepWild: 0.45,
    }) * (ctx.night ? 1.35 : 1),
  });
  w.push({
    kind: 'fey',
    weight: (FORESTS.has(ctx.biomeId) && !COLD.has(ctx.biomeId) ? 0.75 : 0.04) * mult(wild, {
      settled: 0.25,
      frontier: 0.9,
      remote: 1.35,
      deepWild: 1.5,
    }),
  });

  // Peaceful traffic: mostly by day on travelled ways; winter thins the humans.
  const humanTraffic = ctx.road === 'roads' ? 1.6 : ctx.road === 'trails' ? 0.95 : 0.4;
  const human = humanTraffic * mult(wild, { settled: 1.35, frontier: 1.0, remote: 0.45, deepWild: 0.15 }) * (ctx.night ? 0.4 : 1) * (ctx.isWinter ? 0.6 : 1);
  w.push({ kind: 'patrol', weight: human * 1.1 });
  w.push({ kind: 'merchant', weight: human * 1.0 });
  w.push({ kind: 'pilgrim', weight: human * 0.7 });
  w.push({ kind: 'hunter', weight: (beastBiome ? 1.0 : 0.5) * (ctx.night ? 0.5 : 1) * mult(wild, { settled: 0.7, frontier: 1.1, remote: 0.95, deepWild: 0.55 }) });
  w.push({ kind: 'traveler', weight: human * 0.9 });
  w.push({ kind: 'refugee', weight: human * 0.4 });

  return w.filter((x) => x.weight > 0);
}

export function pickActorKind(ctx: TableContext, roll: number): ActorKind {
  const weights = actorWeights(ctx);
  const total = weights.reduce((s, x) => s + x.weight, 0);
  let ticket = roll * total;
  for (const { kind, weight } of weights) {
    ticket -= weight;
    if (ticket < 0) return kind;
  }
  return weights[weights.length - 1].kind;
}

/** The statblock an actor fights as, biome-appropriate. */
export function monsterForKind(kind: ActorKind, biomeId: number, roll: number, ctx?: TableContext): string {
  const profiled = pickProfiledMonster(kind, biomeId, roll, ctx);
  if (profiled) return profiled.id;
  switch (kind) {
    case 'beast': {
      if (FORESTS.has(biomeId) && roll < 0.35) return 'black-bear';
      if ([6, 8, 9, 10].includes(biomeId)) return 'wolf';
      if ([3, 4].includes(biomeId)) return 'feral-dog';
      return defaultOpponentFor(biomeId, false).id;
    }
    case 'undead':
      return biomeId === WETLAND ? 'zombie' : 'skeleton';
    case 'goblinoid':
      return roll < 0.4 ? 'orc-soldier' : 'goblin';
    case 'raider':
      return roll < 0.5 ? 'thug' : 'bandit';
    case 'brigand':
      return roll < 0.25 ? 'thug' : 'bandit';
    case 'patrol':
      return roll < 0.4 ? 'orc-soldier' : 'thug';
    default:
      // Peaceful kinds only need a statblock if the meeting turns violent.
      return 'bandit';
  }
}

function affinityKind(kind: ActorKind): EncounterActorAffinity {
  return kind;
}

function monsterWeight(monster: Monster, kind: ActorKind, biomeId: number, ctx?: TableContext): number {
  const encounter = monster.encounter;
  if (!encounter?.actorKinds.includes(affinityKind(kind))) return 0;
  if (encounter.excludeBiomes?.includes(biomeId) && !ctx?.markerType) return 0;
  const wild = ctx ? ctx.wilderness ?? wildernessLevel(ctx) : 'frontier';
  const biome = encounter.biomeWeights?.[biomeId] ?? (monster.biomes.includes(biomeId) ? 1 : 0);
  if (biome <= 0) return 0;
  let score = biome;
  score *= encounter.wilderness?.[wild] ?? 1;
  if (ctx) {
    score *= encounter.roads?.[ctx.road] ?? 1;
    if (ctx.markerType) score *= encounter.markerTypes?.[ctx.markerType] ?? 1;
    if (ctx.night) score *= encounter.night ?? 1;
    if (ctx.isWinter) score *= encounter.winter ?? 1;
  }
  return score;
}

function pickProfiledMonster(kind: ActorKind, biomeId: number, roll: number, ctx?: TableContext): Monster | undefined {
  const candidates = MONSTERS
    .map((monster) => ({ monster, weight: monsterWeight(monster, kind, biomeId, ctx) }))
    .filter((x) => x.weight > 0);
  if (!candidates.length) return undefined;
  const total = candidates.reduce((sum, x) => sum + x.weight, 0);
  let ticket = roll * total;
  for (const { monster, weight } of candidates) {
    ticket -= weight;
    if (ticket < 0) return monster;
  }
  return candidates[candidates.length - 1].monster;
}

const PEACEFUL_DESCRIPTOR: Partial<Record<ActorKind, string>> = {
  patrol: 'a mounted patrol in state colours, reining in to look you over',
  merchant: 'a small merchant caravan under hired guard, mules blowing in the cold',
  pilgrim: 'a straggle of pilgrims on the road to some shrine, staffs and dust',
  hunter: 'a pair of hunters with a field-dressed carcass slung between them',
  refugee: 'a knot of refugees with what they could carry, eyeing you warily',
  traveler: 'a lone traveller keeping to the middle of the road',
};

export function buildActor(kind: ActorKind, biomeId: number, hostile: boolean, roll: number, ctx?: TableContext): EncounterActor {
  const statblockId = monsterForKind(kind, biomeId, roll, ctx);
  const descriptor = hostile ? getMonster(statblockId).descriptor : PEACEFUL_DESCRIPTOR[kind] ?? getMonster(statblockId).descriptor;
  return { kind, hostile, statblockId, descriptor };
}
