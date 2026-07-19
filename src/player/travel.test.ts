import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { buildWorldData, type WorldData } from '../data/worldLoader';
import type { PlayerCharacter } from './types';
import {
  boatFareVosels,
  defaultTravelModeFor,
  elapsedMinutesForTravel,
  offroadBiomeMultiplier,
  planTravel,
  provisionsNeeded,
  nearbyTravelDestinations,
  roadRouteFor,
  seaPortDestinations,
  type TravelDestination,
} from './travel';

function makeTravelWorld(): WorldData {
  const cells = [
    { i: 0, p: [0, 0], poly: [], c: [1], h: 35, t: 2, f: 1, biome: 4, state: 1, province: 1, culture: 1, religion: 1, pop: 1, burg: 0, r: 0, temp: 10, prec: 20 },
    { i: 1, p: [50, 0], poly: [], c: [0, 2], h: 35, t: 2, f: 1, biome: 12, state: 1, province: 1, culture: 1, religion: 1, pop: 1, burg: 0, r: 0, temp: 10, prec: 20 },
    { i: 2, p: [100, 0], poly: [], c: [1], h: 35, t: 2, f: 1, biome: 12, state: 1, province: 1, culture: 1, religion: 1, pop: 1, burg: 0, r: 0, temp: 10, prec: 20 },
    { i: 3, p: [0, 100], poly: [], c: [], h: 35, t: 2, f: 2, biome: 4, state: 1, province: 1, culture: 1, religion: 1, pop: 1, burg: 0, r: 0, temp: 10, prec: 20 },
    { i: 4, p: [0, 150], poly: [], c: [], h: 35, t: 1, f: 2, biome: 4, state: 1, province: 1, culture: 1, religion: 1, pop: 1, burg: 0, r: 0, temp: 10, prec: 20 },
  ];
  const burgs = [
    { i: 1, name: 'Origin Port', cell: 0, x: 0, y: 0, state: 1, culture: 1, type: 'Town', group: 'town', capital: false, port: true, citadel: false, walls: false, temple: false, plaza: true, shanty: false, population: 1000, tier: 'town', buildings: [], landmarks: {} },
    { i: 2, name: 'Near Town', cell: 1, x: 50, y: 0, state: 1, culture: 1, type: 'Town', group: 'town', capital: false, port: false, citadel: false, walls: false, temple: false, plaza: true, shanty: false, population: 1000, tier: 'town', buildings: [], landmarks: {} },
    { i: 3, name: 'Far Town', cell: 2, x: 100, y: 0, state: 1, culture: 1, type: 'Town', group: 'town', capital: false, port: false, citadel: false, walls: false, temple: false, plaza: true, shanty: false, population: 1000, tier: 'town', buildings: [], landmarks: {} },
    { i: 4, name: 'Isolated Island', cell: 3, x: 0, y: 100, state: 1, culture: 1, type: 'Town', group: 'town', capital: false, port: false, citadel: false, walls: false, temple: false, plaza: true, shanty: false, population: 1000, tier: 'town', buildings: [], landmarks: {} },
    { i: 5, name: 'Island Port', cell: 4, x: 0, y: 150, state: 1, culture: 1, type: 'Town', group: 'town', capital: false, port: true, citadel: false, walls: false, temple: false, plaza: true, shanty: false, population: 1000, tier: 'town', buildings: [], landmarks: {} },
  ];
  return {
    geometry: {
      mapName: 'Travel Test',
      width: 120,
      height: 20,
      seed: '1',
      mapCoordinates: { latT: 1, latN: 1, latS: 0, lonT: 1, lonW: 0, lonE: 1 },
      distanceScale: 1,
      distanceUnit: 'mi',
      heightUnit: 'ft',
      heightExponent: 1,
      temperatureScale: 'C',
      populationRate: 1000,
      urbanization: 1,
      winds: [],
      biomes: Array.from({ length: 13 }, (_, i) => ({
        i,
        name: i === 12 ? 'Wetland' : i === 4 ? 'Grassland' : 'Grassland',
        color: '#0f0',
        habitability: i === 12 ? 30 : 80,
      })),
      azgaarFeatures: [],
      cells,
    },
    world: {
      states: [{ i: 1, name: 'Test', fullName: 'Test State', type: 'Generic', color: '#f00', capital: 1, center: 0, pole: [0, 0], culture: 1, expansionism: 1, neighbors: [], diplomacy: [], campaigns: [], urban: 1, rural: 1, cellCount: 3 }],
      stateBorders: [],
      provinces: [],
      cultures: [],
      religions: [],
      burgs,
      rivers: [],
      routes: [{ i: 1, group: 'roads', points: [[0, 0], [100, 0]] }],
      markers: [],
      zones: [],
      people: [],
      regiments: [],
      namedFeatures: [{ id: 'basheva', name: 'Basheva Mountains', type: 'mountain_range', tier: 'relief', seedCell: 1 }],
      landmasses: [],
      waterFeatures: [],
      indexes: { relief: { '1': 'basheva' }, biomeRegion: {}, bay: {}, sea: {}, landByFeature: {} },
    },
    wars: [],
    cellIndex: {
      cellAt: (x: number, y: number) => {
        if (y > 125) return 4;
        if (y > 75) return 3;
        return x < 25 ? 0 : x < 75 ? 1 : 2;
      },
      cellsInRect: () => cells.map((cell) => cell.i),
    },
    burgById: new Map(burgs.map((b) => [b.i, b])),
    stateById: new Map([[1, { i: 1, name: 'Test', fullName: 'Test State', type: 'Generic', color: '#f00', capital: 1, center: 0, pole: [0, 0], culture: 1, expansionism: 1, neighbors: [], diplomacy: [], campaigns: [], urban: 1, rural: 1, cellCount: 3 }]]),
    provinceById: new Map(),
    cultureById: new Map(),
    religionById: new Map(),
    scriptedEvents: [],
    ambientCtx: { burgs: [], markers: [], religions: [], climateOf: () => ({ id: 1, temp: 10, prec: 20, lat: 0, coastRank: 2, isWater: false }) },
    latOf: () => 0,
    lonOf: () => 0,
    climateOf: () => ({ id: 1, temp: 10, prec: 20, lat: 0, coastRank: 2, isWater: false }),
    distanceMi: (x1: number, y1: number, x2: number, y2: number) => Math.hypot(x2 - x1, y2 - y1),
  } as unknown as WorldData;
}

function addLocalCrowding(wd: WorldData): void {
  const cells = wd.geometry.cells;
  const burgs = wd.world.burgs;
  const additions = [
    { name: 'Local One', x: 5 },
    { name: 'Local Two', x: 10 },
    { name: 'Local Three', x: 15 },
    { name: 'Local Four', x: 18 },
  ];
  for (const [index, addition] of additions.entries()) {
    const cellId = 5 + index;
    cells.push({
      i: cellId,
      p: [addition.x, 0],
      poly: [],
      c: [],
      h: 35,
      t: 2,
      f: 1,
      biome: 4,
      state: 1,
      province: 1,
      culture: 1,
      religion: 1,
      pop: 1,
      burg: 0,
      r: 0,
      temp: 10,
      prec: 20,
    });
    const burg = {
      i: 6 + index,
      name: addition.name,
      cell: cellId,
      x: addition.x,
      y: 0,
      state: 1,
      culture: 1,
      type: 'Village',
      group: 'village',
      capital: false,
      port: false,
      citadel: false,
      walls: false,
      temple: false,
      plaza: true,
      shanty: false,
      population: 500,
      tier: 'village',
      buildings: [],
      landmarks: {},
    };
    burgs.push(burg);
    wd.burgById.set(burg.i, burg);
  }
}

function makePlayer(provisions = 5): PlayerCharacter {
  return {
    id: 'pc',
    name: 'Traveler',
    gender: 'male',
    level: 1,
    xp: 0,
    classId: 'fighter',
    className: 'Fighter',
    speciesId: 'human',
    speciesName: 'Human',
    backgroundId: 'soldier',
    backgroundName: 'Soldier',
    backstoryId: 'duhi_washout',
    backstoryTitle: 'Duhi Troupe Washout',
    guildRank: 'Ember',
    nationalityId: 1,
    nationalityName: 'Test State',
    religionId: 1,
    religionName: 'Test Faith',
    abilityScores: { str: 15, dex: 14, con: 13, int: 12, wis: 10, cha: 8 },
    abilityModifiers: { str: 2, dex: 2, con: 1, int: 1, wis: 0, cha: -1 },
    proficiencyBonus: 2,
    maxHp: 11,
    armorClass: 12,
    speed: 30,
    savingThrows: ['str', 'con'],
    skillProficiencies: ['athletics', 'perception'],
    languages: ['Common'],
    originFeat: 'Savage Attacker',
    levelOneFeatures: ['Second Wind'],
    story: 'Test.',
    powerExplanation: 'Training.',
    minorBonus: { name: 'Bonus', description: 'Test.' },
    inventory: [{ id: 'provisions', name: 'Food provisions', quantity: provisions, category: 'gear' }],
    quests: [],
    reputations: { cultures: [], religions: [] },
    location: { cellId: 0, x: 0, y: 0, stateId: 1, stateName: 'Test State', placeName: 'Origin', reason: 'test' },
    createdAt: { year: 1181, month: 1, day: 1 },
  };
}

const destination: TravelDestination = {
  id: 'dest',
  name: 'Destination',
  detail: 'test place',
  kind: 'burg',
  x: 100,
  y: 0,
  cellId: 2,
  distanceMi: 100,
  landReachable: true,
  boatReachable: false,
};

describe('travel planning', () => {
  it('detects a road route near origin and destination', () => {
    const wd = makeTravelWorld();
    expect(roadRouteFor(wd, { x: 0, y: 0 }, { x: 100, y: 0 })?.group).toBe('roads');
    expect(roadRouteFor(wd, { x: 0, y: 15 }, { x: 100, y: 30 })).toBeNull();
  });

  it('defaults a newly selected destination to the best available travel mode', () => {
    expect(defaultTravelModeFor(destination, true)).toBe('road');
    expect(defaultTravelModeFor(destination, false)).toBe('offroad');
    expect(defaultTravelModeFor({ ...destination, landReachable: false, boatReachable: true }, false)).toBe('boat');
    expect(defaultTravelModeFor({ ...destination, landReachable: true, boatReachable: true }, true)).toBe('road');
  });

  it('applies higher off-road cost for difficult biomes', () => {
    const wd = makeTravelWorld();
    expect(offroadBiomeMultiplier(wd, { x: 0, y: 0 }, { x: 100, y: 0 })).toBeGreaterThan(1.2);
  });

  it('day-only travel can increase elapsed time', () => {
    const continuous = elapsedMinutesForTravel(13 * 60, { hour: 8, minute: 0 }, false);
    const dayOnly = elapsedMinutesForTravel(13 * 60, { hour: 8, minute: 0 }, true);
    expect(continuous).toBe(13 * 60);
    expect(dayOnly).toBeGreaterThan(continuous);
  });

  it('plans provisions and warns when not enough are carried', () => {
    const wd = makeTravelWorld();
    const plan = planTravel(wd, makePlayer(1), destination, 'offroad', true, { hour: 8, minute: 0 });
    expect(plan.provisionsNeeded).toBe(provisionsNeeded(plan.elapsedMinutes));
    expect(plan.insufficientProvisions).toBe(true);
  });

  it('road travel is faster than off-road travel across hard terrain', () => {
    const wd = makeTravelWorld();
    const player = makePlayer();
    const road = planTravel(wd, player, destination, 'road', false, { hour: 8, minute: 0 });
    const offroad = planTravel(wd, player, destination, 'offroad', false, { hour: 8, minute: 0 });
    expect(road.elapsedMinutes).toBeLessThan(offroad.elapsedMinutes);
  });

  it('a heavy pack slows overland travel but not boat passage', () => {
    const wd = makeTravelWorld();
    const light = makePlayer();
    // str 15 -> cap 225; ~200 lb of plate is a heavy but legal load.
    const heavy: PlayerCharacter = {
      ...light,
      inventory: [
        ...light.inventory,
        { id: 'half-plate', name: 'Half plate', quantity: 5, category: 'armor' },
      ],
    };
    const lightRoad = planTravel(wd, light, destination, 'offroad', false, { hour: 8, minute: 0 });
    const heavyRoad = planTravel(wd, heavy, destination, 'offroad', false, { hour: 8, minute: 0 });
    expect(heavyRoad.elapsedMinutes).toBeGreaterThan(lightRoad.elapsedMinutes);
    expect(heavyRoad.paceDetail).toContain('under load');

    const ports = nearbyTravelDestinations(wd, light, 200, 8);
    const islandPort = ports.find((d) => d.boatReachable && !d.landReachable);
    if (islandPort) {
      const lightBoat = planTravel(wd, light, islandPort, 'boat', false, { hour: 8, minute: 0 });
      const heavyBoat = planTravel(wd, heavy, islandPort, 'boat', false, { hour: 8, minute: 0 });
      expect(heavyBoat.elapsedMinutes).toBe(lightBoat.elapsedMinutes);
    }
  });

  it('expands search radius to return at least two reachable destinations when possible', () => {
    const wd = makeTravelWorld();
    const destinations = nearbyTravelDestinations(wd, makePlayer(), 20, 4);
    expect(destinations.length).toBeGreaterThanOrEqual(2);
    expect(destinations.map((d) => d.name)).toContain('Near Town');
    expect(destinations.map((d) => d.name)).toContain('Far Town');
  });

  it('does not offer named geographic regions as travel destinations', () => {
    const wd = makeTravelWorld();
    const destinations = nearbyTravelDestinations(wd, makePlayer(), 75, 8);
    expect(destinations.map((d) => d.name)).not.toContain('Basheva Mountains');
    expect(destinations.every((d) => d.kind === 'burg' || d.kind === 'marker')).toBe(true);
  });

  it('excludes random-encounter markers from destinations but keeps other markers', () => {
    const wd = makeTravelWorld();
    wd.world.markers.push(
      { i: 900, type: 'encounters', icon: '❗', x: 50, y: 2, cell: 1, name: 'Wandering Peril', legend: 'test' },
      { i: 901, type: 'inns', icon: '🍻', x: 52, y: 2, cell: 1, name: 'The Salted Eel', legend: 'test' },
    );
    const destinations = nearbyTravelDestinations(wd, makePlayer(), 75, 8);
    expect(destinations.map((d) => d.name)).not.toContain('Wandering Peril');
    expect(destinations.map((d) => d.name)).toContain('The Salted Eel');
  });

  it('hides land-unreachable non-ports but allows boat travel from port to port', () => {
    const wd = makeTravelWorld();
    const destinations = nearbyTravelDestinations(wd, makePlayer(), 200, 8);
    expect(destinations.map((d) => d.name)).not.toContain('Isolated Island');
    const islandPort = destinations.find((d) => d.name === 'Island Port');
    expect(islandPort?.landReachable).toBe(false);
    expect(islandPort?.boatReachable).toBe(true);
    const plan = planTravel(wd, makePlayer(), islandPort!, 'boat', false, { hour: 8, minute: 0 });
    expect(plan.mode).toBe('boat');
    expect(plan.routeGroup).toBe('searoutes');
  });

  it('uses D&D sailing-ship pace: 2 mph, continuous sailing, boat labels', () => {
    const wd = makeTravelWorld();
    const destinations = nearbyTravelDestinations(wd, makePlayer(), 200, 8);
    const islandPort = destinations.find((d) => d.name === 'Island Port');
    const plan = planTravel(wd, makePlayer(), islandPort!, 'boat', true, { hour: 8, minute: 0 });
    expect(plan.mode).toBe('boat');
    expect(plan.dayOnly).toBe(false);
    expect(plan.paceMph).toBe(2);
    // travelHours is display-rounded to 0.1 h; elapsedMinutes is exact.
    expect(Math.abs(plan.elapsedMinutes - plan.travelHours * 60)).toBeLessThanOrEqual(3);
    expect(plan.activeTravelLabel).toBe('sailing hr');
    expect(plan.paceDetail).toContain('sails day and night');
    expect(plan.paceDetail).toContain('no encounters at sea');
  });

  it('charges a distance-based fare: 10 vosels plus 3 per mile', () => {
    expect(boatFareVosels(0)).toBe(10);
    expect(boatFareVosels(100)).toBe(310);
    const wd = makeTravelWorld();
    const destinations = nearbyTravelDestinations(wd, makePlayer(), 200, 8);
    const islandPort = destinations.find((d) => d.name === 'Island Port');
    const plan = planTravel(wd, makePlayer(), islandPort!, 'boat', false, { hour: 8, minute: 0 });
    expect(plan.fareVosels).toBe(boatFareVosels(islandPort!.distanceMi * 1.25));
    expect(plan.summary).toContain(`fare ${plan.fareVosels} vosels`);
    // Land legs carry no fare.
    const town = destinations.find((d) => d.name === 'Near Town') ?? destinations.find((d) => d.landReachable)!;
    expect(planTravel(wd, makePlayer(), town, 'road', true, { hour: 8, minute: 0 }).fareVosels).toBeUndefined();
  });

  it('lists every other port as a sea-passage destination when at a port', () => {
    const wd = makeTravelWorld();
    const seaDests = seaPortDestinations(wd, makePlayer());
    expect(seaDests.map((d) => d.name)).toContain('Island Port');
    expect(seaDests.every((d) => d.boatReachable)).toBe(true);
    expect(seaDests.every((d, i, arr) => i === 0 || arr[i - 1].distanceMi <= d.distanceMi)).toBe(true);
    // Away from any port there is no sea passage.
    const inland = { ...makePlayer(), location: { ...makePlayer().location, x: 500, y: 500, cellId: 0 } };
    expect(seaPortDestinations(wd, inland)).toEqual([]);
  });

  it('offers boat passage between ports even when a land route exists', () => {
    const wd = makeTravelWorld();
    addLocalCrowding(wd);
    const seaDests = seaPortDestinations(wd, makePlayer());
    expect(seaDests.length).toBeGreaterThan(0);
    for (const dest of seaDests) expect(dest.boatReachable).toBe(true);
  });

  it('lists Oladar as a boat destination from Domasalyesi in the world data', () => {
    const dir = path.resolve(__dirname, '../../public/data');
    const read = (f: string) => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
    const wd = buildWorldData(read('geometry.json'), read('world.json'), read('events.wars.json'));
    const domasalyesi = wd.world.burgs.find((b) => b.name === 'Domasalyesi');
    expect(domasalyesi?.port).toBe(true);
    const player = {
      ...makePlayer(),
      location: {
        cellId: domasalyesi!.cell,
        x: domasalyesi!.x,
        y: domasalyesi!.y,
        stateId: domasalyesi!.state,
        stateName: wd.stateById.get(domasalyesi!.state)?.name ?? 'Test State',
        placeName: domasalyesi!.name,
        reason: 'test',
      },
    };
    const seaDests = seaPortDestinations(wd, player);
    const oladar = seaDests.find((d) => d.name === 'Oladar');
    expect(oladar?.boatReachable).toBe(true);
    expect(oladar?.landReachable).toBe(false);
  });
});
