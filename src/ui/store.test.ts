import { describe, expect, it, beforeAll } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { buildWorldData, type WorldData } from '../data/worldLoader';
import { MINUTES_PER_DAY, START_DATE, START_TIME, toOrdinal } from '../sim/calendar';
import type { WorldEvent } from '../sim/events';
import { eventHighlightFor, initialState, isBanditTollActor, makeReducer, settlementVendorsAt } from './store';
import { makeTestCharacter } from '../combat/fixtures';
import { generateLoot } from '../combat/loot';
import { planTravel, seaPortDestinations, type TravelDestination } from '../player/travel';
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

  it('builds event highlights for local, anchor, and state-scope events', () => {
    const burg = wd.world.burgs[0];
    const local: WorldEvent = {
      id: 'test-local-event',
      ord: 1,
      date: START_DATE,
      title: 'Local trouble',
      kind: 'story',
      location: { burg: burg.i },
    };
    const anchor: WorldEvent = { ...local, id: 'test-anchor-event', kind: 'anchor', anchor: true, title: 'Era trouble' };
    const states = [...new Set(wd.world.burgs.map((b) => b.state).filter((id) => id > 0))].slice(0, 2);
    const war: WorldEvent = {
      id: 'test-war-event',
      ord: 2,
      date: START_DATE,
      title: 'Border war',
      kind: 'war',
      states,
    };

    const localHighlight = eventHighlightFor(wd, local)!;
    const anchorHighlight = eventHighlightFor(wd, anchor)!;
    const warHighlight = eventHighlightFor(wd, war)!;

    expect(localHighlight.x).toBe(burg.x);
    expect(localHighlight.y).toBe(burg.y);
    expect(anchorHighlight.radiusWorld).toBeGreaterThan(localHighlight.radiusWorld);
    expect(warHighlight.radiusWorld).toBeGreaterThan(anchorHighlight.radiusWorld);
    expect(warHighlight.kind).toBe('war');
  });

  it('showEventOnMap jumps to the event and stores a map highlight', () => {
    const reducer = makeReducer(wd);
    const burg = wd.world.burgs[0];
    const event: WorldEvent = {
      id: 'test-clicked-event',
      ord: 1,
      date: START_DATE,
      title: 'Clicked event',
      kind: 'story',
      location: { burg: burg.i },
    };
    const next = reducer(initialState(wd), { type: 'showEventOnMap', event });
    expect(next.eventHighlight?.id).toBe(event.id);
    expect(next.eventHighlight?.radiusWorld).toBeGreaterThan(0);
    expect(next.jump?.x).toBe(burg.x);
    expect(next.jump?.y).toBe(burg.y);
    expect(next.focus).toBeNull();
    expect(next.selection).toBeNull();
    expect(next.panelTab).toBe('events');
  });

  it('clears event highlights when leaving the World events tab', () => {
    const reducer = makeReducer(wd);
    const burg = wd.world.burgs[0];
    const event: WorldEvent = {
      id: 'test-tab-clear-event',
      ord: 1,
      date: START_DATE,
      title: 'Clicked event',
      kind: 'story',
      location: { burg: burg.i },
    };
    let state = reducer({ ...initialState(wd), panelTab: 'events' }, { type: 'showEventOnMap', event });
    expect(state.eventHighlight?.id).toBe(event.id);
    expect(state.focus).toBeNull();
    expect(state.selection).toBeNull();

    state = reducer({ ...state, focus: { x: burg.x, y: burg.y } }, { type: 'setTab', tab: 'inventory' });
    expect(state.eventHighlight).toBeNull();
    expect(state.focus).toBeNull();
    expect(state.selection).toBeNull();
  });

  it('showEventOnMap ignores events with no map target', () => {
    const reducer = makeReducer(wd);
    const state = initialState(wd);
    const event: WorldEvent = {
      id: 'test-locationless-event',
      ord: 1,
      date: START_DATE,
      title: 'No place',
      kind: 'story',
    };
    expect(eventHighlightFor(wd, event)).toBeNull();
    expect(reducer(state, { type: 'showEventOnMap', event })).toBe(state);
  });

  it('setting a newly created player keeps normal map gameplay instead of starting combat', () => {
    const reducer = makeReducer(wd);
    const next = reducer(initialState(wd), { type: 'setPlayer', player: makeTestCharacter('fighter') });
    expect(next.screen).toBe('map');
    expect(next.combat).toBeNull();
    expect(next.player?.name).toBe('Testovar');
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

  it('sails port to port for a fare with no encounters, and blocks unpaid passage', () => {
    const reducer = makeReducer(wd);
    const domasalyesi = wd.world.burgs.find((b) => b.name === 'Domasalyesi')!;
    const atPort = {
      ...makeTestCharacter('fighter'),
      location: {
        cellId: domasalyesi.cell,
        x: domasalyesi.x,
        y: domasalyesi.y,
        stateId: domasalyesi.state,
        stateName: 'Test State',
        placeName: domasalyesi.name,
        reason: 'test',
      },
    };
    const seaDests = seaPortDestinations(wd, atPort);
    const oladar = seaDests.find((d) => d.name === 'Oladar')!;
    const plan = planTravel(wd, atPort, oladar, 'boat', false, START_TIME);
    expect(plan.mode).toBe('boat');
    expect(plan.fareVosels).toBeGreaterThanOrEqual(10);

    const withVosels = (p: typeof atPort, n: number) => ({
      ...p,
      inventory: p.inventory.map((it) => (it.id === 'vosels' ? { ...it, quantity: n } : it)),
    });

    // Rich traveler: fare deducted, arrives, never intercepted.
    const rich = withVosels(atPort, plan.fareVosels! + 25);
    let s = reducer(initialState(wd), { type: 'setPlayer', player: rich });
    s = reducer(s, { type: 'travel', plan });
    expect(s.pendingEncounter).toBeNull();
    expect(s.screen).toBe('map');
    expect(s.player?.location.placeName).toBe('Oladar');
    expect(voselsOf(s.player!)).toBe(25);

    // Poor traveler: nothing happens.
    const poor = withVosels(atPort, 5);
    const before = reducer(initialState(wd), { type: 'setPlayer', player: poor });
    expect(reducer(before, { type: 'travel', plan })).toBe(before);
  });

  function banditTollState(
    vosels: number,
    mods: Partial<ReturnType<typeof makeTestCharacter>['abilityModifiers']> = {},
    actor: { kind: 'brigand' | 'traveler' | 'merchant'; statblockId: string } = { kind: 'brigand', statblockId: 'bandit' },
  ) {
    const origin = wd.world.burgs[0];
    const target = wd.world.burgs[1];
    const pc = makeTestCharacter('fighter');
    const player = {
      ...pc,
      abilityModifiers: { ...pc.abilityModifiers, ...mods },
      inventory: pc.inventory.map((it) => (it.id === 'vosels' ? { ...it, quantity: vosels } : it)),
      location: {
        cellId: origin.cell,
        x: origin.x,
        y: origin.y,
        stateId: origin.state,
        stateName: wd.stateById.get(origin.state)?.name ?? 'Test',
        placeName: `the road to ${target.name}`,
        reason: 'stopped by brigands',
      },
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
    return {
      ...initialState(wd),
      player,
      screen: 'encounter' as const,
      pendingEncounter: {
        encounter: {
          atFraction: 0.35,
          elapsedMinutes: 90,
          x: origin.x + 4,
          y: origin.y + 4,
          cellId: origin.cell,
          actor: { kind: actor.kind, hostile: true, statblockId: actor.statblockId, descriptor: 'bandits demand coin' },
          lambda: 0.2,
          hostileChance: 0.85,
          date: START_DATE,
        },
        resume: { destination, mode: 'road' as const, dayOnly: true },
      },
    };
  }

  it('lets the player pay every vosel to satisfy hostile brigands', () => {
    const reducer = makeReducer(wd);
    const s = reducer(banditTollState(37), { type: 'payBanditToll' });
    expect(voselsOf(s.player!)).toBe(0);
    expect(s.screen).toBe('encounter');
    expect(s.pendingEncounter).not.toBeNull();
    expect(s.encounterToll).toMatchObject({ method: 'pay-all', demandedVosels: 37, paidVosels: 37, success: true });
  });

  it('treats hostile road bandit statblocks as toll encounters even when the actor kind is traveler', () => {
    const reducer = makeReducer(wd);
    const before = banditTollState(25, {}, { kind: 'traveler', statblockId: 'bandit' });
    const paid = reducer(before, { type: 'payBanditToll' });
    expect(paid.screen).toBe('encounter');
    expect(paid.combat).toBeNull();
    expect(voselsOf(paid.player!)).toBe(0);
    expect(paid.encounterToll).toMatchObject({ method: 'pay-all', demandedVosels: 25, paidVosels: 25, success: true });
  });

  it('classifies the road-thin bandit statblock as toll-eligible outside brigand actor kind', () => {
    expect(isBanditTollActor({
      kind: 'traveler',
      hostile: true,
      statblockId: 'bandit',
      descriptor: 'a road-thin man in a patched gambeson, scimitar notched from old work, eyes doing arithmetic on your belongings',
    })).toBe(true);
    expect(isBanditTollActor({
      kind: 'traveler',
      hostile: true,
      statblockId: 'thug',
      descriptor: 'a hard-eyed traveler',
    })).toBe(false);
  });

  it('lets a strong Persuasion check pay half and avoid battle', () => {
    const reducer = makeReducer(wd);
    const pending = reducer(banditTollState(41, { cha: 30 }), { type: 'attemptBanditTollSkill', method: 'persuasion' });
    expect(voselsOf(pending.player!)).toBe(41);
    expect(pending.encounterToll).toMatchObject({ method: 'persuasion', demandedVosels: 41, paidVosels: 0, success: false, pending: true });

    const s = reducer(pending, { type: 'rollBanditTollSkill' });
    expect(voselsOf(s.player!)).toBe(20);
    expect(s.screen).toBe('encounter');
    expect(s.combat).toBeNull();
    expect(s.encounterToll?.success).toBe(true);
    expect(s.encounterToll?.paidVosels).toBe(21);
    expect(s.encounterToll?.roll?.label).toContain('Persuasion');
  });

  it('lets a strong Sleight of Hand check hide half the purse', () => {
    const reducer = makeReducer(wd);
    const pending = reducer(banditTollState(40, { dex: 30 }), { type: 'attemptBanditTollSkill', method: 'sleightOfHand' });
    expect(voselsOf(pending.player!)).toBe(40);
    expect(pending.encounterToll).toMatchObject({ method: 'sleightOfHand', pending: true });

    const s = reducer(pending, { type: 'rollBanditTollSkill' });
    expect(voselsOf(s.player!)).toBe(20);
    expect(s.screen).toBe('encounter');
    expect(s.encounterToll?.success).toBe(true);
    expect(s.encounterToll?.paidVosels).toBe(20);
    expect(s.encounterToll?.roll?.label).toContain('Sleight of Hand');
  });

  it('starts combat when the bandit toll skill check fails', () => {
    const reducer = makeReducer(wd);
    const pending = reducer(banditTollState(40, { cha: -20 }), { type: 'attemptBanditTollSkill', method: 'persuasion' });
    const failed = reducer(pending, { type: 'rollBanditTollSkill' });
    expect(voselsOf(failed.player!)).toBe(40);
    expect(failed.screen).toBe('encounter');
    expect(failed.combat).toBeNull();
    expect(failed.encounterToll?.success).toBe(false);
    expect(failed.encounterToll?.roll?.vs?.success).toBe(false);

    const s = reducer(failed, { type: 'attackEncounter' });
    expect(s.screen).toBe('combat');
    expect(s.combat?.monsterId).toBe('bandit');
  });

  it('does not resolve the bandit toll when the player has no coin', () => {
    const reducer = makeReducer(wd);
    const before = banditTollState(0);
    expect(reducer(before, { type: 'payBanditToll' })).toBe(before);
    expect(reducer(before, { type: 'attemptBanditTollSkill', method: 'sleightOfHand' })).toBe(before);
  });

  it('runs the burned-hall aftermath: fire state, feed entry, completion, and the stabilize quest', () => {
    const reducer = makeReducer(wd);
    const pc = makeTestCharacter('fighter');
    const quest = pc.quests[0];
    let s = reducer(initialState(wd), {
      type: 'setPlayer',
      player: {
        ...pc,
        location: quest.destination,
        inventory: [
          ...pc.inventory,
          { id: 'sealed-guild-letter', name: 'Sealed guild letter', quantity: 1, category: 'quest' as const },
        ],
      },
    });
    s = reducer(s, { type: 'deliverQuestLetter', questId: quest.id });
    s = reducer(s, { type: 'waitForQuestResponse', questId: quest.id });

    // Blocked until the player is back at the origin.
    expect(reducer(s, { type: 'inspectGuildRuins', questId: quest.id })).toBe(s);

    s = { ...s, player: { ...s.player!, location: quest.origin } };
    s = reducer(s, { type: 'inspectGuildRuins', questId: quest.id });
    expect(s.player?.quests[0].phase).toBe('ruins-inspected');
    expect(s.guildHallFire).not.toBeNull();
    expect(s.guildHallFire?.cellId).toBe(quest.origin.cellId);
    expect(s.feed[0].id).toBe('guild-hall-fire');
    expect(s.feed[0].title).toContain(s.guildHallFire!.placeName);

    s = reducer(s, { type: 'speakToSemina', questId: quest.id });
    expect(s.player?.quests[0].status).toBe('completed');

    s = reducer(s, { type: 'meetEmgerdas' });
    const stabilize = s.player?.quests.find((q) => q.id === 'stabilize-guild-branch');
    expect(stabilize?.status).toBe('active');
    expect(stabilize?.phase).toBe('seminol-arriving');

    s = reducer(s, { type: 'meetSeminol', questId: 'stabilize-guild-branch' });
    expect(s.player?.quests.find((q) => q.id === 'stabilize-guild-branch')?.phase).toBeUndefined();
  });

  it('claims victory loot once and adds it to inventory', () => {
    const reducer = makeReducer(wd);
    const player = makeTestCharacter('fighter');
    const seed = Array.from({ length: 80 }, (_, i) => i + 1).find((n) => generateLoot('bandit', n, 'victory').length > 0)!;
    let s = reducer(initialState(wd), { type: 'setPlayer', player });
    s = reducer(s, { type: 'startCombat', monsterId: 'bandit', seed });
    s = reducer(s, { type: 'setCombat', combat: { ...s.combat!, outcome: 'victory', phase: 'ended' } });
    const loot = generateLoot('bandit', seed, 'victory');
    expect(loot.length).toBeGreaterThan(0);

    s = reducer(s, { type: 'claimCombatLoot' });
    for (const item of loot) {
      expect(quantityOf(s.player!, item.id)).toBeGreaterThanOrEqual(item.quantity);
    }
    const afterFirstClaim = s.player!.inventory.map((item) => [item.id, item.quantity]);

    s = reducer(s, { type: 'claimCombatLoot' });
    expect(s.player!.inventory.map((item) => [item.id, item.quantity])).toEqual(afterFirstClaim);

    s = reducer(s, { type: 'endCombat' });
    expect(s.pendingLoot).toBeNull();
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
