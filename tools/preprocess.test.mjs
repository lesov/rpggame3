import { describe, it, expect, beforeAll } from 'vitest';
import { loadInputs, build } from './preprocess.mjs';

let out;
beforeAll(() => {
  out = build(loadInputs());
});

describe('preprocess output schema', () => {
  it('emits every pack cell with polygon and climate', () => {
    const { geometry } = out;
    expect(geometry.cells.length).toBe(24152);
    expect(geometry.width).toBe(2560);
    expect(geometry.height).toBe(1305);
    expect(geometry.distanceScale).toBe(3);
    expect(geometry.biomes.length).toBe(13);
    for (const c of [geometry.cells[0], geometry.cells[12000], geometry.cells.at(-1)]) {
      expect(c.poly.length).toBeGreaterThanOrEqual(3);
      expect(typeof c.temp).toBe('number');
      expect(typeof c.prec).toBe('number');
      expect(c.temp).toBeGreaterThanOrEqual(-40);
      expect(c.temp).toBeLessThanOrEqual(45);
    }
  });

  it('merges all 1245 settlements into burgs with buildings', () => {
    const { world } = out;
    expect(world.burgs.length).toBe(1245);
    const withBuildings = world.burgs.filter((b) => b.buildings.length > 0);
    expect(withBuildings.length).toBe(1245);
    const smovere = world.burgs.find((b) => b.name === 'Smovere');
    expect(smovere.capital).toBe(true);
    expect(smovere.population).toBe(48832);
    expect(smovere.landmarks.palace.name).toBe('Birchholl Keep');
    expect(smovere.buildings.some((bl) => bl.type === 'adventure_guild')).toBe(true);
  });

  it('keeps 33 states (incl. Neutrals) with diplomacy and campaigns', () => {
    const { world } = out;
    expect(world.states.length).toBe(33);
    const shateria = world.states.find((s) => s.i === 1);
    expect(shateria.fullName).toBe('Shaterian Theocracy');
    expect(shateria.campaigns.length).toBeGreaterThan(0);
    expect(shateria.diplomacy.length).toBe(33);
  });

  it('joins markers with their lore notes', () => {
    const { world } = out;
    expect(world.markers.length).toBe(210);
    const withLegend = world.markers.filter((m) => m.legend);
    expect(withLegend.length).toBe(210);
  });

  it('joins positioned regiments with their lore legends', () => {
    const { regiments } = out.world;
    expect(regiments.length).toBeGreaterThan(300); // 382 regiment notes in data
    const withLegend = regiments.filter((r) => r.legend);
    expect(withLegend.length / regiments.length).toBeGreaterThan(0.95);
    for (const r of regiments.slice(0, 20)) {
      expect(typeof r.x).toBe('number');
      expect(r.total).toBeGreaterThan(0);
    }
  });

  it('carries the named-geography indexes', () => {
    const { indexes } = out.world;
    expect(Object.keys(indexes.relief).length).toBeGreaterThan(2000);
    expect(Object.keys(indexes.biomeRegion).length).toBeGreaterThan(10000);
    expect(Object.keys(indexes.sea).length).toBeGreaterThan(5000);
    expect(Object.keys(indexes.bay).length).toBeGreaterThan(700);
    expect(out.world.namedFeatures.length).toBe(22);
    expect(out.world.landmasses.length).toBe(3);
    expect(out.world.waterFeatures.length).toBe(16);
  });

  it('extracts deduplicated wars from state campaigns', () => {
    const { wars } = out.wars;
    expect(wars.length).toBeGreaterThan(50);
    const names = wars.map((w) => `${w.name}|${w.start}`);
    expect(new Set(names).size).toBe(names.length);
    const ongoing = wars.filter((w) => w.start <= 1181 && !w.end);
    expect(ongoing.length).toBe(6); // unresolved wars at game start (1177-1181)
    for (const w of wars) {
      expect(w.start).toBeGreaterThan(0);
      if (w.end) expect(w.end).toBeGreaterThanOrEqual(w.start);
    }
  });

  it('computes state border segments', () => {
    const { stateBorders } = out.world;
    expect(stateBorders.length).toBeGreaterThan(1000);
    for (const seg of stateBorders.slice(0, 10)) expect(seg.length).toBe(4);
  });

  it('passes people through with roles', () => {
    expect(out.world.people.length).toBe(73);
    const roles = new Set(out.world.people.map((p) => p.role));
    expect(roles.has('state_ruler')).toBe(true);
  });

  it('places the fifteen portals exactly at the portals-marker burgs', () => {
    const { world } = out;
    const portalBurgs = world.burgs.filter((b) => b.portal);
    expect(portalBurgs.length).toBe(15);

    const portalMarkers = world.markers.filter((m) => m.type === 'portals');
    expect(portalMarkers.length).toBe(15);
    const markerCells = new Set(portalMarkers.map((m) => m.cell));
    for (const b of portalBurgs) expect(markerCells.has(b.cell)).toBe(true);

    const feeByTier = { city: 200, large_town: 150, town: 100, village: 50 };
    for (const b of portalBurgs) {
      expect(b.portal.feeGold).toBe(feeByTier[b.tier]);
      expect(b.portal.name).toMatch(/Portal$/);
    }
    // Canon spot-checks: the great cities of a former age, not today's capitals.
    expect(world.burgs.find((b) => b.name === 'Eralinde').portal.name).toBe('Nulgathun Portal');
    expect(world.burgs.find((b) => b.name === 'Keboimrud').portal.feeGold).toBe(200);
    expect(world.burgs.find((b) => b.name === 'Smovere').portal).toBeUndefined();
  });

  it('strips the legacy per-building teleport flags everywhere', () => {
    for (const b of out.world.burgs) {
      for (const bl of b.buildings) {
        expect(bl.hasTeleportPortal).toBeUndefined();
        expect(bl.portalFeeGold).toBeUndefined();
      }
    }
  });

  it('gives portal markers the canon fifteen-Ways legend', () => {
    const portalMarkers = out.world.markers.filter((m) => m.type === 'portals');
    for (const m of portalMarkers) {
      expect(m.legend).toContain('fifteen ancient portals');
      expect(m.name).toMatch(/Portal$/);
    }
  });

  it('repairs the unbalanced "Thyran (Wood Elf" culture name everywhere', () => {
    const thyran = out.world.cultures.find((c) => c.name.startsWith('Thyran'));
    expect(thyran.name).toBe('Thyran (Wood Elf)');
    for (const c of out.world.cultures) {
      expect((c.name.match(/\(/g) ?? []).length).toBe((c.name.match(/\)/g) ?? []).length);
    }
    for (const p of out.world.people) {
      if (p.culture) expect(p.culture).not.toMatch(/\([^)]*$/);
    }
    for (const f of out.world.namedFeatures) {
      if (f.nameCulture) expect(f.nameCulture).not.toMatch(/\([^)]*$/);
    }
  });
});
