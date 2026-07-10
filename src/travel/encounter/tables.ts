/**
 * Actor tables: who shows up. This sits between the two questions and may read
 * anything (density and geography) — the split rule only forbids λ from seeing
 * disposition and P(hostile) from seeing density. "Bandits prefer roads"
 * belongs here, not in the rate: they need traffic.
 *
 * A draw yields an ActorKind and the statblock it would fight as (so a patrol
 * that turns hostile has a body). Hostility itself is decided by disposition.
 */
import { getMonster, defaultOpponentFor } from '../../combat/monsters';
import type { ActorKind, EncounterActor } from './types';

export interface TableContext {
  biomeId: number;
  road: 'roads' | 'trails' | 'offroad';
  pop: number;
  night: boolean;
  isWinter: boolean;
  markerType?: string;
}

const WETLAND = 12;
const DESERT_WASTES = new Set([1, 2]); // hot/cold desert
const FORESTS = new Set([5, 6, 7, 8, 9]);

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

/** Weighted candidate kinds for a waypoint, before the seeded pick. */
export function actorWeights(ctx: TableContext): Weighted[] {
  // A marker in range dominates the draw and pins the type.
  const mk = ctx.markerType ? markerKind(ctx.markerType) : undefined;
  if (mk) {
    return [
      { kind: mk, weight: 8 },
      { kind: 'beast', weight: 1 },
      { kind: 'traveler', weight: 1 },
    ];
  }

  const settled = ctx.pop >= 6 || ctx.road !== 'offroad';
  const w: Weighted[] = [];

  // Beasts: forests/taiga/tundra, and more at night / in winter.
  const beastBiome = FORESTS.has(ctx.biomeId) || ctx.biomeId === 10 || ctx.biomeId === 9;
  w.push({ kind: 'beast', weight: (beastBiome ? 3 : 1.2) * (ctx.night ? 1.6 : 1) * (ctx.isWinter ? 1.4 : 1) });

  // Undead: wastes and old battlefields — dry deserts here.
  w.push({ kind: 'undead', weight: DESERT_WASTES.has(ctx.biomeId) ? 1.6 * (ctx.night ? 1.5 : 1) : 0.2 });

  // Goblinoids: badlands, cold, mountains-ish.
  w.push({ kind: 'goblinoid', weight: DESERT_WASTES.has(ctx.biomeId) || ctx.biomeId === 10 ? 1.4 : 0.5 });

  // Brigands: need traffic — roads and settled country.
  w.push({ kind: 'brigand', weight: (ctx.road === 'offroad' ? 0.6 : 2.2) + (settled ? 0.6 : 0) });

  // Peaceful traffic: mostly by day on travelled ways; winter thins the humans.
  const human = (settled ? 1.5 : 0.6) * (ctx.night ? 0.4 : 1) * (ctx.isWinter ? 0.6 : 1);
  w.push({ kind: 'patrol', weight: human * 1.1 });
  w.push({ kind: 'merchant', weight: human * 1.0 });
  w.push({ kind: 'pilgrim', weight: human * 0.7 });
  w.push({ kind: 'hunter', weight: (beastBiome ? 1.0 : 0.5) * (ctx.night ? 0.5 : 1) });
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
export function monsterForKind(kind: ActorKind, biomeId: number, roll: number): string {
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

const PEACEFUL_DESCRIPTOR: Partial<Record<ActorKind, string>> = {
  patrol: 'a mounted patrol in state colours, reining in to look you over',
  merchant: 'a small merchant caravan under hired guard, mules blowing in the cold',
  pilgrim: 'a straggle of pilgrims on the road to some shrine, staffs and dust',
  hunter: 'a pair of hunters with a field-dressed carcass slung between them',
  refugee: 'a knot of refugees with what they could carry, eyeing you warily',
  traveler: 'a lone traveller keeping to the middle of the road',
};

export function buildActor(kind: ActorKind, biomeId: number, hostile: boolean, roll: number): EncounterActor {
  const monsterId = monsterForKind(kind, biomeId, roll);
  const descriptor = hostile ? getMonster(monsterId).descriptor : PEACEFUL_DESCRIPTOR[kind] ?? getMonster(monsterId).descriptor;
  return { kind, hostile, monsterId: hostile ? monsterId : undefined, descriptor };
}
