import { findNearby, type NearbyItem } from '../data/inspect';
import type { Route } from '../data/types';
import type { WorldData } from '../data/worldLoader';
import { MINUTES_PER_DAY, type GameTime } from '../sim/calendar';
import { travelSpeedFactor } from '../economy/encumbrance';
import type { PlayerCharacter, PlayerLocation } from './types';

export type TravelMode = 'road' | 'offroad' | 'boat';
type TravelDestinationKind = Extract<NearbyItem['kind'], 'burg' | 'marker'>;

export interface TravelDestination {
  id: string;
  name: string;
  detail: string;
  kind: TravelDestinationKind;
  icon?: string;
  x: number;
  y: number;
  cellId: number;
  distanceMi: number;
  landReachable: boolean;
  boatReachable: boolean;
}

export interface TravelPlan {
  destination: TravelDestination;
  mode: TravelMode;
  dayOnly: boolean;
  routeGroup?: 'roads' | 'trails' | 'searoutes';
  roadAvailable: boolean;
  distanceMi: number;
  paceMph: number;
  paceLabel: string;
  paceDetail: string;
  activeTravelLabel: string;
  biomeMultiplier: number;
  travelHours: number;
  elapsedMinutes: number;
  provisionsNeeded: number;
  provisionsAvailable: number;
  insufficientProvisions: boolean;
  /** Passage fee in vosels; set only for boat legs. */
  fareVosels?: number;
  summary: string;
}

export function defaultTravelModeFor(destination: TravelDestination, roadAvailable: boolean): TravelMode {
  if (destination.boatReachable && !destination.landReachable) return 'boat';
  if (destination.landReachable && roadAvailable) return 'road';
  if (destination.landReachable) return 'offroad';
  if (destination.boatReachable) return 'boat';
  return 'offroad';
}

const ROAD_ACCESS_MI = 20;
const ROAD_MPH = 3.2;
const TRAIL_MPH = 2.7;
/** D&D sailing ship: 2 mph, sailing day and night (48 miles per day). */
const SAILING_SHIP_MPH = 2;
const OFFROAD_BASE_MPH = 2.1;
const DAYLIGHT_START = 6;
const DAYLIGHT_END = 18;

export const BOAT_FARE_BASE_VOSELS = 10;
export const BOAT_FARE_VOSELS_PER_MILE = 3;

/** Passage fare on a crewed ship: base price plus a per-mile rate. */
export function boatFareVosels(distanceMi: number): number {
  return BOAT_FARE_BASE_VOSELS + Math.round(BOAT_FARE_VOSELS_PER_MILE * distanceMi);
}

const BIOME_MULTIPLIER: Record<string, number> = {
  Marine: 3,
  'Hot desert': 1.7,
  'Cold desert': 1.55,
  Savanna: 1.15,
  Grassland: 1,
  'Tropical seasonal forest': 1.35,
  'Temperate deciduous forest': 1.25,
  'Tropical rainforest': 1.9,
  'Temperate rainforest': 1.65,
  Taiga: 1.45,
  Tundra: 1.55,
  Glacier: 2.5,
  Wetland: 2.1,
};

function pointDistanceMi(wd: WorldData, x1: number, y1: number, x2: number, y2: number): number {
  return Math.hypot(x2 - x1, y2 - y1) * wd.geometry.distanceScale;
}

function minDistanceToRouteMi(wd: WorldData, route: Route, x: number, y: number): number {
  let best = Infinity;
  for (const [px, py] of route.points) {
    best = Math.min(best, pointDistanceMi(wd, x, y, px, py));
  }
  return best;
}

function landReachable(wd: WorldData, fromCellId: number, toCellId: number): boolean {
  const from = wd.geometry.cells[fromCellId];
  const to = wd.geometry.cells[toCellId];
  if (!from || !to || from.h < 20 || to.h < 20) return false;
  return from.f === to.f;
}

function nearestPort(wd: WorldData, x: number, y: number, maxDistanceMi = 5) {
  let best = null as null | { burgId: number; distanceMi: number };
  for (const burg of wd.world.burgs) {
    if (!burg.port) continue;
    const distanceMi = pointDistanceMi(wd, x, y, burg.x, burg.y);
    if (distanceMi > maxDistanceMi) continue;
    if (!best || distanceMi < best.distanceMi) best = { burgId: burg.i, distanceMi };
  }
  return best;
}

function canTravelByBoat(wd: WorldData, player: PlayerCharacter, item: NearbyItem): boolean {
  if (!item.burg?.port) return false;
  const originPort = nearestPort(wd, player.location.x, player.location.y);
  return Boolean(originPort && originPort.burgId !== item.burg.i);
}

function isPointDestination(item: NearbyItem): item is NearbyItem & { kind: TravelDestinationKind } {
  // Random-encounter markers are not places to travel to — they exist to fuel
  // chance encounters on the road. Every other marker kind stays a destination.
  if (item.kind === 'marker') return item.marker?.type !== 'encounters';
  return item.kind === 'burg';
}

export function roadRouteFor(wd: WorldData, from: { x: number; y: number }, to: { x: number; y: number }) {
  let best: { group: 'roads' | 'trails'; accessMi: number } | null = null;
  for (const route of wd.world.routes) {
    if (route.group !== 'roads' && route.group !== 'trails') continue;
    const fromAccess = minDistanceToRouteMi(wd, route, from.x, from.y);
    const toAccess = minDistanceToRouteMi(wd, route, to.x, to.y);
    if (fromAccess > ROAD_ACCESS_MI || toAccess > ROAD_ACCESS_MI) continue;
    const accessMi = fromAccess + toAccess;
    if (!best || accessMi < best.accessMi || (accessMi === best.accessMi && route.group === 'roads')) {
      best = { group: route.group, accessMi };
    }
  }
  return best;
}

export function offroadBiomeMultiplier(wd: WorldData, from: { x: number; y: number }, to: { x: number; y: number }): number {
  let total = 0;
  let count = 0;
  for (let i = 0; i <= 12; i++) {
    const t = i / 12;
    const x = from.x + (to.x - from.x) * t;
    const y = from.y + (to.y - from.y) * t;
    const cellId = wd.cellIndex.cellAt(x, y);
    if (cellId === null) continue;
    const cell = wd.geometry.cells[cellId];
    const biomeName = wd.geometry.biomes[cell.biome]?.name ?? 'Grassland';
    total += cell.h < 20 ? 3 : BIOME_MULTIPLIER[biomeName] ?? 1.25;
    count++;
  }
  return count > 0 ? Math.round((total / count) * 100) / 100 : 1.25;
}

export function elapsedMinutesForTravel(travelMinutes: number, start: GameTime, dayOnly: boolean): number {
  if (!dayOnly) return Math.ceil(travelMinutes);
  let remaining = Math.ceil(travelMinutes);
  let elapsed = 0;
  let minuteOfDay = start.hour * 60 + start.minute;

  while (remaining > 0) {
    if (minuteOfDay < DAYLIGHT_START * 60) {
      const wait = DAYLIGHT_START * 60 - minuteOfDay;
      elapsed += wait;
      minuteOfDay += wait;
    } else if (minuteOfDay >= DAYLIGHT_END * 60) {
      const wait = MINUTES_PER_DAY - minuteOfDay + DAYLIGHT_START * 60;
      elapsed += wait;
      minuteOfDay = DAYLIGHT_START * 60;
    }
    const available = Math.max(0, DAYLIGHT_END * 60 - minuteOfDay);
    const walked = Math.min(available, remaining);
    remaining -= walked;
    elapsed += walked;
    minuteOfDay = (minuteOfDay + walked) % MINUTES_PER_DAY;
    if (remaining > 0 && walked === available) {
      const wait = MINUTES_PER_DAY - minuteOfDay + DAYLIGHT_START * 60;
      elapsed += wait;
      minuteOfDay = DAYLIGHT_START * 60;
    }
  }
  return elapsed;
}

export function provisionsAvailable(player: PlayerCharacter): number {
  return player.inventory.find((item) => item.id === 'provisions')?.quantity ?? 0;
}

export function provisionsNeeded(elapsedMinutes: number): number {
  return Math.max(1, Math.ceil(elapsedMinutes / MINUTES_PER_DAY));
}

export function travelDestinationLocation(wd: WorldData, destination: TravelDestination, reason: string): PlayerLocation {
  const cell = wd.geometry.cells[destination.cellId];
  const state = cell.state > 0 ? wd.stateById.get(cell.state) : undefined;
  return {
    cellId: destination.cellId,
    x: destination.x,
    y: destination.y,
    stateId: state?.i ?? 0,
    stateName: state?.fullName ?? state?.name ?? 'Unclaimed lands',
    placeName: destination.name,
    reason,
  };
}

function destinationKey(kind: TravelDestinationKind, cellId: number, name: string): string {
  return `${kind}-${cellId}-${name}`;
}

function destinationFromNearby(item: NearbyItem & { kind: TravelDestinationKind }, cellId: number, land: boolean, boat: boolean, index: number): TravelDestination {
  return {
    id: `${item.kind}-${cellId}-${index}`,
    name: item.name,
    detail: boat ? `${item.detail} · port passage` : item.detail,
    kind: item.kind,
    icon: item.icon,
    x: item.x,
    y: item.y,
    cellId,
    distanceMi: item.distanceMi,
    landReachable: land,
    boatReachable: boat,
  };
}

export function nearbyTravelDestinations(wd: WorldData, player: PlayerCharacter, radiusMi = 120, limit = 12): TravelDestination[] {
  const originCellId = player.location.cellId;
  const seen = new Set<string>();
  const out: TravelDestination[] = [];
  const radii = [radiusMi, 180, 260, 400, 650].filter((r, i, arr) => r >= radiusMi && arr.indexOf(r) === i);

  for (const radius of radii) {
    for (const item of findNearby(wd, player.location.x, player.location.y, radius, limit * 5)
    .filter((item) => item.cellId !== undefined && item.distanceMi >= 1)
    .filter(isPointDestination)
    .filter((item) => {
      const cell = wd.geometry.cells[item.cellId!];
      return cell && cell.h >= 20;
    })) {
      const cellId = item.cellId!;
      const land = landReachable(wd, originCellId, cellId);
      const boat = canTravelByBoat(wd, player, item);
      if (!land && !boat) continue;
      const key = destinationKey(item.kind, cellId, item.name);
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(destinationFromNearby(item, cellId, land, boat, out.length));
    }
  }

  // Last resort: fill from closest reachable settlements so the player usually
  // has at least two choices even in sparse regions.
  const burgsByDistance = wd.world.burgs
    .map((burg) => ({
      burg,
      distanceMi: pointDistanceMi(wd, player.location.x, player.location.y, burg.x, burg.y),
    }))
    .sort((a, b) => a.distanceMi - b.distanceMi);

  for (const { burg, distanceMi } of burgsByDistance) {
    if (burg.cell === originCellId) continue;
    const land = landReachable(wd, originCellId, burg.cell);
    if (!land) continue;
    const key = destinationKey('burg', burg.cell, burg.name);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      id: `burg-${burg.cell}-${out.length}`,
      name: burg.name,
      detail: `${burg.tier ?? 'settlement'}${burg.capital ? ', capital' : ''}${burg.port ? ', port' : ''} · pop ${burg.population.toLocaleString()}`,
      kind: 'burg',
      icon: burg.capital ? '👑' : burg.port ? '⚓' : '🏘️',
      x: burg.x,
      y: burg.y,
      cellId: burg.cell,
      distanceMi,
      landReachable: land,
      boatReachable: false,
    });
    if (out.length >= Math.max(2, limit)) break;
  }

  return out.sort((a, b) => a.distanceMi - b.distanceMi).slice(0, limit);
}

/**
 * Sea passage: from a port settlement the player can book passage to any
 * other port on the map. Empty when the player is not at a port.
 */
export function seaPortDestinations(wd: WorldData, player: PlayerCharacter): TravelDestination[] {
  const originPort = nearestPort(wd, player.location.x, player.location.y);
  if (!originPort) return [];
  const originCellId = player.location.cellId;
  return wd.world.burgs
    .filter((burg) => burg.port && burg.i !== originPort.burgId)
    .map((burg) => {
      const distanceMi = pointDistanceMi(wd, player.location.x, player.location.y, burg.x, burg.y);
      return {
        id: `sea-${burg.cell}`,
        name: burg.name,
        detail: `${burg.tier ?? 'settlement'}${burg.capital ? ', capital' : ''}, port · pop ${burg.population.toLocaleString()} · sea passage`,
        kind: 'burg' as const,
        icon: burg.capital ? '👑' : '⚓',
        x: burg.x,
        y: burg.y,
        cellId: burg.cell,
        distanceMi,
        landReachable: landReachable(wd, originCellId, burg.cell),
        boatReachable: true,
      };
    })
    .sort((a, b) => a.distanceMi - b.distanceMi);
}

export function planTravel(
  wd: WorldData,
  player: PlayerCharacter,
  destination: TravelDestination,
  mode: TravelMode,
  dayOnly: boolean,
  startTime: GameTime,
): TravelPlan {
  const from = { x: player.location.x, y: player.location.y };
  const to = { x: destination.x, y: destination.y };
  const route = roadRouteFor(wd, from, to);
  const directDistance = pointDistanceMi(wd, from.x, from.y, to.x, to.y);
  const canUseRoad = Boolean(route);
  const effectiveMode: TravelMode = mode === 'road' && route ? 'road' : mode === 'boat' && destination.boatReachable ? 'boat' : 'offroad';
  const routeMode = effectiveMode === 'road' && route ? route.group : effectiveMode === 'boat' ? 'searoutes' : undefined;
  const biomeMultiplier = effectiveMode === 'offroad' ? offroadBiomeMultiplier(wd, from, to) : 1;
  const distanceMi = effectiveMode === 'road' && route
    ? directDistance * (route.group === 'roads' ? 1.15 : 1.25) + route.accessMi
    : effectiveMode === 'boat'
      ? directDistance * 1.25
    : directDistance;
  // A heavy pack slows you on foot; a crewed boat is unaffected.
  const loadFactor = effectiveMode === 'boat' ? 1 : travelSpeedFactor(player);
  const mph = (effectiveMode === 'road' && route
    ? route.group === 'roads' ? ROAD_MPH : TRAIL_MPH
    : effectiveMode === 'boat'
      ? SAILING_SHIP_MPH
    : OFFROAD_BASE_MPH / biomeMultiplier) * loadFactor;
  const travelDayOnly = effectiveMode === 'boat' ? false : dayOnly;
  const travelHours = distanceMi / mph;
  const elapsedMinutes = elapsedMinutesForTravel(travelHours * 60, startTime, travelDayOnly);
  const needed = provisionsNeeded(elapsedMinutes);
  const available = provisionsAvailable(player);
  const modeLabel = effectiveMode === 'road' && route ? route.group : effectiveMode === 'boat' ? 'by boat' : 'off road';
  const roadLabel = route?.group === 'roads' ? 'Road travel' : 'Trail travel';
  const paceLabel = effectiveMode === 'boat'
    ? 'Crewed boat passage'
    : effectiveMode === 'road' && route
      ? roadLabel
    : 'Off-road walking';
  const loadNote = loadFactor < 0.999 ? `, ${loadFactor.toFixed(2)}x under load` : '';
  const fareVosels = effectiveMode === 'boat' ? boatFareVosels(distanceMi) : undefined;
  const paceDetail = effectiveMode === 'boat'
    ? `${paceLabel}, ${mph.toFixed(1)} mph average; sails day and night; no encounters at sea`
    : effectiveMode === 'road' && route
      ? `${paceLabel}, ${mph.toFixed(1)} mph average${loadNote}`
    : `${paceLabel}, ${mph.toFixed(1)} mph after ${biomeMultiplier.toFixed(2)}x terrain${loadNote}`;
  const activeTravelLabel = effectiveMode === 'boat'
    ? 'sailing hr'
    : effectiveMode === 'road' && route?.group === 'roads'
      ? 'road hr'
    : effectiveMode === 'road'
      ? 'trail hr'
    : 'walking hr';

  return {
    destination,
    mode: effectiveMode,
    dayOnly: travelDayOnly,
    routeGroup: routeMode,
    roadAvailable: canUseRoad,
    distanceMi: Math.round(distanceMi * 10) / 10,
    paceMph: Math.round(mph * 10) / 10,
    paceLabel,
    paceDetail,
    activeTravelLabel,
    biomeMultiplier,
    travelHours: Math.round(travelHours * 10) / 10,
    elapsedMinutes,
    provisionsNeeded: needed,
    provisionsAvailable: available,
    insufficientProvisions: available < needed,
    fareVosels,
    summary:
      `${Math.round(distanceMi)} mi ${modeLabel}; ${Math.ceil(elapsedMinutes / 60)} elapsed hours` +
      (fareVosels !== undefined ? `; fare ${fareVosels} vosels` : ''),
  };
}
