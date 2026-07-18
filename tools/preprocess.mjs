/**
 * Preprocess the raw Lepasoul data (Azgaar full export + companion files)
 * into compact artifacts consumed by the web app:
 *
 *   public/data/geometry.json    cell polygons + terrain/climate per cell
 *   public/data/world.json       states, burgs (merged with buildings/people),
 *                                rivers, routes, markers+lore, named features
 *   public/data/events.wars.json war begin/end events from state campaigns
 *
 * Usage: node tools/preprocess.mjs [--force]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = path.join(ROOT, 'public', 'data');

export const INPUT_FILES = {
  full: 'Lepasoul Full 2026-07-02-22-09.json',
  buildings: 'lepasoul.buildings.json',
  features: 'lepasoul.features.json',
  people: 'lepasoul.people.json',
};

const r1 = (v) => Math.round(v * 10) / 10;
const r2 = (v) => Math.round(v * 100) / 100;

/**
 * The source data has one malformed culture name, "Thyran (Wood Elf" —
 * missing its closing parenthesis — which leaks into people records too.
 * Balance any name that opens more parens than it closes.
 */
export function fixParens(name) {
  if (typeof name !== 'string') return name;
  const open = (name.match(/\(/g) ?? []).length;
  const close = (name.match(/\)/g) ?? []).length;
  return open > close ? name.trimEnd() + ')'.repeat(open - close) : name;
}

export function loadInputs(root = ROOT) {
  const read = (f) => JSON.parse(fs.readFileSync(path.join(root, f), 'utf8'));
  return {
    full: read(INPUT_FILES.full),
    buildings: read(INPUT_FILES.buildings),
    features: read(INPUT_FILES.features),
    people: read(INPUT_FILES.people),
  };
}

export function build({ full, buildings, features, people }) {
  const { pack, grid, biomesData, notes, settings, mapCoordinates, info } = full;
  const noteById = new Map(notes.map((n) => [n.id, n]));

  // ---- geometry.json ------------------------------------------------------
  const cells = pack.cells.map((c) => {
    const g = grid.cells[c.g];
    return {
      i: c.i,
      p: [r1(c.p[0]), r1(c.p[1])],
      poly: c.v.map((vid) => pack.vertices[vid].p),
      c: c.c, // neighbor cell ids (for borders / nearby walks)
      h: c.h,
      t: c.t, // signed distance-to-coast rank (+land / -water)
      f: c.f, // azgaar feature id (ocean / island / lake)
      biome: c.biome,
      state: c.state,
      province: c.province,
      culture: c.culture,
      religion: c.religion,
      pop: r2(c.pop),
      burg: c.burg,
      r: c.r, // river id (0 = none)
      temp: g.temp, // °C annual mean
      prec: g.prec, // 0..64 annual moisture
    };
  });

  const geometry = {
    mapName: info.mapName,
    width: info.width,
    height: info.height,
    seed: info.seed,
    mapCoordinates,
    distanceScale: Number(settings.distanceScale),
    distanceUnit: settings.distanceUnit,
    heightUnit: settings.heightUnit,
    heightExponent: Number(settings.heightExponent),
    temperatureScale: settings.temperatureScale,
    populationRate: settings.populationRate,
    urbanization: settings.urbanization,
    winds: settings.options.winds,
    biomes: biomesData.i.map((i) => ({
      i,
      name: biomesData.name[i],
      color: biomesData.color[i],
      habitability: biomesData.habitability[i],
    })),
    azgaarFeatures: pack.features
      .filter((f) => f && typeof f === 'object')
      .map((f) => ({ i: f.i, type: f.type, land: f.land, group: f.group, name: f.name, cells: f.cells })),
    cells,
  };

  // ---- world.json ---------------------------------------------------------
  // Regiments: each state's `military` array has positioned regiments; the
  // note `regiment<state>-<i>` carries its lore legend ("stationed/based in
  // <place>", composition). Join by id for a flat, positioned regiment list.
  const regiments = [];
  for (const s of pack.states) {
    if (!s || s.removed) continue;
    for (const m of s.military ?? []) {
      const note = noteById.get(`regiment${s.i}-${m.i}`);
      regiments.push({
        state: s.i,
        name: m.name,
        total: m.a,
        units: m.u,
        cell: m.cell,
        x: r1(m.x),
        y: r1(m.y),
        legend: note?.legend,
      });
    }
  }

  const settlementByBurgId = new Map(buildings.settlements.map((s) => [s.burgId, s]));
  const populationRate = settings.populationRate;
  const urbanization = settings.urbanization;

  // The Fifteen Portals: canon places a portal only where the map has a
  // `portals` marker — each sits on a burg. The 35 `hasTeleportPortal` flags
  // in the companion buildings file predate this canon and are stripped; the
  // per-burg `portal` derived here is the single source of truth.
  const portalByBurgId = new Map();
  for (const m of pack.markers.filter((m) => m.type === 'portals')) {
    const burgId = pack.cells[m.cell]?.burg;
    if (!burgId) {
      console.warn(`portal marker ${m.i} has no burg at cell ${m.cell}; skipped`);
      continue;
    }
    portalByBurgId.set(burgId, { name: noteById.get(`marker${m.i}`)?.name });
  }

  const tierFromPopulation = (pop) =>
    pop >= 20000 ? 'city' : pop >= 10000 ? 'large_town' : pop >= 5000 ? 'town' : 'village';
  const portalFeeByTier = { city: 200, large_town: 150, town: 100, village: 50 };

  const burgs = pack.burgs
    .filter((b) => b && b.i && !b.removed)
    .map((b) => {
      const s = settlementByBurgId.get(b.i);
      const population = s?.population ?? Math.round(b.population * populationRate * urbanization);
      const portal = portalByBurgId.get(b.i);
      return {
        i: b.i,
        name: b.name,
        cell: b.cell,
        x: r1(b.x),
        y: r1(b.y),
        state: b.state,
        culture: b.culture,
        type: b.type,
        group: b.group,
        capital: !!b.capital,
        port: !!b.port,
        citadel: !!b.citadel,
        walls: !!b.walls,
        temple: !!b.temple,
        plaza: !!b.plaza,
        shanty: !!b.shanty,
        population,
        tier: s?.tier,
        religion: s?.religion,
        buildings: (s?.buildings ?? []).map(({ hasTeleportPortal, portalFeeGold, ...bl }) => bl),
        landmarks: s?.landmarks ?? {},
        portal: portal
          ? { name: portal.name, feeGold: portalFeeByTier[s?.tier ?? tierFromPopulation(population)] }
          : undefined,
      };
    });

  const states = pack.states
    .filter((s) => s && !s.removed)
    .map((s) => ({
      i: s.i,
      name: s.name,
      fullName: s.fullName,
      form: s.form,
      formName: s.formName,
      type: s.type,
      color: s.color,
      capital: s.capital,
      center: s.center,
      pole: s.pole,
      culture: s.culture,
      expansionism: s.expansionism,
      neighbors: s.neighbors,
      diplomacy: s.diplomacy,
      campaigns: s.campaigns ?? [],
      alert: s.alert,
      urban: s.urban,
      rural: s.rural,
      cellCount: s.cells,
    }));

  const provinces = pack.provinces
    .filter((p2) => p2 && typeof p2 === 'object' && !p2.removed)
    .map((p2) => ({
      i: p2.i,
      state: p2.state,
      name: p2.name,
      formName: p2.formName,
      fullName: p2.fullName,
      color: p2.color,
      burg: p2.burg,
      center: p2.center,
    }));

  const cultures = pack.cultures
    .filter((c) => c && !c.removed)
    .map((c) => ({ i: c.i, name: fixParens(c.name), type: c.type, color: c.color }));

  const religions = pack.religions
    .filter((r) => r && typeof r === 'object' && !r.removed)
    .map((r) => ({
      i: r.i,
      name: r.name,
      type: r.type,
      form: r.form,
      deity: r.deity,
      color: r.color,
      culture: r.culture,
      center: r.center,
    }));

  const cellPoint = (id) => {
    const c = pack.cells[id];
    return c ? [r1(c.p[0]), r1(c.p[1])] : null;
  };

  const rivers = pack.rivers
    .filter((r) => r && r.cells && r.cells.length > 1)
    .map((r) => ({
      i: r.i,
      name: r.name,
      type: r.type,
      discharge: r.discharge,
      length: r.length,
      width: r.width,
      points: r.cells.map(cellPoint).filter(Boolean),
    }));

  const routes = pack.routes.map((r) => ({
    i: r.i,
    group: r.group,
    points: r.points.map(([x, y]) => [r1(x), r1(y)]),
  }));

  // The raw export's portal notes carry a generic Azgaar legend; replace it
  // with the canon lore (see src/lore/codex.ts, "The Ways").
  const PORTAL_LEGEND =
    'One of the fifteen ancient portals of Lepasoul, raised many centuries ago in what was ' +
    'then one of the great cities of the world by the wandering company that would in time ' +
    "become the Adventurer's Guild. The Guild tends it still — by rite and rote, exactly as " +
    'taught — for none now living know how such a thing is made.';

  const markers = pack.markers.map((m) => {
    const note = noteById.get(`marker${m.i}`);
    return {
      i: m.i,
      type: m.type,
      icon: m.icon,
      x: r1(m.x),
      y: r1(m.y),
      cell: m.cell,
      name: note?.name,
      legend: m.type === 'portals' ? PORTAL_LEGEND : note?.legend,
    };
  });

  const zones = pack.zones
    .filter((z) => z && !z.hidden)
    .map((z) => ({ i: z.i, name: z.name, type: z.type, cells: z.cells }));

  // State borders: for each pair of adjacent cells in different states, the
  // shared polygon edge (the two vertices both cells touch).
  const stateBorders = [];
  for (const c of pack.cells) {
    for (const n of c.c) {
      if (n <= c.i) continue;
      const other = pack.cells[n];
      if (!other || other.state === c.state) continue;
      if (c.h < 20 && other.h < 20) continue; // skip water-water
      const shared = c.v.filter((v) => other.v.includes(v));
      if (shared.length >= 2) {
        const [a, b] = [pack.vertices[shared[0]].p, pack.vertices[shared[1]].p];
        stateBorders.push([a[0], a[1], b[0], b[1]]);
      }
    }
  }

  const world = {
    states,
    stateBorders,
    provinces,
    cultures,
    religions,
    burgs,
    rivers,
    routes,
    markers,
    zones,
    people: people.people.map((p) => ({ ...p, culture: fixParens(p.culture) })),
    regiments,
    // Named geography from lepasoul.features.json (cells dropped; the
    // cell->feature indexes below are how lookups happen).
    namedFeatures: features.features.map(({ cells: _c, ...f }) => ({
      ...f,
      ...(f.nameCulture ? { nameCulture: fixParens(f.nameCulture) } : {}),
    })),
    landmasses: features.landmasses,
    waterFeatures: features.waterFeatures.map(({ cells: _c, ...f }) => f),
    indexes: {
      relief: features.reliefIndex,
      biomeRegion: features.biomeIndex,
      bay: features.bayIndex,
      sea: features.seaIndex,
      landByFeature: features.landByFeature,
    },
  };

  // ---- events.wars.json ---------------------------------------------------
  // Campaigns are recorded on both belligerents; dedupe by name+start.
  const wars = [];
  const seen = new Set();
  for (const s of pack.states) {
    if (!s || s.removed) continue;
    for (const c of s.campaigns ?? []) {
      const key = `${c.name}|${c.start}`;
      if (seen.has(key)) continue;
      seen.add(key);
      wars.push({
        id: `war-${wars.length}`,
        name: c.name,
        start: c.start,
        end: c.end ?? null,
        attacker: c.attacker,
        defender: c.defender,
      });
    }
  }
  wars.sort((a, b) => a.start - b.start);

  return { geometry, world, wars: { wars } };
}

export function main({ force = false } = {}) {
  const outputs = ['geometry.json', 'world.json', 'events.wars.json'];
  if (!force && outputs.every((f) => fs.existsSync(path.join(OUT_DIR, f)))) {
    const newestInput = Math.max(
      ...Object.values(INPUT_FILES).map((f) => fs.statSync(path.join(ROOT, f)).mtimeMs),
      fs.statSync(fileURLToPath(import.meta.url)).mtimeMs,
    );
    const oldestOutput = Math.min(...outputs.map((f) => fs.statSync(path.join(OUT_DIR, f)).mtimeMs));
    if (oldestOutput > newestInput) {
      console.log('preprocess: outputs up to date (use --force to rebuild)');
      return;
    }
  }

  console.log('preprocess: reading inputs…');
  const inputs = loadInputs();
  console.log('preprocess: building…');
  const { geometry, world, wars } = build(inputs);

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const write = (name, data) => {
    const file = path.join(OUT_DIR, name);
    fs.writeFileSync(file, JSON.stringify(data));
    console.log(`  wrote ${name} (${(fs.statSync(file).size / 1e6).toFixed(1)} MB)`);
  };
  write('geometry.json', geometry);
  write('world.json', world);
  write('events.wars.json', wars);
  console.log(
    `preprocess: ${geometry.cells.length} cells, ${world.burgs.length} burgs, ` +
      `${world.states.length} states, ${wars.wars.length} wars`,
  );
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main({ force: process.argv.includes('--force') });
}
