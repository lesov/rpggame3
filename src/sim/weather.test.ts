import { describe, it, expect } from 'vitest';
import { type CellClimate, weatherAt, compassOf, seasonalOffset, seasonalAmplitude } from './weather';
import type { GameDate } from './calendar';

const temperate: CellClimate = { id: 5000, temp: 10, prec: 25, lat: 48, coastRank: 5, isWater: false };
const tropicalCoast: CellClimate = { id: 7000, temp: 27, prec: 40, lat: 5, coastRank: 1, isWater: false };
const polar: CellClimate = { id: 100, temp: -18, prec: 10, lat: 78, coastRank: 3, isWater: false };
const southern: CellClimate = { id: 9000, temp: 12, prec: 20, lat: -45, coastRank: 6, isWater: false };

const jan: GameDate = { year: 1181, month: 1, day: 15 };
const jul: GameDate = { year: 1181, month: 7, day: 15 };

function avgTemp(cell: CellClimate, month: number): number {
  let sum = 0;
  for (let day = 1; day <= 28; day++) sum += weatherAt(cell, { year: 1181, month, day }).tempC;
  return sum / 28;
}

describe('weather', () => {
  it('is deterministic for the same cell and date', () => {
    const a = weatherAt(temperate, jan);
    const b = weatherAt(temperate, jan);
    expect(a).toEqual(b);
  });

  it('differs across days and cells (not constant)', () => {
    const conditions = new Set<string>();
    for (let d = 1; d <= 28; d++) conditions.add(weatherAt(temperate, { year: 1181, month: 3, day: d }).condition);
    expect(conditions.size).toBeGreaterThan(1);
  });

  it('makes northern winters colder than summers, and inverts in the south', () => {
    expect(avgTemp(temperate, 7) - avgTemp(temperate, 1)).toBeGreaterThan(8);
    expect(avgTemp(southern, 1) - avgTemp(southern, 7)).toBeGreaterThan(8);
  });

  it('keeps tropical seasonal swing small', () => {
    const swing = Math.abs(avgTemp(tropicalCoast, 7) - avgTemp(tropicalCoast, 1));
    expect(swing).toBeLessThan(4);
  });

  it('only snows at or below freezing, only rains above', () => {
    const cells = [temperate, tropicalCoast, polar, southern];
    for (const cell of cells) {
      for (let m = 1; m <= 12; m++) {
        for (let d = 1; d <= 28; d += 3) {
          const w = weatherAt(cell, { year: 1200, month: m, day: d });
          if (['Snow', 'Heavy snow', 'Blizzard'].includes(w.condition)) expect(w.tempC).toBeLessThanOrEqual(0);
          if (['Rain', 'Heavy rain', 'Drizzle', 'Thunderstorm'].includes(w.condition)) expect(w.tempC).toBeGreaterThan(0);
        }
      }
    }
  });

  it('produces sane values (temp, wind, compass, °F conversion)', () => {
    for (let d = 1; d <= 28; d++) {
      const w = weatherAt(polar, { year: 1181, month: 1, day: d });
      expect(w.tempC).toBeGreaterThan(-60);
      expect(w.tempC).toBeLessThan(50);
      expect(w.windMph).toBeGreaterThanOrEqual(0);
      expect(w.windMph).toBeLessThan(80);
      expect(w.tempF).toBe(Math.round((w.tempC * 9) / 5 + 32));
      expect(w.description.length).toBeGreaterThan(5);
    }
  });

  it('amplitude grows with latitude and continentality', () => {
    expect(seasonalAmplitude(60, 8, false)).toBeGreaterThan(seasonalAmplitude(10, 8, false));
    expect(seasonalAmplitude(50, 10, false)).toBeGreaterThan(seasonalAmplitude(50, 0, false));
  });

  it('seasonal offset peaks in the right months', () => {
    expect(seasonalOffset(15, 50, 10)).toBeCloseTo(-10, 1); // mid-Jan, north: coldest
    expect(seasonalOffset(197, 50, 10)).toBeGreaterThan(9.5); // mid-Jul, north: hottest
    expect(seasonalOffset(15, -50, 10)).toBeCloseTo(10, 1); // mid-Jan, south: hottest
  });

  it('maps compass directions', () => {
    expect(compassOf(0)).toBe('N');
    expect(compassOf(225)).toBe('SW');
    expect(compassOf(359)).toBe('N');
  });
});
