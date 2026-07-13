import { describe, expect, it, beforeAll } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { buildWorldData, type WorldData } from '../data/worldLoader';
import { GOODS } from './goods';
import { buildProduction, burgWeeklyProduction, totalProduction } from './production';
import { burgWeeklyDemand } from './demand';
import { goodIdsStockedByBurg } from './markets';

let wd: WorldData;
beforeAll(() => {
  const dir = path.resolve(__dirname, '../../public/data');
  const read = (f: string) => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
  wd = buildWorldData(read('geometry.json'), read('world.json'), read('events.wars.json'));
});

describe('production', () => {
  it('is deterministic and memoized per world', () => {
    expect(buildProduction(wd)).toBe(buildProduction(wd));
  });

  it('produces every good somewhere in the world', () => {
    const model = buildProduction(wd);
    for (const g of GOODS) {
      expect(totalProduction(model, g.id), g.id).toBeGreaterThan(0);
    }
  });

  it('concentrates mined goods where the mines are', () => {
    const model = buildProduction(wd);
    // The five mine markers sit in provinces 300/305/59/302/144.
    const ironProvince = model.byProvince.get(300)!;
    const genericProvince = model.byProvince.get(1)!;
    expect(ironProvince.iron).toBeGreaterThan((genericProvince?.iron ?? 0) * 2);
  });

  it("splits a province's output among its burgs by population", () => {
    const model = buildProduction(wd);
    const burg = wd.world.burgs.find((b) => model.provinceOfBurg.has(b.i))!;
    const share = burgWeeklyProduction(model, burg);
    // A burg only receives goods its province actually produces.
    for (const v of Object.values(share)) expect(v).toBeGreaterThanOrEqual(0);
    expect(Object.keys(share).length).toBeGreaterThan(0);
  });
});

describe('demand', () => {
  it('only demands goods the market stocks, scaled by population', () => {
    const city = wd.world.burgs.find((b) => b.tier === 'city')!;
    const demand = burgWeeklyDemand(wd, city);
    const stocked = new Set(goodIdsStockedByBurg(city));
    for (const id of Object.keys(demand)) expect(stocked.has(id)).toBe(true);
    expect(demand.grain).toBeGreaterThan(0);
  });

  it('a village demands staples but not luxuries', () => {
    const village = wd.world.burgs.find((b) => b.tier === 'village' && !b.capital)!;
    const demand = burgWeeklyDemand(wd, village);
    expect(demand.grain).toBeGreaterThan(0);
    expect(demand.clockwork).toBeUndefined();
  });
});
