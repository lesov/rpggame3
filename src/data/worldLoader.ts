/**
 * Loads the preprocessed artifacts and builds the runtime indexes the app
 * uses: id maps, the spatial cell index, climate accessors, the scripted
 * event stream, and the ambient-event context.
 */
import type { Geometry, World, WarsFile, Burg, State, Province, Culture, Religion, Cell } from './types';
import { CellIndex } from '../map/hittest';
import type { CellClimate } from '../sim/weather';
import { buildScriptedEvents, type WorldEvent, type TimelineEntry } from '../sim/events';
import type { AmbientContext } from '../sim/ambient';
import { withPersonalityTraits } from './personality';
import timelineJson from '../../data/events.timeline.json';

export interface WorldData {
  geometry: Geometry;
  world: World;
  wars: WarsFile['wars'];
  cellIndex: CellIndex;
  burgById: Map<number, Burg>;
  stateById: Map<number, State>;
  provinceById: Map<number, Province>;
  cultureById: Map<number, Culture>;
  religionById: Map<number, Religion>;
  scriptedEvents: WorldEvent[];
  ambientCtx: AmbientContext;
  latOf: (y: number) => number;
  lonOf: (x: number) => number;
  climateOf: (cellId: number) => CellClimate;
  /** Distance between two map points in the map's unit (miles). */
  distanceMi: (x1: number, y1: number, x2: number, y2: number) => number;
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to load ${url}: ${res.status}. Run \`npm run preprocess\` first.`);
  return res.json() as Promise<T>;
}

export function buildWorldData(geometry: Geometry, world: World, warsFile: WarsFile): WorldData {
  const { mapCoordinates: mc, width, height, distanceScale } = geometry;
  const worldWithPeople: World = {
    ...world,
    people: world.people.map(withPersonalityTraits),
  };

  const latOf = (y: number) => mc.latN - (y / height) * mc.latT;
  const lonOf = (x: number) => mc.lonW + (x / width) * mc.lonT;

  const cells = geometry.cells;
  const cellIndex = new CellIndex(cells, 32, width, height);

  const burgById = new Map(worldWithPeople.burgs.map((b) => [b.i, b]));
  const stateById = new Map(worldWithPeople.states.map((s) => [s.i, s]));
  const provinceById = new Map(worldWithPeople.provinces.map((p) => [p.i, p]));
  const cultureById = new Map(worldWithPeople.cultures.map((c) => [c.i, c]));
  const religionById = new Map(worldWithPeople.religions.map((r) => [r.i, r]));

  const climateOf = (cellId: number): CellClimate => {
    const c = cells[cellId];
    return {
      id: c.i,
      temp: c.temp,
      prec: c.prec,
      lat: latOf(c.p[1]),
      coastRank: c.t,
      isWater: c.h < 20,
    };
  };

  const stateName = (id: number) => stateById.get(id)?.name ?? `State ${id}`;
  const scriptedEvents = buildScriptedEvents(timelineJson.events as TimelineEntry[], warsFile.wars, stateName);

  // Ambient context: sizable settlements for weather/rumors; a burg for each
  // faith's center cell (for festivals).
  const ambientBurgs = worldWithPeople.burgs
    .filter((b) => b.population >= 5000 || b.portal)
    .map((b) => ({
      i: b.i,
      name: b.name,
      cell: b.cell,
      population: b.population,
      hasPortal: !!b.portal,
    }));

  const nearestBurgToCell = (cellId: number): number | undefined => {
    const c = cells[cellId];
    if (!c) return undefined;
    if (c.burg) return c.burg;
    let best: number | undefined;
    let bestD = Infinity;
    for (const b of worldWithPeople.burgs) {
      const dx = b.x - c.p[0];
      const dy = b.y - c.p[1];
      const d = dx * dx + dy * dy;
      if (d < bestD) {
        bestD = d;
        best = b.i;
      }
    }
    return best;
  };

  const ambientCtx: AmbientContext = {
    burgs: ambientBurgs,
    markers: worldWithPeople.markers.map((m) => ({
      i: m.i,
      type: m.type,
      icon: m.icon,
      cell: m.cell,
      name: m.name,
      legend: m.legend,
    })),
    religions: worldWithPeople.religions
      .filter((r) => r.i > 0)
      .map((r) => ({
        i: r.i,
        name: r.name,
        type: r.type,
        deity: r.deity,
        centerBurg: nearestBurgToCell(r.center),
      })),
    climateOf,
  };

  return {
    geometry,
    world: worldWithPeople,
    wars: warsFile.wars,
    cellIndex,
    burgById,
    stateById,
    provinceById,
    cultureById,
    religionById,
    scriptedEvents,
    ambientCtx,
    latOf,
    lonOf,
    climateOf,
    distanceMi: (x1, y1, x2, y2) => Math.hypot(x2 - x1, y2 - y1) * distanceScale,
  };
}

export async function loadWorld(): Promise<WorldData> {
  const [geometry, world, wars] = await Promise.all([
    fetchJson<Geometry>('data/geometry.json'),
    fetchJson<World>('data/world.json'),
    fetchJson<WarsFile>('data/events.wars.json'),
  ]);
  return buildWorldData(geometry, world, wars);
}

/** Land elevation in feet from an Azgaar height value (>= 20 is land). */
export function elevationFt(h: number, exponent: number): number {
  if (h < 20) return 0;
  const meters = Math.pow(h - 18, exponent);
  return Math.round(meters * 3.281);
}

/** Approximate water depth in feet for water cells. */
export function depthFt(h: number): number {
  return Math.round((20 - h) * 50 * 3.281);
}

export function formatLatLon(lat: number, lon: number): string {
  const ns = lat >= 0 ? 'N' : 'S';
  const ew = lon >= 0 ? 'E' : 'W';
  return `${Math.abs(lat).toFixed(1)}°${ns} ${Math.abs(lon).toFixed(1)}°${ew}`;
}

export function isWaterCell(c: Cell): boolean {
  return c.h < 20;
}
