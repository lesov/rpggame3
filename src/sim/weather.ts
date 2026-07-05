/**
 * Local weather simulation. Deterministic per (cell, date): driven by the
 * map's per-cell annual mean temperature (°C) and moisture (prec 0..64),
 * with Earth-like seasonal variation from latitude and continentality.
 */
import { type GameDate, dayOfYear, toOrdinal, DAYS_PER_YEAR } from './calendar';
import { hash, mulberry32 } from './rng';

export interface CellClimate {
  id: number;
  temp: number; // °C annual mean (already altitude-adjusted by the map)
  prec: number; // 0..64 annual moisture
  lat: number; // degrees, +north
  coastRank: number; // pack cell `t`: +1 coast .. higher = deeper inland (water negative)
  isWater: boolean;
}

export type WeatherCondition =
  | 'Clear' | 'Partly cloudy' | 'Overcast' | 'Fog'
  | 'Drizzle' | 'Rain' | 'Heavy rain' | 'Thunderstorm'
  | 'Sleet' | 'Snow' | 'Heavy snow' | 'Blizzard';

export interface Weather {
  tempC: number;
  tempF: number;
  condition: WeatherCondition;
  precipitating: boolean;
  windDirDeg: number;
  windCompass: string;
  windMph: number;
  description: string;
}

/** Prevailing wind bands (Azgaar settings), one per 30° of latitude N->S. */
const DEFAULT_WINDS = [225, 45, 225, 315, 135, 315];

const COMPASS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];

export function compassOf(deg: number): string {
  return COMPASS[Math.round((((deg % 360) + 360) % 360) / 45) % 8];
}

/**
 * Seasonal temperature swing (°C, half peak-to-peak): near zero at the
 * equator, large at high latitudes, amplified inland and damped at coasts.
 */
export function seasonalAmplitude(lat: number, coastRank: number, isWater: boolean): number {
  const latFactor = 1 + Math.abs(lat) * 0.24;
  const inland = isWater ? 0 : Math.min(Math.max(coastRank, 0), 10);
  const continentality = (isWater ? 0.55 : 0.75) + inland * 0.06;
  return latFactor * continentality;
}

/** Smooth seasonal offset for a given day of year. Coldest ~Jan 15 (north). */
export function seasonalOffset(doy: number, lat: number, amplitude: number): number {
  const phase = -Math.cos((2 * Math.PI * (doy - 15)) / DAYS_PER_YEAR);
  return phase * amplitude * (lat >= 0 ? 1 : -1);
}

export function weatherAt(cell: CellClimate, date: GameDate): Weather {
  const ord = toOrdinal(date);
  const rand = mulberry32(hash(cell.id, ord, 0x5eed));
  const doy = dayOfYear(date);

  const amplitude = seasonalAmplitude(cell.lat, cell.coastRank, cell.isWater);
  const seasonal = seasonalOffset(doy, cell.lat, amplitude);
  const noise = (rand() + rand() - 1) * 3.2; // ~triangular, ±3.2 °C
  const tempC = cell.temp + seasonal + noise;

  // Moisture: chance of precipitation grows with the cell's annual prec.
  const wetness = Math.min(cell.prec / 64, 1);
  const precipChance = 0.04 + wetness * 0.72;
  const precipitating = rand() < precipChance;
  const intensity = rand(); // how hard, if precipitating
  const cloudRoll = rand();

  let condition: WeatherCondition;
  if (precipitating) {
    if (tempC <= 0) {
      condition = intensity > 0.92 ? 'Blizzard' : intensity > 0.6 ? 'Heavy snow' : 'Snow';
    } else if (tempC < 3) {
      condition = 'Sleet';
    } else if (intensity > 0.9 && tempC > 16) {
      condition = 'Thunderstorm';
    } else if (intensity > 0.65) {
      condition = 'Heavy rain';
    } else if (intensity < 0.25) {
      condition = 'Drizzle';
    } else {
      condition = 'Rain';
    }
  } else if (
    cloudRoll < 0.06 &&
    !cell.isWater &&
    cell.coastRank <= 2 &&
    wetness > 0.25 &&
    Math.abs(tempC - cell.temp) < amplitude * 0.5
  ) {
    condition = 'Fog';
  } else {
    condition =
      cloudRoll < 0.45 - wetness * 0.25 ? 'Clear'
      : cloudRoll < 0.85 - wetness * 0.15 ? 'Partly cloudy'
      : 'Overcast';
  }

  // Wind: prevailing band by latitude (6 bands of 30°, N to S) + jitter.
  const band = Math.min(Math.max(Math.floor((90 - cell.lat) / 30), 0), 5);
  const windDirDeg = (DEFAULT_WINDS[band] + (rand() - 0.5) * 70 + 360) % 360;
  const stormy = condition === 'Blizzard' || condition === 'Thunderstorm' || condition === 'Heavy rain';
  const windMph = Math.round(2 + rand() * (cell.isWater ? 22 : 16) + (stormy ? 14 + rand() * 14 : 0));

  const tempCRounded = Math.round(tempC * 10) / 10;
  const description = describe(condition, tempC, windMph);

  return {
    tempC: tempCRounded,
    tempF: Math.round((tempCRounded * 9) / 5 + 32),
    condition,
    precipitating,
    windDirDeg: Math.round(windDirDeg),
    windCompass: compassOf(windDirDeg),
    windMph,
    description,
  };
}

function describe(condition: WeatherCondition, tempC: number, windMph: number): string {
  const feel =
    tempC <= -20 ? 'brutally cold'
    : tempC <= -8 ? 'bitterly cold'
    : tempC <= 0 ? 'freezing'
    : tempC <= 8 ? 'cold'
    : tempC <= 15 ? 'cool'
    : tempC <= 24 ? 'mild'
    : tempC <= 31 ? 'warm'
    : 'scorching';
  const wind = windMph >= 30 ? ', with howling wind' : windMph >= 18 ? ', windy' : '';
  return `${condition}, ${feel}${wind}.`;
}

/** True when the day's weather should surface as a severe-weather event. */
export function isSevere(w: Weather): boolean {
  return w.condition === 'Blizzard' || w.condition === 'Thunderstorm' || (w.condition === 'Heavy snow' && w.windMph >= 25) || (w.condition === 'Heavy rain' && w.windMph >= 30);
}
