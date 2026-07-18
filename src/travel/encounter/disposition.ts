/**
 * Question 2 — P(hostile | encounter). Inputs are disposition only: the
 * function takes a DispositionContext, which by construction cannot carry
 * biome/pop/road/time, so a dense biome can never make merchants hate you.
 *
 * Beasts and undead don't care who you are — for them hostility is near-fixed.
 * Sentient actors read reputation, state law, diplomacy, and shared faith.
 */
import type { ActorKind, DispositionContext, DiplomacyRelation } from './types';
import { SENTIENT_KINDS } from './types';

/** Baseline hostility of each actor kind before disposition shifts. */
const BASE_HOSTILITY: Record<ActorKind, number> = {
  beast: 0.9,
  undead: 1.0,
  brigand: 0.85,
  goblinoid: 0.9,
  raider: 0.95,
  fiend: 0.9,
  elemental: 0.95,
  fey: 0.45,
  patrol: 0.15,
  merchant: 0.05,
  pilgrim: 0.05,
  hunter: 0.1,
  refugee: 0.1,
  traveler: 0.12,
};

const DIPLOMACY_SHIFT: Record<DiplomacyRelation, number> = {
  Enemy: 0.5,
  Rival: 0.25,
  Suspicion: 0.15,
  Unknown: 0.05,
  Neutral: 0,
  Friendly: -0.15,
  Ally: -0.25,
  Vassal: -0.1,
  Suzerain: -0.1,
  Self: -0.2,
};

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

function isSentient(kind: ActorKind): boolean {
  return SENTIENT_KINDS.includes(kind);
}

export function hostileChance(ctx: DispositionContext): number {
  const base = BASE_HOSTILITY[ctx.actorKind];
  // Mindless / feral actors are hostile regardless of who you are.
  if (!isSentient(ctx.actorKind)) return clamp01(base);

  let p = base;

  // Reputation: the most hostile local faction governs. Low reputation raises
  // hostility, high reputation lowers it (and can turn a patrol friendly).
  const worstRep = Math.min(ctx.cultureRep, ctx.religionRep);
  p += (-worstRep / 100) * 0.5;

  // Diplomacy of the cell's state toward the player's nationality.
  p += DIPLOMACY_SHIFT[ctx.diplomacy] ?? 0;

  // State law: a weak garrison means predators replace patrols.
  if (ctx.alert === undefined || ctx.alert < 1) p += 0.15;
  else if (ctx.alert >= 2) p -= 0.1;

  // Shared faith / culture eases things; being a stranger on both counts hardens them.
  if (ctx.sameReligion) p -= 0.15;
  if (ctx.sameCulture) p -= 0.1;
  if (!ctx.sameReligion && !ctx.sameCulture) p += 0.1;

  return clamp01(p);
}

/** Sample hostility deterministically from a supplied uniform. */
export function resolveHostile(ctx: DispositionContext, roll: number): boolean {
  return roll < hostileChance(ctx);
}
