import { describe, expect, it, beforeAll } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { buildWorldData, type WorldData } from '../data/worldLoader';
import { MINUTES_PER_DAY, START_DATE, START_TIME, toOrdinal } from '../sim/calendar';
import { initialState, makeReducer } from './store';
import { makeTestCharacter } from '../combat/fixtures';
import { planTravel, type TravelDestination } from '../player/travel';

let wd: WorldData;

beforeAll(() => {
  const dir = path.resolve(__dirname, '../../public/data');
  const read = (f: string) => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
  wd = buildWorldData(read('geometry.json'), read('world.json'), read('events.wars.json'));
});

describe('game clock state', () => {
  it('starts at the configured date and 24-hour clock time', () => {
    const state = initialState(wd);
    expect(state.date).toEqual(START_DATE);
    expect(state.time).toEqual(START_TIME);
    expect(state.ord).toBe(toOrdinal(START_DATE));
  });

  it('advances within a day without changing day ordinal or firing day events', () => {
    const reducer = makeReducer(wd);
    const state = initialState(wd);
    const next = reducer(state, { type: 'advance', minutes: 90 });
    expect(next.date).toEqual(state.date);
    expect(next.ord).toBe(state.ord);
    expect(next.time).toEqual({ hour: 9, minute: 30 });
    expect(next.feed).toBe(state.feed);
  });

  it('rolls over midnight and updates the day ordinal', () => {
    const reducer = makeReducer(wd);
    const state = initialState(wd);
    const next = reducer(state, { type: 'advance', minutes: 16 * 60 });
    expect(next.date).toEqual({ year: 1181, month: 1, day: 2 });
    expect(next.ord).toBe(state.ord + 1);
    expect(next.time).toEqual({ hour: 0, minute: 0 });
  });

  it('keeps week jumps aligned to the current clock time', () => {
    const reducer = makeReducer(wd);
    const state = initialState(wd);
    const next = reducer(state, { type: 'advance', minutes: 7 * MINUTES_PER_DAY });
    expect(next.date).toEqual({ year: 1181, month: 1, day: 8 });
    expect(next.ord).toBe(state.ord + 7);
    expect(next.time).toEqual(START_TIME);
  });

  it('commits travel by advancing time, moving the player, and consuming provisions', () => {
    const reducer = makeReducer(wd);
    const origin = wd.world.burgs[0];
    const target = wd.world.burgs[1];
    const player = {
      ...makeTestCharacter('fighter'),
      location: {
        cellId: origin.cell,
        x: origin.x,
        y: origin.y,
        stateId: origin.state,
        stateName: wd.stateById.get(origin.state)?.name ?? 'Test',
        placeName: origin.name,
        reason: 'test',
      },
      inventory: [{ id: 'provisions', name: 'Food provisions', quantity: 99, category: 'gear' as const }],
    };
    const destination: TravelDestination = {
      id: 'target',
      name: target.name,
      detail: 'settlement',
      kind: 'burg',
      x: target.x,
      y: target.y,
      cellId: target.cell,
      distanceMi: wd.distanceMi(origin.x, origin.y, target.x, target.y),
      landReachable: true,
      boatReachable: false,
    };
    const withPlayer = reducer(initialState(wd), { type: 'setPlayer', player });
    const plan = planTravel(wd, player, destination, 'offroad', false, withPlayer.time);
    const next = reducer(withPlayer, { type: 'travel', plan });
    expect(next.player?.location.cellId).toBe(target.cell);
    expect(next.selection?.cellId).toBe(target.cell);
    expect(next.jump?.x).toBe(target.x);
    expect(next.player?.inventory.find((item) => item.id === 'provisions')?.quantity).toBe(99 - plan.provisionsNeeded);
    expect(next.time).not.toEqual(withPlayer.time);
  });
});
