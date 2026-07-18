import type { Ability } from '../player/types';
import type { GameDate } from '../sim/calendar';
import type { Weather } from '../sim/weather';
import type { RollBreakdown } from './dice';

export type DamageType =
  | 'slashing' | 'piercing' | 'bludgeoning'
  | 'fire' | 'cold' | 'poison' | 'radiant' | 'psychic' | 'necrotic' | 'force';

export type ExhaustionTier = 'fresh' | 'winded' | 'exhausted' | 'desperate';

export type InjurySeverity = 'graze' | 'wound' | 'deep wound' | 'grievous wound';

export interface Injury {
  location: string;
  severity: InjurySeverity;
  round: number;
  source: string; // attack name that caused it
  damageType: DamageType;
  healed?: boolean;
}

export interface CombatantAttack {
  id: string;
  name: string; // "Longsword", "Bite", "Fire Bolt"
  verb: string; // plain-narration verb: "slashes", "bites", "scorches"
  kind: 'melee' | 'ranged' | 'spell';
  toHit?: number; // absent for save-based attacks
  save?: { ability: Ability; dc: number }; // save-based cantrips
  damageDice: string; // "1d8"
  damageBonus: number;
  damageType: DamageType;
  /** attaches a rider condition on damage (e.g. Vicious Mockery) */
  rider?: 'mockery-disadvantage';
}

export type MoraleProfile = 'fearless' | 'steadfast' | 'wild' | 'craven';

export interface CombatantConditions {
  dodging?: boolean;
  raging?: boolean;
  feintAdvantage?: boolean; // rogue feint: next attack has advantage
  mockeryDisadvantage?: boolean; // disadvantage on next attack roll
}

/** A single carried healing potion: its inventory id and heal dice. */
export interface PotionCharge {
  id: string;
  heal: string; // e.g. '2d4+2'
}

export interface CombatantResources {
  potions: number;
  /** Carried healing potions, strongest first; drinking pops the front. */
  potionStack?: PotionCharge[];
  secondWind?: number;
  rage?: number;
  feintAvailable?: boolean; // per-battle rogue feint is per-turn bonus action, tracked in turn
  healSpells?: number; // cure-wounds style castings
  layOnHands?: number; // HP pool
  martialArts?: boolean; // monk bonus unarmed strike per turn
}

export interface Combatant {
  id: 'player' | 'enemy';
  name: string;
  shortName: string; // "the wolf", "you"
  isPlayer: boolean;
  species: string;
  descriptor: string; // one-line description for the narrator
  maxHp: number;
  hp: number;
  ac: number;
  speed: number;
  initiativeBonus: number;
  proficiency: number;
  abilityMods: Record<Ability, number>;
  attacks: CombatantAttack[];
  escapeBonus: number; // opposed-check modifier when fleeing or chasing
  bodyParts: [string, number][]; // weighted hit locations
  morale: MoraleProfile;
  barks?: { taunt: string[]; pain: string[]; panic: string[] };
  injuries: Injury[];
  conditions: CombatantConditions;
  resources: CombatantResources;
}

export interface CombatScene {
  placeName: string;
  biome: string;
  terrainNotes: string[]; // named relief/region/river/nearby flavor
  stateName?: string;
  weather: Weather;
  season: string;
  timeOfDay: string; // "dead of night", "grey dawn", …
  light: 'bright' | 'dim' | 'dark';
  date: GameDate;
  isWinter: boolean;
}

// ---------------------------------------------------------------------------
// Events — everything the log and the narrator consume, in order.

export type CombatEvent =
  | { kind: 'intro'; seq: number }
  | { kind: 'initiative'; seq: number; rolls: { name: string; breakdown: RollBreakdown }[]; firstName: string }
  | { kind: 'round'; seq: number; round: number }
  | {
      kind: 'attack';
      seq: number;
      attacker: string;
      defender: string;
      attackName: string;
      attackVerb: string;
      roll: RollBreakdown;
      outcome: 'miss' | 'hit' | 'crit' | 'fumble';
      free?: boolean; // opportunity attack after failed escape
    }
  | {
      kind: 'save';
      seq: number;
      attacker: string;
      defender: string;
      attackName: string;
      roll: RollBreakdown;
      dc: number;
      success: boolean;
    }
  | {
      kind: 'damage';
      seq: number;
      attacker: string;
      defender: string;
      attackName: string;
      attackVerb: string;
      roll: RollBreakdown;
      amount: number;
      resisted?: boolean; // barbarian rage halving
      injury?: Injury;
      hpAfter: number;
      hpMax: number;
      dropped: boolean; // target reduced to 0
    }
  | {
      kind: 'heal';
      seq: number;
      actor: string;
      source: string; // "Healing potion", "Cure Wounds", "Second Wind", "Lay on Hands"
      roll?: RollBreakdown;
      amount: number;
      hpAfter: number;
      hpMax: number;
      woundsTended: string[]; // injury locations marked healed
    }
  | { kind: 'feature'; seq: number; actor: string; feature: string; detail?: string; roll?: RollBreakdown; opposedRoll?: RollBreakdown; success?: boolean }
  | { kind: 'dodge'; seq: number; actor: string }
  | {
      kind: 'escape';
      seq: number;
      actor: string;
      chancePct: number;
      actorRoll: RollBreakdown;
      opponentRoll: RollBreakdown;
      success: boolean;
    }
  | { kind: 'morale'; seq: number; actor: string; roll: RollBreakdown; dc: number; fled: boolean }
  | { kind: 'outcome'; seq: number; outcome: CombatOutcome };

export type CombatOutcome = 'victory' | 'defeat' | 'escaped' | 'enemy-fled';

// ---------------------------------------------------------------------------
// Pending roll — the engine pauses here until the player clicks the dice.

export interface PendingRoll {
  id: string;
  label: string; // "Roll initiative", "Attack roll — Longsword"
  formula: string; // display only, e.g. "1d20+5"
  kind:
    | 'initiative'
    | 'attack'
    | 'damage'
    | 'potion'
    | 'heal-spell'
    | 'second-wind'
    | 'feint'
    | 'escape';
  /** context carried through to resolution */
  attackId?: string;
  advantage?: 'advantage' | 'disadvantage';
  critical?: boolean; // damage roll follows a crit
}

export type PlayerActionId =
  | 'attack' // weapon
  | 'cantrip' // class attack cantrip
  | 'potion'
  | 'heal-spell'
  | 'second-wind'
  | 'rage'
  | 'feint'
  | 'martial-arts'
  | 'lay-on-hands'
  | 'dodge'
  | 'escape'
  | 'end-turn';

export interface AvailableAction {
  id: PlayerActionId;
  label: string;
  detail: string; // "1d8+3 slashing", "2 left", "62% chance"
  enabled: boolean;
  disabledReason?: string;
  isBonus: boolean;
}

export interface TurnState {
  actionUsed: boolean;
  bonusUsed: boolean;
}

export type CombatPhase = 'initiative' | 'player-turn' | 'ended';

export interface CombatState {
  seed: number;
  rngCalls: number; // advance-count so the rng stream is reproducible in state form
  scene: CombatScene;
  player: Combatant;
  enemy: Combatant;
  monsterId: string;
  phase: CombatPhase;
  round: number;
  playerFirst: boolean;
  turn: TurnState;
  events: CombatEvent[];
  seq: number;
  pendingRoll: PendingRoll | null;
  outcome: CombatOutcome | null;
}
