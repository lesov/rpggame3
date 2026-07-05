/**
 * Pure info-gathering for the Inspector: everything the data knows about a
 * clicked point and its closest interesting surroundings.
 */
import type { WorldData } from './worldLoader';
import { elevationFt, depthFt, formatLatLon } from './worldLoader';
import type { Burg, Person, State, Zone, Marker, Regiment, River } from './types';

export interface PlaceInfo {
  cellId: number;
  x: number;
  y: number;
  latLon: string;
  lat: number;
  isWater: boolean;
  /** ocean / lake / island label from the raw map feature */
  terrainKind: string;
  waterBody?: { name: string; type: string };
  landmass?: { name: string; type: string };
  relief?: { name: string; type: string };
  region?: { name: string; type: string };
  biomeName: string;
  biomeColor: string;
  elevationFt: number;
  depthFt: number;
  coastal: boolean;
  river?: River;
  state?: State;
  provinceName?: string;
  cultureName?: string;
  religionName?: string;
  localPopulation: number;
  burg?: Burg;
  zones: Zone[];
}

export function inspectPlace(wd: WorldData, cellId: number): PlaceInfo {
  const c = wd.geometry.cells[cellId];
  const isWater = c.h < 20;
  const idx = wd.world.indexes;
  const key = String(cellId);

  const featureById = new Map(wd.world.namedFeatures.map((f) => [f.id, f]));
  const waterById = new Map(wd.world.waterFeatures.map((f) => [f.id, f]));
  const landmassById = new Map(wd.world.landmasses.map((l) => [l.id, l]));

  const azFeature = wd.geometry.azgaarFeatures.find((f) => f.i === c.f);

  let waterBody: PlaceInfo['waterBody'];
  if (isWater) {
    const bayId = idx.bay[key];
    const seaId = idx.sea[key];
    const wf = (bayId && waterById.get(bayId)) || (seaId && waterById.get(seaId)) || undefined;
    if (wf) waterBody = { name: wf.name, type: wf.type };
    else if (azFeature?.type === 'lake') waterBody = { name: azFeature.name ?? 'Unnamed lake', type: 'lake' };
    else waterBody = { name: 'Open ocean', type: 'ocean' };
  }

  let landmass: PlaceInfo['landmass'];
  if (!isWater) {
    const lmId = idx.landByFeature[String(c.f)];
    const lm = lmId ? landmassById.get(lmId) : undefined;
    if (lm) landmass = { name: lm.name, type: lm.type };
    else if (azFeature?.type === 'island') landmass = { name: azFeature.name ?? 'Small island', type: 'island' };
  }

  const reliefFeature = idx.relief[key] ? featureById.get(idx.relief[key]) : undefined;
  const regionFeature = idx.biomeRegion[key] ? featureById.get(idx.biomeRegion[key]) : undefined;

  const biome = wd.geometry.biomes[c.biome];
  const state = c.state > 0 ? wd.stateById.get(c.state) : undefined;
  const province = c.province > 0 ? wd.provinceById.get(c.province) : undefined;
  const culture = c.culture > 0 ? wd.cultureById.get(c.culture) : undefined;
  const religion = c.religion > 0 ? wd.religionById.get(c.religion) : undefined;
  const river = c.r > 0 ? wd.world.rivers.find((r) => r.i === c.r) : undefined;

  // Burg on this cell, or on a direct neighbor.
  let burg = c.burg > 0 ? wd.burgById.get(c.burg) : undefined;
  if (!burg) {
    for (const n of c.c) {
      const nb = wd.geometry.cells[n];
      if (nb?.burg > 0) {
        burg = wd.burgById.get(nb.burg);
        break;
      }
    }
  }

  const zones = wd.world.zones.filter((z) => z.cells.includes(cellId));
  const lat = wd.latOf(c.p[1]);

  return {
    cellId,
    x: c.p[0],
    y: c.p[1],
    latLon: formatLatLon(lat, wd.lonOf(c.p[0])),
    lat,
    isWater,
    terrainKind: azFeature?.type ?? (isWater ? 'ocean' : 'island'),
    waterBody,
    landmass,
    relief: reliefFeature ? { name: reliefFeature.name, type: reliefFeature.type } : undefined,
    region: regionFeature ? { name: regionFeature.name, type: regionFeature.type } : undefined,
    biomeName: biome?.name ?? 'Unknown',
    biomeColor: biome?.color ?? '#888',
    elevationFt: elevationFt(c.h, wd.geometry.heightExponent),
    depthFt: isWater ? depthFt(c.h) : 0,
    coastal: !isWater && c.t === 1,
    river,
    state,
    provinceName: province?.fullName,
    cultureName: culture?.name,
    religionName: religion?.name,
    localPopulation: Math.round(c.pop * wd.geometry.populationRate),
    burg,
    zones,
  };
}

export type NearbyKind = 'burg' | 'marker' | 'regiment' | 'feature';

export interface NearbyItem {
  kind: NearbyKind;
  name: string;
  detail: string;
  icon?: string;
  distanceMi: number;
  x: number;
  y: number;
  cellId?: number;
  burg?: Burg;
  marker?: Marker;
  regiment?: Regiment;
}

/** Closest interesting things within `radiusMi` of a point, nearest first. */
export function findNearby(wd: WorldData, x: number, y: number, radiusMi = 75, limit = 10): NearbyItem[] {
  const radiusPx = radiusMi / wd.geometry.distanceScale;
  const items: NearbyItem[] = [];

  for (const b of wd.world.burgs) {
    const d = Math.hypot(b.x - x, b.y - y);
    if (d > radiusPx || d < 1) continue;
    items.push({
      kind: 'burg',
      name: b.name,
      detail: `${b.tier ?? 'settlement'}${b.capital ? ', capital' : ''}${b.port ? ', port' : ''} · pop ${b.population.toLocaleString()}`,
      icon: b.capital ? '👑' : b.port ? '⚓' : '🏘️',
      distanceMi: d * wd.geometry.distanceScale,
      x: b.x,
      y: b.y,
      cellId: b.cell,
      burg: b,
    });
  }

  for (const m of wd.world.markers) {
    const d = Math.hypot(m.x - x, m.y - y);
    if (d > radiusPx) continue;
    items.push({
      kind: 'marker',
      name: m.name ?? m.type,
      detail: m.type,
      icon: m.icon,
      distanceMi: d * wd.geometry.distanceScale,
      x: m.x,
      y: m.y,
      cellId: m.cell,
      marker: m,
    });
  }

  for (const r of wd.world.regiments) {
    const d = Math.hypot(r.x - x, r.y - y);
    if (d > radiusPx) continue;
    items.push({
      kind: 'regiment',
      name: r.name,
      detail: `${wd.stateById.get(r.state)?.name ?? 'Unknown'} force, ${r.total.toLocaleString()} strong`,
      icon: '⚔️',
      distanceMi: d * wd.geometry.distanceScale,
      x: r.x,
      y: r.y,
      cellId: r.cell,
      regiment: r,
    });
  }

  // Named geography: nearest cell of each distinct feature within the radius.
  const idx = wd.world.indexes;
  const featureById = new Map(wd.world.namedFeatures.map((f) => [f.id, f]));
  const waterById = new Map(wd.world.waterFeatures.map((f) => [f.id, f]));
  const centerCell = wd.cellIndex.cellAt(x, y);
  const bestByFeature = new Map<string, { d: number; cellId: number }>();
  for (const cellId of wd.cellIndex.cellsInRect(x - radiusPx, y - radiusPx, x + radiusPx, y + radiusPx)) {
    const c = wd.geometry.cells[cellId];
    const d = Math.hypot(c.p[0] - x, c.p[1] - y);
    if (d > radiusPx) continue;
    const key = String(cellId);
    for (const fid of [idx.relief[key], idx.biomeRegion[key], idx.bay[key], idx.sea[key]]) {
      if (!fid) continue;
      const prev = bestByFeature.get(fid);
      if (!prev || d < prev.d) bestByFeature.set(fid, { d, cellId });
    }
  }
  // Skip features the clicked cell itself is already inside (shown in Place).
  const hereKey = centerCell !== null ? String(centerCell) : '';
  const hereFeatures = new Set(
    [idx.relief[hereKey], idx.biomeRegion[hereKey], idx.bay[hereKey], idx.sea[hereKey]].filter(Boolean),
  );
  for (const [fid, { d, cellId }] of bestByFeature) {
    if (hereFeatures.has(fid)) continue;
    const f = featureById.get(fid) ?? waterById.get(fid);
    if (!f) continue;
    const c = wd.geometry.cells[cellId];
    items.push({
      kind: 'feature',
      name: f.name,
      detail: f.type.replaceAll('_', ' '),
      icon: '🗺️',
      distanceMi: d * wd.geometry.distanceScale,
      x: c.p[0],
      y: c.p[1],
      cellId,
    });
  }

  items.sort((a, b) => a.distanceMi - b.distanceMi);
  return items.slice(0, limit);
}

/** People records relevant to a state (ruler, warlord) and faith (head). */
export function peopleFor(wd: WorldData, stateId?: number, religionName?: string): Person[] {
  const out: Person[] = [];
  for (const p of wd.world.people) {
    if (stateId !== undefined && p.stateId === stateId) out.push(p);
    else if (religionName && p.religionName === religionName) out.push(p);
  }
  const order: Record<string, number> = { state_ruler: 0, military_leader: 1, religious_leader: 2 };
  out.sort((a, b) => (order[a.role] ?? 9) - (order[b.role] ?? 9));
  return out;
}

/** Wars a state is fighting as of the given year. */
export function activeWars(wd: WorldData, stateId: number, year: number) {
  return wd.wars.filter(
    (w) =>
      (w.attacker === stateId || w.defender === stateId) &&
      w.start <= year &&
      (w.end === null || w.end === undefined || w.end >= year),
  );
}
