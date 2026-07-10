/** Combat stats for the starting weapons issued by src/player/rules2024.ts. */
import type { DamageType } from './types';

export interface WeaponStats {
  id: string;
  name: string;
  damageDice: string;
  damageType: DamageType;
  finesse: boolean; // may use DEX instead of STR
  verb: string; // plain-narration verb
}

export const WEAPON_STATS: Record<string, WeaponStats> = {
  battleaxe: { id: 'battleaxe', name: 'Battleaxe', damageDice: '1d8', damageType: 'slashing', finesse: false, verb: 'hacks' },
  dagger: { id: 'dagger', name: 'Dagger', damageDice: '1d4', damageType: 'piercing', finesse: true, verb: 'stabs' },
  mace: { id: 'mace', name: 'Mace', damageDice: '1d6', damageType: 'bludgeoning', finesse: false, verb: 'batters' },
  quarterstaff: { id: 'quarterstaff', name: 'Quarterstaff', damageDice: '1d6', damageType: 'bludgeoning', finesse: false, verb: 'cracks' },
  longsword: { id: 'longsword', name: 'Longsword', damageDice: '1d8', damageType: 'slashing', finesse: false, verb: 'cuts' },
  spear: { id: 'spear', name: 'Spear', damageDice: '1d6', damageType: 'piercing', finesse: false, verb: 'drives' },
  shortsword: { id: 'shortsword', name: 'Shortsword', damageDice: '1d6', damageType: 'piercing', finesse: true, verb: 'thrusts' },
  rapier: { id: 'rapier', name: 'Rapier', damageDice: '1d8', damageType: 'piercing', finesse: true, verb: 'pierces' },
  unarmed: { id: 'unarmed', name: 'Unarmed strike', damageDice: '1d6', damageType: 'bludgeoning', finesse: true, verb: 'strikes' },
};

export function weaponStats(id: string): WeaponStats {
  return WEAPON_STATS[id] ?? WEAPON_STATS.unarmed;
}
