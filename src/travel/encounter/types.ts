/**
 * Travel-encounter types. The core design rule — the two questions stay
 * separate — is enforced structurally: the rate model reads only a
 * RateContext (density fields, no disposition), and the disposition model
 * reads only a DispositionContext (disposition fields, no density). Neither
 * function can see the other's inputs because they are not in its argument
 * type. run.ts assembles both from the same cell.
 */
import type { GameDate } from '../../sim/calendar';

export type RoadTier = 'roads' | 'trails' | 'offroad';

/** Azgaar per-state diplomacy relation toward another state. */
export type DiplomacyRelation =
  | 'Ally'
  | 'Friendly'
  | 'Neutral'
  | 'Suspicion'
  | 'Enemy'
  | 'Rival'
  | 'Unknown'
  | 'Self'
  | 'Vassal'
  | 'Suzerain';

export type ActorKind =
  // hostile-leaning
  | 'beast'
  | 'undead'
  | 'brigand'
  | 'goblinoid'
  | 'raider'
  | 'fiend'
  | 'elemental'
  | 'fey'
  // peaceful-leaning
  | 'patrol'
  | 'merchant'
  | 'pilgrim'
  | 'hunter'
  | 'refugee'
  | 'traveler';

export type WildernessLevel = 'settled' | 'frontier' | 'remote' | 'deepWild';

export const HOSTILE_LEANING: readonly ActorKind[] = ['beast', 'undead', 'brigand', 'goblinoid', 'raider', 'fiend', 'elemental', 'fey'];
/** Kinds that are sentient — reputation, diplomacy and faith move their mood. Beasts/undead don't care who you are. */
export const SENTIENT_KINDS: readonly ActorKind[] = ['brigand', 'goblinoid', 'raider', 'fiend', 'fey', 'patrol', 'merchant', 'pilgrim', 'hunter', 'refugee', 'traveler'];

// ---------------------------------------------------------------------------
// QUESTION 1 — frequency (λ). Actor-density inputs ONLY.

export interface RateContext {
  biomeName: string;
  habitability: number; // Biome.habitability, ~0..100
  pop: number; // Cell.pop rural population units — civilization suppresses hostiles
  road: RoadTier; // plan.routeGroup mapped
  hourOfDay: number; // 0..23, real clock at this waypoint
  isWinter: boolean;
  storm: boolean; // active severe weather suppresses everyone
  nearestBurgMi: number; // remoteness
  marker?: { type: string; distanceMi: number }; // nearest hostile marker within radius
  war: { active: boolean; yearsSinceEnd: number | null }; // cell state's war status
  visibility: number; // party visibility, 1 = solo traveller
}

// ---------------------------------------------------------------------------
// QUESTION 2 — hostility (P(hostile|encounter)). Disposition inputs ONLY.

export interface DispositionContext {
  actorKind: ActorKind;
  cultureRep: number; // player reputation with the local culture, -100..100
  religionRep: number; // player reputation with the local religion, -100..100
  alert: number | undefined; // State.alert — garrison/law strength
  diplomacy: DiplomacyRelation; // cell state toward the player's nationality
  sameCulture: boolean; // player culture == cell culture
  sameReligion: boolean; // player religion == cell religion
}

// ---------------------------------------------------------------------------
// Outcome of walking a travel leg.

export interface EncounterActor {
  kind: ActorKind;
  hostile: boolean;
  /** the roster statblock this actor fights as — always present, so the player
   *  can choose to attack even a peaceful actor */
  statblockId: string;
  /** short descriptor for the log/modal */
  descriptor: string;
}

export interface TravelEncounter {
  /** 0..1 fraction of the leg completed before the encounter */
  atFraction: number;
  /** minutes of travel elapsed up to the interception point */
  elapsedMinutes: number;
  /** interception position */
  x: number;
  y: number;
  cellId: number;
  actor: EncounterActor;
  /** the rate that fired and the resolved hostility, for the danger log */
  lambda: number;
  hostileChance: number;
  date: GameDate;
}

export type EncounterOutcome =
  | { kind: 'clear' } // reached the destination with nothing on the road
  | { kind: 'encounter'; encounter: TravelEncounter };
