import type { Burg, Cell, Religion, State } from '../data/types';
import type { WorldData } from '../data/worldLoader';
import { getBackstory } from './backgrounds';
import type { BackstoryId, PlayerLocation, SpawnPreference } from './types';

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

function nearestBurg(cell: Cell, burgs: Burg[], distanceScale: number): { burg: Burg; distanceMi: number } | null {
  let best: Burg | null = null;
  let bestD = Infinity;
  for (const burg of burgs) {
    const dx = burg.x - cell.p[0];
    const dy = burg.y - cell.p[1];
    const d = dx * dx + dy * dy;
    if (d < bestD) {
      best = burg;
      bestD = d;
    }
  }
  return best ? { burg: best, distanceMi: Math.sqrt(bestD) * distanceScale } : null;
}

function isBorderCell(cell: Cell, cells: Cell[], stateId: number): boolean {
  return cell.c.some((n) => {
    const other = cells[n];
    return other && other.h >= 20 && other.state > 0 && other.state !== stateId;
  });
}

function scoreCandidate(
  cell: Cell,
  world: SpawnWorld,
  stateBurgs: Burg[],
  religion: Religion | undefined,
  preference: SpawnPreference,
): number {
  if (cell.h < 20) return -Infinity;
  const near = nearestBurg(cell, stateBurgs, world.geometry.distanceScale);
  const distanceToBurg = near?.distanceMi ?? 999;
  const hasBurg = cell.burg > 0;
  const lowPopulation = cell.pop <= 1 ? 20 : cell.pop <= 4 ? 8 : -8;
  const coast = cell.t === 1 ? 35 : cell.t === 2 ? 18 : 0;
  const border = isBorderCell(cell, world.geometry.cells, cell.state) ? 32 : 0;
  const noTown = hasBurg ? -25 : 10;

  switch (preference) {
    case 'coast':
      return coast + noTown + Math.max(0, 35 - Math.abs(distanceToBurg - 18));
    case 'border':
      return border + noTown + lowPopulation;
    case 'faith-center': {
      if (!religion) return noTown + lowPopulation;
      const center = world.geometry.cells[religion.center];
      if (!center) return noTown + lowPopulation;
      const d = Math.hypot(center.p[0] - cell.p[0], center.p[1] - cell.p[1]);
      return Math.max(0, 120 - d) + noTown + (distanceToBurg < 40 ? 12 : 0);
    }
    case 'remote':
      return lowPopulation + noTown + Math.min(distanceToBurg, 120);
    case 'settlement-edge':
      return noTown + Math.max(0, 45 - Math.abs(distanceToBurg - 12)) + (near?.burg.capital ? 8 : 0);
    case 'wilderness':
      return lowPopulation + noTown + Math.max(0, Math.min(distanceToBurg, 80));
    default:
      return lowPopulation + noTown;
  }
}

export function chooseStartingLocation(
  wd: WorldData | SpawnWorld,
  stateId: number,
  religionId: number,
  backstoryId: BackstoryId,
  characterName = 'player',
): PlayerLocation {
  const state = wd.stateById.get(stateId) ?? wd.world.states.find((s) => s.i > 0);
  if (!state) throw new Error('No nation is available for player start.');

  const religion = wd.religionById.get(religionId);
  const story = getBackstory(backstoryId);
  const cells = wd.geometry.cells.filter((c) => c.h >= 20 && c.state === state.i);
  const fallbackCells = wd.geometry.cells.filter((c) => c.h >= 20);
  const stateBurgs = wd.world.burgs.filter((b) => b.state === state.i);
  const pool = cells.length > 0 ? cells : fallbackCells;
  if (pool.length === 0) throw new Error('No land cells are available for player start.');

  const seed = hashText(`${state.i}|${religionId}|${backstoryId}|${characterName}`);
  const ranked = pool
    .map((cell) => ({
      cell,
      score: scoreCandidate(cell, wd, stateBurgs, religion, story.spawnPreference),
      tie: hashText(`${seed}|${cell.i}`),
    }))
    .sort((a, b) => b.score - a.score || a.tie - b.tie);

  const chosen = ranked[0].cell;
  const near = nearestBurg(chosen, stateBurgs, wd.geometry.distanceScale);
  const biome = wd.geometry.biomes[chosen.biome]?.name ?? 'wilderness';
  const placeName = near && near.distanceMi < 30 ? `${Math.round(near.distanceMi)} mi from ${near.burg.name}` : biome;

  return {
    cellId: chosen.i,
    x: chosen.p[0],
    y: chosen.p[1],
    stateId: state.i,
    stateName: state.fullName ?? state.name,
    placeName,
    reason: `${story.title}: ${story.spawnPreference.replace('-', ' ')} start in ${state.fullName ?? state.name}.`,
  };
}
