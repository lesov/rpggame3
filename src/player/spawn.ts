import type { Burg, Cell, Religion, State } from '../data/types';
import type { WorldData } from '../data/worldLoader';
import type { PlayerLocation } from './types';

export interface SpawnWorld {
  geometry: {
    cells: Cell[];
    biomes: { i: number; name: string }[];
    distanceScale: number;
  };
  world: {
    states: State[];
    burgs: Burg[];
    religions: Religion[];
  };
  stateById: Map<number, State>;
  religionById: Map<number, Religion>;
}

function hashText(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * The Duhi Troupe casts every washout into a city. The start is a non-capital
 * settlement in the character's nation (deterministic per character), whose
 * name is referenced in the shared biography. Larger towns are preferred, with
 * a seeded pick among the top few so different characters land in different
 * cities. Falls back to any non-capital burg, then any burg, then a land cell.
 */
export function chooseStartingLocation(
  wd: WorldData | SpawnWorld,
  stateId: number,
  religionId: number,
  characterName = 'player',
): PlayerLocation {
  const state = wd.stateById.get(stateId) ?? wd.world.states.find((s) => s.i > 0);
  if (!state) throw new Error('No nation is available for player start.');

  const seed = hashText(`${state.i}|${religionId}|${characterName}`);
  const inNation = wd.world.burgs.filter((b) => b.state === state.i && !b.capital);
  const anyNonCapital = wd.world.burgs.filter((b) => !b.capital);
  const anyBurg = wd.world.burgs;
  const pool = inNation.length > 0 ? inNation : anyNonCapital.length > 0 ? anyNonCapital : anyBurg;

  if (pool.length > 0) {
    const ranked = pool
      .map((b) => ({ burg: b, score: b.population ?? 0, tie: hashText(`${seed}|${b.i}`) }))
      .sort((a, b) => b.score - a.score || a.tie - b.tie);
    const top = ranked.slice(0, Math.min(ranked.length, 8));
    const chosen = top[seed % top.length].burg;
    const burgState = wd.stateById.get(chosen.state) ?? state;
    return {
      cellId: chosen.cell,
      x: chosen.x,
      y: chosen.y,
      stateId: burgState.i,
      stateName: burgState.fullName ?? burgState.name,
      placeName: chosen.name,
      reason: `Cast out by the Duhi Troupe into the streets of ${chosen.name}, ${burgState.fullName ?? burgState.name}.`,
    };
  }

  // No settlements at all — drop onto any land cell in the nation.
  const landCell =
    wd.geometry.cells.find((c) => c.h >= 20 && c.state === state.i) ?? wd.geometry.cells.find((c) => c.h >= 20);
  if (!landCell) throw new Error('No land cells are available for player start.');
  const biome = wd.geometry.biomes[landCell.biome]?.name ?? 'wilderness';
  return {
    cellId: landCell.i,
    x: landCell.p[0],
    y: landCell.p[1],
    stateId: state.i,
    stateName: state.fullName ?? state.name,
    placeName: biome,
    reason: `Cast out by the Duhi Troupe into ${state.fullName ?? state.name}.`,
  };
}
