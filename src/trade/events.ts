/**
 * History coupling (framework §6/§7.3). Prices react to the world's story on two
 * timescales:
 *   1. Wars — reuses the existing `wd.wars` timeline. A belligerent state runs a
 *      war economy: iron & grain dearer, luxuries depressed. The effect decays
 *      after peace with a short half-life.
 *   2. Anchors — a small campaign-bible table (a couple of dated events) that
 *      proves the mechanism; the full table lands with the caravan milestone.
 * The modifier set is rebuilt per simulated year (wars/anchors move at year
 * granularity), then queried per burg + good during a weekly tick.
 */
import type { WorldData } from '../data/worldLoader';
import type { Good } from './goods';

const WAR_HALFLIFE_YEARS = 1.5;
const WAR_TAIL_YEARS = 4;
const WAR_STAPLE_SURGE = 0.6; // iron/grain price at full-intensity war: ×1.6
const WAR_LUXURY_SLUMP = 0.4; // luxuries at full-intensity war: ×0.6

export interface EconMods {
  year: number;
  /** Multiplier on a good's price at a burg in the given state. */
  priceMultFor(stateId: number, good: Good): number;
  /** Multiplier on a good's production/supply for a given culture. */
  supplyMultFor(cultureName: string, good: Good): number;
}

/** States currently in (or recently emerging from) war, with 0..1 intensity. */
function warIntensityByState(wd: WorldData, year: number): Map<number, number> {
  const out = new Map<number, number>();
  for (const w of wd.wars) {
    if (w.start > year) continue;
    const ended = w.end != null && w.end < year;
    let intensity: number;
    if (!ended) {
      intensity = 1;
    } else {
      const since = year - (w.end as number);
      if (since > WAR_TAIL_YEARS) continue;
      intensity = Math.pow(0.5, since / WAR_HALFLIFE_YEARS);
    }
    for (const s of [w.attacker, w.defender]) {
      if (s > 0) out.set(s, Math.max(out.get(s) ?? 0, intensity));
    }
  }
  return out;
}

/** Anchor price effects (campaign bible). Returns a multiplier for `year`. */
function anchorPriceMult(good: Good, year: number): number {
  // 1258 sack of Zinulb floods the market with looted relics for ~5 years.
  if (good.id === 'relics' && year >= 1258 && year <= 1263) return 0.4;
  return 1;
}

/** Anchor supply effects (campaign bible). Returns a multiplier for `year`. */
function anchorSupplyMult(good: Good, year: number): number {
  // 1234 fall of Mathathremo severs the dwarf-steel seams — permanent collapse.
  if (good.id === 'dwarfsteel' && year >= 1234) return 0.05;
  return 1;
}

export function economicModifiers(wd: WorldData, year: number): EconMods {
  const warByState = warIntensityByState(wd, year);
  return {
    year,
    priceMultFor(stateId: number, good: Good): number {
      let mult = anchorPriceMult(good, year);
      const w = warByState.get(stateId) ?? 0;
      if (w > 0) {
        if (good.id === 'iron' || good.id === 'grain') mult *= 1 + WAR_STAPLE_SURGE * w;
        if (good.tier === 'luxury') mult *= 1 - WAR_LUXURY_SLUMP * w;
      }
      return mult;
    },
    supplyMultFor(_cultureName: string, good: Good): number {
      return anchorSupplyMult(good, year);
    },
  };
}
