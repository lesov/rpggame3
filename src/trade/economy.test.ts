import { describe, expect, it, beforeAll } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { buildWorldData, type WorldData } from '../data/worldLoader';
import { GOODS, getGood } from './goods';
import { PRICE_FLOOR, PRICE_CEIL, priceFor } from './pricing';
import { economicModifiers } from './events';
import { diffuse } from './flow';
import { initEconomy, worldTick, spreadsAcross, type EconomyState, type MarketState } from './economy';
import type { TradeGraph } from './graph';

let wd: WorldData;
beforeAll(() => {
  const dir = path.resolve(__dirname, '../../public/data');
  const read = (f: string) => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
  wd = buildWorldData(read('geometry.json'), read('world.json'), read('events.wars.json'));
});

function everyPriceInBand(econ: EconomyState): boolean {
  for (const m of econ.markets.values()) {
    for (const good of GOODS) {
      const p = m.price[good.id];
      if (p == null) continue;
      if (!Number.isFinite(p)) return false;
      if (p < good.basePrice * PRICE_FLOOR - 1e-9) return false;
      if (p > good.basePrice * PRICE_CEIL + 1e-9) return false;
    }
  }
  return true;
}

describe('pricing', () => {
  it('always clamps into the rubber band and never goes NaN/negative', () => {
    const grain = getGood('grain')!;
    expect(priceFor(grain, 0, 100, 1, 1)).toBeCloseTo(grain.basePrice * PRICE_CEIL); // starved
    expect(priceFor(grain, 1e9, 1, 1, 1)).toBeCloseTo(grain.basePrice * PRICE_FLOOR); // glut
    expect(priceFor(grain, 0, 0, 1, 1)).toBeGreaterThan(0); // 0/0 guarded
    expect(priceFor(grain, 10, 10, 1, 1)).toBeCloseTo(grain.basePrice, 5); // equilibrium
  });
});

describe('economy simulation', () => {
  it('seeds a settled world with sensible day-one spreads', () => {
    const econ = initEconomy(wd);
    expect(everyPriceInBand(econ)).toBe(true);
    // Regional spreads should actually exist for at least some goods.
    const spreads = spreadsAcross(econ);
    expect(spreads[0].ratio).toBeGreaterThan(1.2);
  });

  it('stays within clamps and finite across a multi-year run', () => {
    let econ = initEconomy(wd);
    // ~6 years, weekly, exercising the catch-up path in chunks.
    const start = econ.week;
    for (let wk = start + 4; wk <= start + 6 * 52; wk += 4) {
      econ = worldTick(wd, econ, wk);
    }
    expect(everyPriceInBand(econ)).toBe(true);
  });

  it('advancing the clock moves some prices', () => {
    const econ = initEconomy(wd);
    const before = new Map([...econ.markets].map(([id, m]) => [id, { ...m.price }]));
    const later = worldTick(wd, econ, econ.week + 30);
    let moved = 0;
    for (const [id, m] of later.markets) {
      const prev = before.get(id)!;
      for (const good of GOODS) {
        if (m.price[good.id] != null && Math.abs(m.price[good.id] - prev[good.id]) > 1e-6) moved++;
      }
    }
    expect(moved).toBeGreaterThan(0);
  });
});

describe('diffusion', () => {
  it('closes a price gap between neighbors but leaves a friction margin', () => {
    // Two synthetic markets joined by a single road edge; A is glutted, B starved.
    const iron = getGood('iron')!;
    const mkMarket = (burgId: number, stock: number): MarketState => ({
      burgId,
      cls: 'town',
      stock: { iron: stock },
      price: { iron: priceFor(iron, stock, 10, 1, 1) },
      prev: {},
    });
    const markets = new Map<number, MarketState>([
      [1, mkMarket(1, 200)], // cheap
      [2, mkMarket(2, 1)], // dear
    ]);
    const graph: TradeGraph = {
      edges: [{ a: 1, b: 2, type: 'road', km: 50, capacity: 1.0 }],
      neighbors: new Map(),
    };
    const initialGap = Math.abs(markets.get(1)!.price.iron - markets.get(2)!.price.iron);
    for (let i = 0; i < 20; i++) {
      diffuse(markets, graph, [iron]);
      for (const m of markets.values()) m.price.iron = priceFor(iron, m.stock.iron, 10, 1, 1);
    }
    const finalGap = Math.abs(markets.get(1)!.price.iron - markets.get(2)!.price.iron);
    expect(finalGap).toBeLessThan(initialGap); // gap narrowed
    expect(markets.get(2)!.stock.iron).toBeGreaterThan(1); // goods actually moved in
  });
});

describe('history coupling', () => {
  it('a war raises iron & grain and depresses luxuries in belligerent states', () => {
    const warYear = wd.wars.find((w) => w.end == null || w.end >= w.start)?.start ?? 1181;
    const war = wd.wars.find((w) => w.start === warYear)!;
    const mods = economicModifiers(wd, war.start);
    const iron = getGood('iron')!;
    const gems = getGood('gems')!;
    expect(mods.priceMultFor(war.attacker, iron)).toBeGreaterThan(1);
    expect(mods.priceMultFor(war.attacker, gems)).toBeLessThan(1);
    // A neutral state (id far outside any war) is unaffected.
    expect(mods.priceMultFor(9999, iron)).toBe(1);
  });

  it('war effects decay after peace', () => {
    const ended = wd.wars.find((w) => w.end != null);
    if (!ended) return; // no ended wars in this dataset
    const iron = getGood('iron')!;
    const during = economicModifiers(wd, ended.start).priceMultFor(ended.attacker, iron);
    const longAfter = economicModifiers(wd, (ended.end as number) + 10).priceMultFor(ended.attacker, iron);
    expect(during).toBeGreaterThan(1);
    expect(longAfter).toBe(1);
  });

  it('the sack-of-Zinulb anchor drops relic prices below base', () => {
    const relics = getGood('relics')!;
    expect(economicModifiers(wd, 1260).priceMultFor(1, relics)).toBeLessThan(1);
    expect(economicModifiers(wd, 1200).priceMultFor(1, relics)).toBe(1); // before the event
  });

  it('the Mathathremo anchor collapses dwarf-steel supply permanently', () => {
    const dwarfsteel = getGood('dwarfsteel')!;
    expect(economicModifiers(wd, 1240).supplyMultFor('Khiz', dwarfsteel)).toBeLessThan(0.1);
    expect(economicModifiers(wd, 1200).supplyMultFor('Khiz', dwarfsteel)).toBe(1);
  });
});
