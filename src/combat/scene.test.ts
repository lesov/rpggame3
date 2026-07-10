import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { buildWorldData, type WorldData } from '../data/worldLoader';
import { buildScene, timeOfDayAtClock, timeOfDayFor } from './scene';
import { toOrdinal } from '../sim/calendar';

let wd: WorldData;

beforeAll(() => {
  const dir = path.resolve(__dirname, '../../public/data');
  const read = (f: string) => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
  wd = buildWorldData(read('geometry.json'), read('world.json'), read('events.wars.json'));
});

describe('combat scene builder', () => {
  const date = { year: 1181, month: 1, day: 1 };

  it('builds a complete scene for a land cell', () => {
    const cell = wd.geometry.cells[5000];
    const scene = buildScene(wd, cell.i, cell.p[0], cell.p[1], date);
    expect(scene.biome.length).toBeGreaterThan(0);
    expect(scene.placeName.length).toBeGreaterThan(0);
    expect(scene.weather.condition.length).toBeGreaterThan(0);
    expect(typeof scene.weather.tempF).toBe('number');
    expect(['bright', 'dim', 'dark']).toContain(scene.light);
    expect(scene.timeOfDay.length).toBeGreaterThan(3);
    expect(['Winter', 'Spring', 'Summer', 'Autumn']).toContain(scene.season);
  });

  it('is deterministic for the same cell and date', () => {
    const cell = wd.geometry.cells[8000];
    const a = buildScene(wd, cell.i, cell.p[0], cell.p[1], date);
    const b = buildScene(wd, cell.i, cell.p[0], cell.p[1], date);
    expect(a).toEqual(b);
  });

  it('time of day varies across dates and is consistent with light', () => {
    const names = new Set<string>();
    for (let d = 0; d < 20; d++) {
      const tod = timeOfDayFor(5000, toOrdinal(date) + d);
      names.add(tod.name);
      expect(['bright', 'dim', 'dark']).toContain(tod.light);
    }
    expect(names.size).toBeGreaterThan(3);
  });

  it('uses actual game clock when one is provided', () => {
    expect(timeOfDayAtClock({ hour: 2, minute: 0 })).toEqual({ name: 'the dead of night', light: 'dark' });
    expect(timeOfDayAtClock({ hour: 6, minute: 30 })).toEqual({ name: 'grey dawn', light: 'dim' });
    expect(timeOfDayAtClock({ hour: 12, minute: 0 })).toEqual({ name: 'midday', light: 'bright' });
    expect(timeOfDayAtClock({ hour: 19, minute: 30 })).toEqual({ name: 'dusk', light: 'dim' });
    const cell = wd.geometry.cells[5000];
    const scene = buildScene(wd, cell.i, cell.p[0], cell.p[1], date, { hour: 2, minute: 15 });
    expect(scene.timeOfDay).toBe('the dead of night');
    expect(scene.light).toBe('dark');
  });

  it('dims bright daylight under overcast or precipitation', () => {
    // find a (cell, day) where it rains/snows at a bright time of day
    for (let d = 0; d < 200; d++) {
      const cell = wd.geometry.cells[5000];
      const testDate = { year: 1181, month: 1 + (d % 12), day: 1 + (d % 28) };
      const scene = buildScene(wd, cell.i, cell.p[0], cell.p[1], testDate);
      const tod = timeOfDayFor(cell.i, toOrdinal(testDate));
      if (tod.light === 'bright' && (scene.weather.precipitating || scene.weather.condition === 'Overcast')) {
        expect(scene.light).toBe('dim');
        return;
      }
    }
    throw new Error('no overcast bright day found in 200 tries');
  });
});
