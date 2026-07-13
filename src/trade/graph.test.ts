import { describe, expect, it, beforeAll } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { buildWorldData, type WorldData } from '../data/worldLoader';
import { GOODS, GOOD_IDS, getGood, ELASTICITY } from './goods';
import { marketClass, goodIdsStockedByBurg } from './markets';
import { buildRouteGraph } from './graph';

let wd: WorldData;
beforeAll(() => {
  const dir = path.resolve(__dirname, '../../public/data');
  const read = (f: string) => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
  wd = buildWorldData(read('geometry.json'), read('world.json'), read('events.wars.json'));
});

describe('goods catalog', () => {
  it('has 24 well-formed goods with unique ids and positive base prices', () => {
    expect(GOODS).toHaveLength(24);
    expect(new Set(GOOD_IDS).size).toBe(24);
    for (const g of GOODS) {
      expect(g.basePrice, g.id).toBeGreaterThan(0);
      expect(g.productionRules.length, g.id).toBeGreaterThan(0);
      expect(ELASTICITY[g.tier]).toBeGreaterThan(0);
    }
  });

  it('resolves goods by id', () => {
    expect(getGood('clockwork')?.name).toBe('Gnomish clockwork');
    expect(getGood('nope')).toBeUndefined();
  });
});

describe('markets', () => {
  it('classes a city as a grand market and a village as a post', () => {
    const city = wd.world.burgs.find((b) => b.tier === 'city')!;
    const village = wd.world.burgs.find((b) => b.tier === 'village')!;
    expect(marketClass(city)).toBe('grand');
    expect(marketClass(village)).toBe('village');
  });

  it('grand markets stock all goods; plain villages stock staples only', () => {
    const city = wd.world.burgs.find((b) => b.tier === 'city')!;
    const village = wd.world.burgs.find((b) => b.tier === 'village' && !b.capital)!;
    expect(goodIdsStockedByBurg(city)).toHaveLength(24);
    const villageGoods = goodIdsStockedByBurg(village);
    expect(villageGoods).toContain('grain');
    expect(villageGoods).not.toContain('clockwork');
    expect(villageGoods.every((id) => getGood(id)!.tier === 'staple')).toBe(true);
  });
});

describe('route graph', () => {
  it('builds a connected burg adjacency with typed edges', () => {
    const graph = buildRouteGraph(wd);
    expect(graph.edges.length).toBeGreaterThan(200);
    expect(graph.edges.every((e) => e.a !== e.b && e.km > 0)).toBe(true);
    const types = new Set(graph.edges.map((e) => e.type));
    expect(types.has('road') || types.has('trail')).toBe(true);
    // At least some burg has neighbours.
    const someWithNeighbors = [...graph.neighbors.values()].some((n) => n.length > 0);
    expect(someWithNeighbors).toBe(true);
  });

  it('memoizes the graph per world', () => {
    expect(buildRouteGraph(wd)).toBe(buildRouteGraph(wd));
  });
});
