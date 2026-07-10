import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { buildWorldData, type WorldData } from '../../data/worldLoader';
import { makeTestCharacter } from '../../combat/fixtures';
import type { PlayerCharacter } from '../../player/types';
import type { TravelPlan, TravelDestination } from '../../player/travel';
import { START_DATE_TIME } from '../../sim/calendar';
import { initialPacing } from './pacing';
import { rollTravelEncounters, legDangerRead, stepCount, type EncounterInput } from './run';

let wd: WorldData;

beforeAll(() => {
  const dir = path.resolve(__dirname, '../../../public/data');
  const read = (f: string) => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
  wd = buildWorldData(read('geometry.json'), read('world.json'), read('events.wars.json'));
});

function player(): PlayerCharacter {
  const pc = makeTestCharacter('fighter');
  const cell = wd.geometry.cells[5000];
  return { ...pc, location: { ...pc.location, cellId: cell.i, x: cell.p[0], y: cell.p[1] } };
}

function destination(): TravelDestination {
  const cell = wd.geometry.cells[8000];
  return {
    id: 'dest', name: 'Test destination', detail: '', kind: 'burg',
    x: cell.p[0], y: cell.p[1], cellId: cell.i,
    distanceMi: 100, landReachable: true, boatReachable: false,
  };
}

function plan(over: Partial<TravelPlan> = {}): TravelPlan {
  return {
    destination: destination(),
    mode: 'offroad', dayOnly: false, routeGroup: undefined, roadAvailable: false,
    distanceMi: 100, paceMph: 2, paceLabel: '', paceDetail: '', activeTravelLabel: 'walking hr',
    biomeMultiplier: 1.2, travelHours: 50, elapsedMinutes: 50 * 60,
    provisionsNeeded: 3, provisionsAvailable: 5, insufficientProvisions: false, summary: '',
    ...over,
  };
}

function input(over: Partial<EncounterInput> = {}): EncounterInput {
  return { wd, player: player(), plan: plan(), start: START_DATE_TIME, pacing: initialPacing, seed: 1, ...over };
}

describe('rollTravelEncounters', () => {
  it('is deterministic in (seed, pacing, world, plan)', () => {
    const a = rollTravelEncounters(input({ seed: 42 }));
    const b = rollTravelEncounters(input({ seed: 42 }));
    expect(a).toEqual(b);
  });

  it('a long, exposed leg reliably produces an encounter across seeds', () => {
    const longLeg = plan({ travelHours: 300, elapsedMinutes: 300 * 60 });
    for (const seed of [1, 7, 99, 12345]) {
      const out = rollTravelEncounters(input({ seed, plan: longLeg }));
      expect(out.kind).toBe('encounter');
    }
  });

  it('a near-instant hop almost never triggers', () => {
    const hop = plan({ travelHours: 0.05, elapsedMinutes: 3 });
    const seeds = Array.from({ length: 30 }, (_, i) => i * 97 + 3);
    const clears = seeds.filter((seed) => rollTravelEncounters(input({ seed, plan: hop })).kind === 'clear');
    expect(clears.length / seeds.length).toBeGreaterThan(0.75);
  });

  it('an encounter carries a valid interception and a resolved actor', () => {
    const longLeg = plan({ travelHours: 300, elapsedMinutes: 300 * 60 });
    const out = rollTravelEncounters(input({ seed: 3, plan: longLeg }));
    expect(out.kind).toBe('encounter');
    if (out.kind !== 'encounter') return;
    const e = out.encounter;
    expect(e.atFraction).toBeGreaterThan(0);
    expect(e.atFraction).toBeLessThanOrEqual(1);
    expect(e.elapsedMinutes).toBeGreaterThan(0);
    expect(e.elapsedMinutes).toBeLessThanOrEqual(longLeg.elapsedMinutes);
    expect(e.actor.descriptor.length).toBeGreaterThan(0);
    // hostile actors carry a statblock, peaceful ones do not
    expect(e.actor.hostile ? e.actor.monsterId : e.actor.monsterId === undefined).toBeTruthy();
  });

  it('a rising pity timer makes an encounter no less likely than a fresh one', () => {
    // With a warmed pity timer the effective rate is higher, so over many seeds
    // the encounter share should not drop.
    const leg = plan({ travelHours: 8, elapsedMinutes: 8 * 60 });
    const seeds = Array.from({ length: 60 }, (_, i) => i * 101 + 5);
    const fresh = seeds.filter((s) => rollTravelEncounters(input({ seed: s, plan: leg, pacing: { hoursSinceEncounter: 0 } })).kind === 'encounter').length;
    const warmed = seeds.filter((s) => rollTravelEncounters(input({ seed: s, plan: leg, pacing: { hoursSinceEncounter: 40 } })).kind === 'encounter').length;
    expect(warmed).toBeGreaterThanOrEqual(fresh);
  });
});

describe('legDangerRead', () => {
  it('returns a probability in [0,1) and a legible dominant driver', () => {
    // A short leg stays strictly below certainty (a 50h trek underflows to 1.0,
    // which is correct — near-certain — but useless for a range check).
    const read = legDangerRead(input({ plan: plan({ travelHours: 3, elapsedMinutes: 180 }) }));
    expect(read.chance).toBeGreaterThanOrEqual(0);
    expect(read.chance).toBeLessThan(1);
    expect(typeof read.dominant).toBe('string');
  });
  it('a longer leg reads as more dangerous than a short one', () => {
    const shortRead = legDangerRead(input({ plan: plan({ travelHours: 2, elapsedMinutes: 120 }) }));
    const longRead = legDangerRead(input({ plan: plan({ travelHours: 80, elapsedMinutes: 80 * 60 }) }));
    expect(longRead.chance).toBeGreaterThan(shortRead.chance);
  });
});

describe('stepCount', () => {
  it('is bounded between 4 and 40 and scales with hours', () => {
    expect(stepCount(plan({ travelHours: 0.1 }))).toBe(4);
    expect(stepCount(plan({ travelHours: 1000 }))).toBe(40);
    expect(stepCount(plan({ travelHours: 10 }))).toBe(10);
  });
});
