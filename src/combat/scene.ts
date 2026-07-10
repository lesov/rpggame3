/**
 * Builds the structured scene sheet the combat log header and the narrator
 * both consume: place, terrain, weather, season, time of day, light.
 */
import type { WorldData } from '../data/worldLoader';
import { inspectPlace, findNearby } from '../data/inspect';
import { weatherAt } from '../sim/weather';
import { season, toOrdinal, type GameDate, type GameTime } from '../sim/calendar';
import { hash } from '../sim/rng';
import type { CombatScene } from './types';

const TIME_SLOTS: { name: string; light: CombatScene['light'] }[] = [
  { name: 'the dead of night', light: 'dark' },
  { name: 'the last black hour before dawn', light: 'dark' },
  { name: 'grey dawn', light: 'dim' },
  { name: 'early morning', light: 'bright' },
  { name: 'mid-morning', light: 'bright' },
  { name: 'midday', light: 'bright' },
  { name: 'mid-afternoon', light: 'bright' },
  { name: 'the long light of late afternoon', light: 'bright' },
  { name: 'dusk', light: 'dim' },
  { name: 'full dark, early evening', light: 'dark' },
];

/** Deterministic time-of-day for an encounter at (cell, date). */
export function timeOfDayFor(cellId: number, ord: number): { name: string; light: CombatScene['light'] } {
  return TIME_SLOTS[hash(cellId, ord, 0x71e0) % TIME_SLOTS.length];
}

export function timeOfDayAtClock(time: GameTime): { name: string; light: CombatScene['light'] } {
  const h = time.hour;
  if (h < 4) return { name: 'the dead of night', light: 'dark' };
  if (h < 6) return { name: 'the last black hour before dawn', light: 'dark' };
  if (h < 7) return { name: 'grey dawn', light: 'dim' };
  if (h < 10) return { name: 'early morning', light: 'bright' };
  if (h < 12) return { name: 'mid-morning', light: 'bright' };
  if (h < 14) return { name: 'midday', light: 'bright' };
  if (h < 17) return { name: 'mid-afternoon', light: 'bright' };
  if (h < 19) return { name: 'the long light of late afternoon', light: 'bright' };
  if (h < 20) return { name: 'dusk', light: 'dim' };
  return { name: 'full dark, early evening', light: 'dark' };
}

export function buildScene(wd: WorldData, cellId: number, x: number, y: number, date: GameDate, time?: GameTime): CombatScene {
  const info = inspectPlace(wd, cellId);
  const climate = wd.climateOf(cellId);
  const weather = weatherAt(climate, date);
  const ord = toOrdinal(date);
  const tod = time ? timeOfDayAtClock(time) : timeOfDayFor(cellId, ord);
  const seasonName = season(date, info.lat);

  const terrainNotes: string[] = [];
  if (info.relief) terrainNotes.push(`${info.relief.name} (${info.relief.type.replaceAll('_', ' ')})`);
  if (info.region) terrainNotes.push(`${info.region.name} (${info.region.type.replaceAll('_', ' ')})`);
  if (info.river) terrainNotes.push(`the ${info.river.name} runs nearby`);
  if (info.coastal) terrainNotes.push('within sight of the coast');
  const nearby = findNearby(wd, x, y, 40, 3);
  for (const n of nearby) {
    if (n.kind === 'burg') terrainNotes.push(`${Math.round(n.distanceMi)} mi from ${n.name}`);
  }

  const placeName =
    info.relief?.name ?? info.region?.name ?? (info.landmass ? `the wilds of ${info.landmass.name}` : info.biomeName);

  // Full dark: overcast or storm smothers what light there is.
  let light = tod.light;
  if (light === 'bright' && (weather.condition === 'Overcast' || weather.precipitating)) light = 'dim';

  return {
    placeName,
    biome: info.biomeName,
    terrainNotes: terrainNotes.slice(0, 4),
    stateName: info.state?.fullName ?? info.state?.name,
    weather,
    season: seasonName,
    timeOfDay: tod.name,
    light,
    date,
    isWinter: seasonName === 'Winter',
  };
}
