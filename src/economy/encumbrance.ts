/**
 * Carry weight and its effect on travel. A character's carry capacity follows
 * the D&D rule of 15 × Strength (pounds) as a hard cap — nothing may be bought
 * or picked up past it. There are no graduated-encumbrance tiers; instead a
 * heavier pack slows overland travel continuously (see travelSpeedFactor).
 * Coins (vosels) are weightless.
 */
import { weightOf } from './catalog';
import type { PlayerCharacter } from '../player/types';

/** Pounds a character can carry: 15 × Strength. */
export function carryCapacity(player: PlayerCharacter): number {
  return 15 * player.abilityScores.str;
}

/** Total weight (lb) the character is carrying. Coins add nothing. */
export function carriedWeight(player: PlayerCharacter): number {
  return player.inventory.reduce((sum, item) => sum + weightOf(item.id) * item.quantity, 0);
}

export function remainingCapacity(player: PlayerCharacter): number {
  return carryCapacity(player) - carriedWeight(player);
}

/** Would acquiring `qty` of `id` push the character over the hard cap? */
export function wouldExceedCapacity(player: PlayerCharacter, id: string, qty = 1): boolean {
  return carriedWeight(player) + weightOf(id) * qty > carryCapacity(player);
}

/** Fraction of capacity in use, clamped to [0, 1]. */
export function loadRatio(player: PlayerCharacter): number {
  const cap = carryCapacity(player);
  if (cap <= 0) return 1;
  return Math.min(1, Math.max(0, carriedWeight(player) / cap));
}

// A comfortable half-load has no effect; beyond it, walking speed falls off
// linearly toward FLOOR at the cap.
const COMFORT_THRESHOLD = 0.5;
const SPEED_FLOOR = 0.6;

/**
 * Continuous walking-speed multiplier from how full the pack is (1.0 when
 * light, down to SPEED_FLOOR at the carry cap). Used to slow overland travel.
 */
export function travelSpeedFactor(player: PlayerCharacter): number {
  const load = loadRatio(player);
  if (load <= COMFORT_THRESHOLD) return 1;
  const over = (load - COMFORT_THRESHOLD) / (1 - COMFORT_THRESHOLD); // 0..1
  return 1 - over * (1 - SPEED_FLOOR);
}
