import { describe, expect, it, beforeAll } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { buildWorldData, type WorldData } from '../data/worldLoader';
import { MINUTES_PER_DAY, START_DATE, START_TIME, toOrdinal } from '../sim/calendar';
import { initialState, makeReducer, settlementVendorsAt } from './store';
import { makeTestCharacter } from '../combat/fixtures';
import { planTravel, type TravelDestination } from '../player/travel';
import { voselsOf, quantityOf } from '../economy/money';

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

  it('opens the codex tab with the selected entry', () => {
    const reducer = makeReducer(wd);
    const next = reducer(initialState(wd), { type: 'openCodex', entryId: 'duhi-troupe' });
    expect(next.panelTab).toBe('codex');
    expect(next.selectedCodexId).toBe('duhi-troupe');
  });

  it('advances the starting courier quest at the capital and grants the response letter after two hours', () => {
    const reducer = makeReducer(wd);
    const pc = makeTestCharacter('fighter');
    const quest = pc.quests[0];
    const originPlayer = {
      ...pc,
      inventory: [
        ...pc.inventory,
        { id: 'sealed-guild-letter', name: 'Sealed guild letter', quantity: 1, category: 'quest' as const },
      ],
    };
    let s = reducer(initialState(wd), { type: 'setPlayer', player: originPlayer });

    const blocked = reducer(s, { type: 'deliverQuestLetter', questId: quest.id });
    expect(blocked.player?.quests[0].phase).toBe('deliver-letter');
    expect(blocked.player?.inventory.some((item) => item.id === 'sealed-guild-letter')).toBe(true);

    const atCapital = {
      ...originPlayer,
      location: quest.destination,
    };
    s = reducer(initialState(wd), { type: 'setPlayer', player: atCapital });
    s = reducer(s, { type: 'deliverQuestLetter', questId: quest.id });
    expect(s.player?.quests[0].phase).toBe('wait-for-response');
    expect(s.player?.quests[0].steps.map((step) => step.status)).toEqual(['completed', 'active', 'pending']);
    expect(s.player?.inventory.some((item) => item.id === 'sealed-guild-letter')).toBe(false);
    expect(s.player?.quests[0].responseReadyAt?.time).toEqual({ hour: 10, minute: 0 });

    s = reducer(s, { type: 'waitForQuestResponse', questId: quest.id });
    expect(s.time).toEqual({ hour: 10, minute: 0 });
    expect(s.player?.quests[0].phase).toBe('return-response');
    expect(s.player?.quests[0].steps.map((step) => step.status)).toEqual(['completed', 'completed', 'active']);
    expect(s.player?.quests[0].responseReadyAt).toBeUndefined();
    expect(s.player?.inventory.find((item) => item.id === 'guild-response-letter')?.note).toContain(quest.origin.placeName);
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
    const withTarget = reducer(withPlayer, {
      type: 'setTravelTarget',
      target: {
        id: destination.id,
        name: destination.name,
        kind: destination.kind,
        x: destination.x,
        y: destination.y,
        cellId: destination.cellId,
      },
    });
    expect(withTarget.travelTarget?.name).toBe(target.name);
    const plan = planTravel(wd, player, destination, 'offroad', false, withPlayer.time);
    const next = reducer(withTarget, { type: 'travel', plan });

    // Either way the clock advances, the player moves, and provisions are eaten.
    expect(next.time).not.toEqual(withPlayer.time);
    expect(next.jump?.seq).toBeGreaterThan(withPlayer.jump?.seq ?? 0);
    expect(next.travelTarget).toBeNull();
    const provisionsLeft = next.player?.inventory.find((i) => i.id === 'provisions')?.quantity ?? 99;
    expect(provisionsLeft).toBeLessThan(99);

    if (next.pendingEncounter) {
      // Interrupted en route: the leg is stored for resumption, and the screen
      // routes to combat (hostile) or the encounter modal (peaceful).
      expect(next.pendingEncounter.resume.destination.cellId).toBe(target.cell);
      expect(['combat', 'encounter']).toContain(next.screen);
      expect(next.pendingEncounter.encounter.atFraction).toBeGreaterThan(0);
      expect(next.player?.location.placeName).toMatch(/road to/);
    } else {
      // Clear leg: arrived at the destination.
      expect(next.player?.location.cellId).toBe(target.cell);
      expect(next.selection?.cellId).toBe(target.cell);
      expect(next.jump?.x).toBe(target.x);
      expect(provisionsLeft).toBe(99 - plan.provisionsNeeded);
    }
  });

  it('resuming an interrupted journey continues toward the same destination', () => {
    const reducer = makeReducer(wd);
    const origin = wd.world.burgs[0];
    const target = wd.world.burgs[1];
    const player = {
      ...makeTestCharacter('fighter'),
      location: {
        cellId: origin.cell, x: origin.x, y: origin.y, stateId: origin.state,
        stateName: wd.stateById.get(origin.state)?.name ?? 'Test', placeName: origin.name, reason: 'test',
      },
      inventory: [{ id: 'provisions', name: 'Food provisions', quantity: 99, category: 'gear' as const }],
    };
    const destination: TravelDestination = {
      id: 'target', name: target.name, detail: 'settlement', kind: 'burg',
      x: target.x, y: target.y, cellId: target.cell,
      distanceMi: wd.distanceMi(origin.x, origin.y, target.x, target.y),
      landReachable: true, boatReachable: false,
    };
    let s = reducer(initialState(wd), { type: 'setPlayer', player });
    const plan = planTravel(wd, player, destination, 'offroad', false, s.time);
    s = reducer(s, { type: 'travel', plan });
    // Drive the journey to completion, resolving each interruption. A hit can
    // land early in a leg, so a dangerous road may take many hops — each one
    // makes strict forward progress, so it always converges.
    for (let guard = 0; guard < 500 && s.pendingEncounter; guard++) {
      s = reducer(s, { type: 'resumeTravel' });
    }
    expect(s.pendingEncounter).toBeNull();
    expect(s.player?.location.cellId).toBe(target.cell);
  });
});

describe('shopping', () => {
  /** A fighter standing inside the first burg, holding 200 vosels. */
  function playerInBurg() {
    const burg = wd.world.burgs[0];
    const pc = makeTestCharacter('fighter');
    return {
      burg,
      player: {
        ...pc,
        inventory: pc.inventory.map((i) => (i.id === 'vosels' ? { ...i, quantity: 200 } : i)),
        location: { ...pc.location, cellId: burg.cell, x: burg.x, y: burg.y, placeName: burg.name },
      },
    };
  }

  it('finds vendors at the player\'s settlement and opens a shop', () => {
    const reducer = makeReducer(wd);
    const { player } = playerInBurg();
    const vendors = settlementVendorsAt(wd, player);
    expect(vendors.length).toBeGreaterThan(0);

    const s = reducer({ ...initialState(wd), player }, { type: 'openShop', vendors });
    expect(s.screen).toBe('shop');
    expect(s.shop?.vendors.length).toBe(vendors.length);
  });

  it('buys an item: vosels drop, item arrives, stock depletes', () => {
    const reducer = makeReducer(wd);
    const { player } = playerInBurg();
    const vendors = settlementVendorsAt(wd, player);
    // Pick a vendor and an affordable stock entry.
    const vIdx = vendors.findIndex((v) => v.stock.some((e) => e.price <= 200 && e.qty > 0));
    const vendor = vendors[vIdx];
    const entryIndex = vendor.stock.findIndex((e) => e.price <= 200 && e.qty > 0);
    const entry = vendor.stock[entryIndex];

    let s = reducer({ ...initialState(wd), player }, { type: 'openShop', vendors });
    s = reducer(s, { type: 'switchVendor', index: vIdx });
    s = reducer(s, { type: 'buyItem', entryIndex, qty: 1 });
    expect(voselsOf(s.player!)).toBe(200 - entry.price);
    expect(quantityOf(s.player!, entry.itemId)).toBeGreaterThanOrEqual(1);
    expect(s.shop!.vendors[vIdx].stock[entryIndex].qty).toBe(entry.qty - 1);
  });

  it('sells provisions for vosels and returns to the map on leave', () => {
    const reducer = makeReducer(wd);
    const { player } = playerInBurg();
    const vendors = settlementVendorsAt(wd, player);
    let s = reducer({ ...initialState(wd), player }, { type: 'openShop', vendors });
    const before = voselsOf(s.player!);
    s = reducer(s, { type: 'sellItem', itemId: 'provisions', qty: 1 });
    expect(voselsOf(s.player!)).toBeGreaterThan(before);
    expect(quantityOf(s.player!, 'provisions')).toBe(4);

    s = reducer(s, { type: 'closeShop' });
    expect(s.screen).toBe('map');
    expect(s.shop).toBeNull();
  });

  it('equips a bought weapon and swaps the equipped slot', () => {
    const reducer = makeReducer(wd);
    const { player } = playerInBurg();
    const withWeapon = {
      ...player,
      inventory: [...player.inventory, { id: 'longsword-fine', name: 'Fine longsword', quantity: 1, category: 'weapon' as const }],
    };
    const s = reducer({ ...initialState(wd), player: withWeapon }, { type: 'equipItem', itemId: 'longsword-fine' });
    expect(s.player!.inventory.find((i) => i.id === 'longsword-fine')!.equipped).toBe(true);
    expect(s.player!.inventory.find((i) => i.id === 'longsword')!.equipped).toBe(false);
  });

  it('opens a travelling trader capped at fine grade', () => {
    const reducer = makeReducer(wd);
    const { player } = playerInBurg();
    const s = reducer({ ...initialState(wd), player }, { type: 'openTravelShop' });
    expect(s.screen).toBe('shop');
    expect(s.shop!.vendors[0].qualityCeiling).toBe('fine');
  });
});
