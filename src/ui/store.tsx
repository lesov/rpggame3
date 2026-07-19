/**
 * Game state: current date, event feed, selection, map options. The reducer
 * is a closure over the loaded WorldData so advancing time can fire scripted
 * and ambient events.
 */
import { createContext, useContext, useMemo, useReducer, type ReactNode, type Dispatch } from 'react';
import {
  type GameDate,
  type GameTime,
  START_DATE,
  START_TIME,
  MINUTES_PER_DAY,
  toOrdinal,
  fromOrdinal,
  addMinutes,
} from '../sim/calendar';
import { fireBetween, ongoingWarsAt, type WorldEvent } from '../sim/events';
import { ambientEventsBetween } from '../sim/ambient';
import type { WorldData } from '../data/worldLoader';
import type { RenderOptions } from '../map/renderer';
import type { PlayerCharacter } from '../player/types';
import { travelDestinationLocation, planTravel, provisionsNeeded, type TravelPlan, type TravelMode, type TravelDestination } from '../player/travel';
import type { CombatState } from '../combat/types';
import { createCombat, initialPendingRoll, potionsRemainingById } from '../combat/engine';
import { generateLoot, type LootItem } from '../combat/loot';
import { getCatalogItem } from '../economy/catalog';
import { addItem } from '../economy/money';
import { shopsForBurg, travellingTraderShop, type Shop } from '../economy/shops';
import { buyItem as buyFromShop, sellItem as sellToShop, equipItem as equipInventory, unequipItem as unequipInventory } from '../economy/transaction';
import { getMonster, defaultOpponentFor } from '../combat/monsters';
import { buildScene } from '../combat/scene';
import { hash } from '../sim/rng';
import { initEconomy, worldTick, weekOf, type EconomyState } from '../trade/economy';
import { rollTravelEncounters } from '../travel/encounter/run';
import { initialPacing, advancePacing, resetPacing, type PacingState } from '../travel/encounter/pacing';
import type { TravelEncounter } from '../travel/encounter/types';
import {
  deliverCourierLetter,
  inspectGuildRuins,
  meetSeminol,
  receiveCourierResponse,
  responseWaitRemainingMinutes,
  speakToSemina,
  startStabilizeQuest,
} from '../quests/progression';

export type Speed = 'hour' | 'day' | 'week';
export const SPEED_MINUTES: Record<Speed, number> = { hour: 60, day: MINUTES_PER_DAY, week: 7 * MINUTES_PER_DAY };

export interface Selection {
  cellId: number;
  x: number;
  y: number;
}

export interface JumpCommand {
  seq: number; // monotonically increasing so MapView can consume each once
  x: number;
  y: number;
  minZoom?: number;
}

export interface EventHighlight {
  id: string;
  x: number;
  y: number;
  radiusWorld: number;
  label: string;
  kind: WorldEvent['kind'];
  anchor?: boolean;
  cellId?: number;
}

export interface TravelTargetPreview {
  id: string;
  name: string;
  kind: TravelDestination['kind'];
  x: number;
  y: number;
  cellId: number;
}

export interface GameState {
  date: GameDate;
  time: GameTime;
  ord: number;
  feed: WorldEvent[]; // newest first
  playing: boolean;
  speed: Speed;
  selection: Selection | null;
  panelTab: 'events' | 'inspector' | 'character' | 'inventory' | 'travel' | 'quests' | 'codex' | 'trade';
  options: RenderOptions;
  jump: JumpCommand | null;
  focus: { x: number; y: number } | null;
  eventHighlight: EventHighlight | null;
  player: PlayerCharacter | null;
  screen: 'map' | 'combat' | 'encounter' | 'shop';
  combat: CombatState | null;
  pacing: PacingState;
  pendingEncounter: PendingEncounter | null;
  travelTarget: TravelTargetPreview | null;
  selectedCodexId: string | null;
  shop: ShopSession | null;
  pendingLoot: PendingLoot | null;
  /** Set once the player discovers their home guild hall burned down. */
  guildHallFire: GuildHallFire | null;
  /** World trade economy — market prices that move as the clock advances. */
  economy: EconomyState;
}

export interface GuildHallFire {
  cellId: number;
  burgId?: number;
  placeName: string;
  date: GameDate;
}

/** An open shopping visit: the vendors present and which one is showing. */
export interface ShopSession {
  vendors: Shop[];
  index: number;
  /** Where the player returns to when they leave the shop. */
  returnScreen: 'map';
}

/** A travel leg the player can pick up again after an encounter resolves. */
export interface EncounterResume {
  destination: TravelDestination;
  mode: TravelMode;
  dayOnly: boolean;
}

export interface PendingEncounter {
  encounter: TravelEncounter;
  resume: EncounterResume;
}

export interface PendingLoot {
  combatSeed: number;
  monsterId: string;
  items: LootItem[];
  claimed: boolean;
}

export type GameAction =
  | { type: 'advance'; minutes: number }
  | { type: 'setPlaying'; playing: boolean }
  | { type: 'setSpeed'; speed: Speed }
  | { type: 'select'; selection: Selection }
  | { type: 'setTab'; tab: GameState['panelTab'] }
  | { type: 'openCodex'; entryId: string }
  | { type: 'setOptions'; options: Partial<RenderOptions> }
  | { type: 'jumpTo'; x: number; y: number; minZoom?: number; selectCell?: number }
  | { type: 'showEventOnMap'; event: WorldEvent }
  | { type: 'setPlayer'; player: PlayerCharacter }
  | { type: 'loadGame'; state: GameState }
  | { type: 'setTravelTarget'; target: TravelTargetPreview | null }
  | { type: 'deliverQuestLetter'; questId: string }
  | { type: 'waitForQuestResponse'; questId: string }
  | { type: 'inspectGuildRuins'; questId: string }
  | { type: 'speakToSemina'; questId: string }
  | { type: 'meetEmgerdas' }
  | { type: 'meetSeminol'; questId: string }
  | { type: 'travel'; plan: TravelPlan }
  | { type: 'resumeTravel' }
  | { type: 'attackEncounter' }
  | { type: 'dismissEncounter' }
  | { type: 'startCombat'; monsterId?: string; seed?: number }
  | { type: 'setCombat'; combat: CombatState }
  | { type: 'claimCombatLoot' }
  | { type: 'leaveCombatLoot' }
  | { type: 'endCombat' }
  | { type: 'openShop'; vendors: Shop[] }
  | { type: 'openTravelShop' }
  | { type: 'switchVendor'; index: number }
  | { type: 'buyItem'; entryIndex: number; qty?: number }
  | { type: 'sellItem'; itemId: string; qty?: number }
  | { type: 'equipItem'; itemId: string }
  | { type: 'unequipItem'; itemId: string }
  | { type: 'closeShop' };

const FEED_CAP = 400;

export function eventLocation(wd: WorldData, e: WorldEvent): { x: number; y: number; cellId?: number } | null {
  if (!e.location) return null;
  if (e.location.burg !== undefined) {
    const b = wd.burgById.get(e.location.burg);
    if (b) return { x: b.x, y: b.y, cellId: b.cell };
  }
  if (e.location.cell !== undefined) {
    const c = wd.geometry.cells[e.location.cell];
    if (c) return { x: c.p[0], y: c.p[1], cellId: c.i };
  }
  if (e.location.x !== undefined && e.location.y !== undefined) return { x: e.location.x, y: e.location.y };
  return null;
}

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

function locatedEventRadius(e: WorldEvent): number {
  const stateCount = e.states?.length ?? 0;
  const byKind: Record<WorldEvent['kind'], number> = {
    weather: 22,
    festival: 24,
    rumor: 26,
    sighting: 28,
    story: 42,
    anchor: 78,
    war: 92,
  };
  const base = byKind[e.kind] ?? 40;
  return clamp(base * (1 + Math.min(stateCount, 6) * 0.16), 18, 170);
}

function stateAreaHighlight(wd: WorldData, e: WorldEvent): EventHighlight | null {
  const stateIds = new Set((e.states ?? []).filter((id) => id > 0));
  if (stateIds.size === 0) return null;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let count = 0;
  for (const cell of wd.geometry.cells) {
    if (!stateIds.has(cell.state)) continue;
    minX = Math.min(minX, cell.p[0]);
    minY = Math.min(minY, cell.p[1]);
    maxX = Math.max(maxX, cell.p[0]);
    maxY = Math.max(maxY, cell.p[1]);
    count++;
  }
  if (count === 0) return null;
  const x = (minX + maxX) / 2;
  const y = (minY + maxY) / 2;
  const diagonal = Math.hypot(maxX - minX, maxY - minY);
  const minRadius = e.kind === 'war' ? 80 : e.anchor ? 70 : 50;
  const maxRadius = Math.min(Math.max(wd.geometry.width, wd.geometry.height) * 0.33, 360);
  return {
    id: e.id,
    x,
    y,
    radiusWorld: clamp(diagonal * 0.52, minRadius, maxRadius),
    label: e.title,
    kind: e.kind,
    anchor: e.anchor,
  };
}

export function eventHighlightFor(wd: WorldData, e: WorldEvent): EventHighlight | null {
  const loc = eventLocation(wd, e);
  if (loc) {
    return {
      id: e.id,
      x: loc.x,
      y: loc.y,
      radiusWorld: locatedEventRadius(e),
      label: e.title,
      kind: e.kind,
      anchor: e.anchor,
      cellId: loc.cellId,
    };
  }
  return stateAreaHighlight(wd, e);
}

/** The vendors a player can visit while standing in a settlement (else []). */
export function settlementVendorsAt(wd: WorldData, player: PlayerCharacter | null): Shop[] {
  if (!player) return [];
  const burg = wd.world.burgs.find((b) => b.cell === player.location.cellId);
  return burg ? shopsForBurg(burg) : [];
}

export function initialState(wd: WorldData): GameState {
  const ord = toOrdinal(START_DATE);
  const feed: WorldEvent[] = [];
  feed.push({
    id: 'game-start',
    ord,
    date: START_DATE,
    title: 'The world as found — 1 January 1181 SE',
    description:
      'Deep winter grips the north of Lepasoul. Six wars smolder across two continents, holy-war sermons rise in the west, and on the far steppe the khanates eye each other. A century has begun; progress time to watch it unfold.',
    kind: 'story',
  });
  // Wars already raging as the game opens.
  for (const w of ongoingWarsAt(wd.wars, START_DATE.year)) {
    if (w.start === START_DATE.year) continue; // will fire naturally this year
    feed.push({
      id: `${w.id}-ongoing`,
      ord,
      date: START_DATE,
      title: `Ongoing: ${w.name}`,
      description: `${wd.stateById.get(w.attacker)?.name ?? '?'} and ${wd.stateById.get(w.defender)?.name ?? '?'} have been at war since ${w.start} SE.`,
      kind: 'war',
      states: [w.attacker, w.defender],
    });
  }
  return {
    date: START_DATE,
    time: START_TIME,
    ord,
    feed,
    playing: false,
    speed: 'day',
    selection: null,
    panelTab: 'events',
    options: { mode: 'biome', showMarkers: true, showRoutes: true, showLabels: true },
    jump: null,
    focus: null,
    eventHighlight: null,
    player: null,
    screen: 'map',
    combat: null,
    pacing: initialPacing,
    pendingEncounter: null,
    travelTarget: null,
    selectedCodexId: null,
    shop: null,
    pendingLoot: null,
    guildHallFire: null,
    economy: initEconomy(wd),
  };
}

/** Build a fresh combat against the given (or biome-appropriate) opponent. */
function beginCombat(
  wd: WorldData,
  player: PlayerCharacter,
  date: GameDate,
  time: GameTime,
  monsterId: string | undefined,
  seed: number,
): CombatState {
  const loc = player.location;
  const scene = buildScene(wd, loc.cellId, loc.x, loc.y, date, time);
  const cell = wd.geometry.cells[loc.cellId];
  const monster = monsterId
    ? getMonster(monsterId)
    : defaultOpponentFor(cell?.biome ?? 4, Boolean(cell?.burg));
  return initialPendingRoll(createCombat(player, monster, scene, seed));
}

function advanceClock(wd: WorldData, state: GameState, minutes: number): GameState {
  const rounded = Math.max(1, Math.round(minutes));
  const next = addMinutes({ date: state.date, time: state.time }, rounded);
  const newOrd = toOrdinal(next.date);
  const scripted = fireBetween(wd.scriptedEvents, state.ord, newOrd);
  const ambient = ambientEventsBetween(state.ord, newOrd, wd.ambientCtx);
  const fired = [...scripted, ...ambient].sort((a, b) => a.ord - b.ord);
  const feed = fired.length > 0 ? [...fired.reverse(), ...state.feed].slice(0, FEED_CAP) : state.feed;
  // Tick the world economy on week boundaries (prices move over time).
  const targetWeek = weekOf(newOrd);
  const economy = targetWeek > state.economy.week ? worldTick(wd, state.economy, targetWeek) : state.economy;
  return { ...state, ord: newOrd, date: fromOrdinal(newOrd), time: next.time, feed, economy };
}

function consumeProvisions(player: PlayerCharacter, amount: number): PlayerCharacter {
  return {
    ...player,
    inventory: player.inventory.map((item) =>
      item.id === 'provisions' ? { ...item, quantity: Math.max(0, item.quantity - amount) } : item,
    ),
  };
}

/**
 * Run one travel leg through the encounter model. Either arrives at the
 * destination (clear) or is interrupted en route: the player stops at the
 * interception point and the leg is stored so it can be resumed after the
 * encounter is dealt with. Hostile actors open combat; peaceful ones open the
 * encounter modal.
 */
function runTravelLeg(wd: WorldData, state: GameState, plan: TravelPlan): GameState {
  const player = state.player;
  if (!player) return state;
  const worldSeed = Number(wd.geometry.seed) || 0;
  const seed = hash(worldSeed, state.ord, minuteOfDayOf(state.time), player.location.cellId, plan.destination.cellId);
  const outcome = rollTravelEncounters({
    wd,
    player,
    plan,
    start: { date: state.date, time: state.time },
    pacing: state.pacing,
    seed,
  });

  if (outcome.kind === 'clear') {
    const advanced = advanceClock(wd, state, plan.elapsedMinutes);
    const location = travelDestinationLocation(wd, plan.destination, plan.summary);
    const movedPlayer = consumeProvisions({ ...player, location }, plan.provisionsNeeded);
    return {
      ...advanced,
      player: movedPlayer,
      pacing: advancePacing(state.pacing, plan.travelHours),
      pendingEncounter: null,
      travelTarget: null,
      screen: 'map',
      jump: { seq: (state.jump?.seq ?? 0) + 1, x: location.x, y: location.y, minZoom: 5 },
      focus: { x: location.x, y: location.y },
      selection: { cellId: location.cellId, x: location.x, y: location.y },
      panelTab: 'travel',
    };
  }

  // Interrupted en route.
  const e = outcome.encounter;
  const advanced = advanceClock(wd, state, e.elapsedMinutes);
  const cell = wd.geometry.cells[e.cellId];
  const stateRec = cell && cell.state > 0 ? wd.stateById.get(cell.state) : undefined;
  const location = {
    cellId: e.cellId,
    x: e.x,
    y: e.y,
    stateId: stateRec?.i ?? 0,
    stateName: stateRec?.fullName ?? stateRec?.name ?? 'the open country',
    placeName: `the road to ${plan.destination.name}`,
    reason: 'a traveller stopped short by what waits on the road',
  };
  const movedPlayer = consumeProvisions({ ...player, location }, provisionsNeeded(e.elapsedMinutes));
  const pendingEncounter: PendingEncounter = {
    encounter: e,
    resume: { destination: plan.destination, mode: plan.mode, dayOnly: plan.dayOnly },
  };
  const base: GameState = {
    ...advanced,
    player: movedPlayer,
    pacing: resetPacing(),
    pendingEncounter,
    travelTarget: null,
    jump: { seq: (state.jump?.seq ?? 0) + 1, x: e.x, y: e.y, minZoom: 6 },
    focus: { x: e.x, y: e.y },
    selection: { cellId: e.cellId, x: e.x, y: e.y },
    panelTab: 'travel',
  };
  if (e.actor.hostile) {
    const combat = beginCombat(wd, movedPlayer, base.date, base.time, e.actor.statblockId, hash(seed, 0x5151));
    return { ...base, screen: 'combat', combat };
  }
  return { ...base, screen: 'encounter' };
}

function minuteOfDayOf(time: GameTime): number {
  return time.hour * 60 + time.minute;
}

export function makeReducer(wd: WorldData) {
  return function reducer(state: GameState, action: GameAction): GameState {
    switch (action.type) {
      case 'advance': {
        return advanceClock(wd, state, action.minutes);
      }
      case 'setPlaying':
        return { ...state, playing: action.playing };
      case 'setSpeed':
        return { ...state, speed: action.speed };
      case 'select':
        return { ...state, selection: action.selection, panelTab: 'inspector', focus: null, eventHighlight: null };
      case 'setTab':
        return {
          ...state,
          panelTab: action.tab,
          focus: action.tab === 'events' || !state.eventHighlight ? state.focus : null,
          eventHighlight: action.tab === 'events' ? state.eventHighlight : null,
        };
      case 'openCodex':
        return { ...state, panelTab: 'codex', selectedCodexId: action.entryId };
      case 'setOptions':
        return { ...state, options: { ...state.options, ...action.options } };
      case 'jumpTo': {
        const jump: JumpCommand = {
          seq: (state.jump?.seq ?? 0) + 1,
          x: action.x,
          y: action.y,
          minZoom: action.minZoom,
        };
        const selection =
          action.selectCell !== undefined
            ? { cellId: action.selectCell, x: action.x, y: action.y }
            : state.selection;
        return {
          ...state,
          jump,
          focus: { x: action.x, y: action.y },
          eventHighlight: null,
          selection,
          panelTab: action.selectCell !== undefined ? 'inspector' : state.panelTab,
        };
      }
      case 'showEventOnMap': {
        const highlight = eventHighlightFor(wd, action.event);
        if (!highlight) return state;
        const jump: JumpCommand = {
          seq: (state.jump?.seq ?? 0) + 1,
          x: highlight.x,
          y: highlight.y,
          minZoom: highlight.radiusWorld > 180 ? 2.2 : highlight.radiusWorld > 90 ? 3.2 : 4.8,
        };
        return {
          ...state,
          jump,
          focus: null,
          eventHighlight: highlight,
          selection: null,
          panelTab: state.panelTab,
        };
      }
      case 'setPlayer': {
        const { location } = action.player;
        const jump: JumpCommand = {
          seq: (state.jump?.seq ?? 0) + 1,
          x: location.x,
          y: location.y,
          minZoom: 6,
        };
        return {
          ...state,
          player: action.player,
          jump,
          focus: { x: location.x, y: location.y },
          eventHighlight: null,
          selection: { cellId: location.cellId, x: location.x, y: location.y },
          travelTarget: null,
          panelTab: 'character',
        };
      }
      case 'loadGame': {
        // Recenter the map on the loaded position (deserialize left jump/focus null).
        const loaded = action.state;
        const loc = loaded.player?.location;
        const jump: JumpCommand | null = loc
          ? { seq: (state.jump?.seq ?? 0) + 1, x: loc.x, y: loc.y, minZoom: 6 }
          : null;
        return { ...loaded, jump, focus: loc ? { x: loc.x, y: loc.y } : null, eventHighlight: null };
      }
      case 'setTravelTarget': {
        const current = state.travelTarget;
        const next = action.target;
        if (
          current?.id === next?.id &&
          current?.name === next?.name &&
          current?.kind === next?.kind &&
          current?.x === next?.x &&
          current?.y === next?.y &&
          current?.cellId === next?.cellId
        ) {
          return state;
        }
        return { ...state, travelTarget: next };
      }
      case 'deliverQuestLetter': {
        if (!state.player) return state;
        const player = deliverCourierLetter(state.player, action.questId, state.date, state.time);
        if (player === state.player) return state;
        return { ...state, player, panelTab: 'quests' };
      }
      case 'waitForQuestResponse': {
        if (!state.player) return state;
        const quest = state.player.quests.find((q) => q.id === action.questId);
        if (!quest) return state;
        const minutes = responseWaitRemainingMinutes(quest, state.date, state.time);
        const advanced = minutes > 0 ? advanceClock(wd, state, minutes) : state;
        const player = receiveCourierResponse(advanced.player ?? state.player, action.questId);
        if (player === (advanced.player ?? state.player)) return advanced;
        return { ...advanced, player, panelTab: 'quests' };
      }
      case 'inspectGuildRuins': {
        if (!state.player) return state;
        const player = inspectGuildRuins(state.player, action.questId);
        if (player === state.player) return state;
        const cellId = state.player.location.cellId;
        const burg = wd.world.burgs.find((b) => b.cell === cellId);
        const placeName = burg?.name ?? state.player.location.placeName;
        const fireEvent: WorldEvent = {
          id: 'guild-hall-fire',
          ord: state.ord,
          date: state.date,
          title: `Fire guts the Adventurers' Guild hall of ${placeName}`,
          description:
            'The hall burned in the night — all at once, witnesses say, and far too hot. ' +
            'Four guild members died in it; only two rooms still stand.',
          kind: 'story',
          location: { cell: cellId, burg: burg?.i },
        };
        return {
          ...state,
          player,
          panelTab: 'quests',
          guildHallFire: state.guildHallFire ?? { cellId, burgId: burg?.i, placeName, date: state.date },
          feed: [fireEvent, ...state.feed],
        };
      }
      case 'speakToSemina': {
        if (!state.player) return state;
        const player = speakToSemina(state.player, action.questId);
        if (player === state.player) return state;
        return { ...state, player, panelTab: 'quests' };
      }
      case 'meetEmgerdas': {
        if (!state.player) return state;
        const player = startStabilizeQuest(state.player, state.date);
        if (player === state.player) return state;
        return { ...state, player, panelTab: 'quests' };
      }
      case 'meetSeminol': {
        if (!state.player) return state;
        const player = meetSeminol(state.player, action.questId);
        if (player === state.player) return state;
        return { ...state, player, panelTab: 'quests' };
      }
      case 'travel': {
        if (!state.player) return state;
        return runTravelLeg(wd, state, action.plan);
      }
      case 'resumeTravel': {
        const pe = state.pendingEncounter;
        if (!state.player || !pe) return { ...state, pendingEncounter: null, screen: 'map' };
        const replan = planTravel(wd, state.player, pe.resume.destination, pe.resume.mode, pe.resume.dayOnly, state.time);
        return runTravelLeg(wd, { ...state, pendingEncounter: null }, replan);
      }
      case 'attackEncounter': {
        const pe = state.pendingEncounter;
        if (!state.player || !pe) return state;
        const seed = hash(state.ord, pe.encounter.cellId, minuteOfDayOf(state.time), 0x0a11ac);
        const combat = beginCombat(wd, state.player, state.date, state.time, pe.encounter.actor.statblockId, seed);
        return { ...state, screen: 'combat', combat };
      }
      case 'dismissEncounter':
        return { ...state, pendingEncounter: null, screen: 'map' };
      case 'startCombat': {
        if (!state.player) return state;
        const seed = action.seed ?? ((Math.random() * 0x7fffffff) | 0);
        const combat = beginCombat(wd, state.player, state.date, state.time, action.monsterId, seed);
        return { ...state, screen: 'combat', combat, pendingLoot: null, playing: false };
      }
      case 'setCombat':
        return { ...state, combat: action.combat };
      case 'claimCombatLoot': {
        if (!state.player || !state.combat || state.combat.outcome !== 'victory') return state;
        const existing = state.pendingLoot?.combatSeed === state.combat.seed ? state.pendingLoot : null;
        if (existing?.claimed) return state;
        const items = existing?.items ?? generateLoot(state.combat.monsterId, state.combat.seed, state.combat.outcome);
        let player = state.player;
        for (const item of items) player = addItem(player, item.id, item.quantity);
        return {
          ...state,
          player,
          pendingLoot: {
            combatSeed: state.combat.seed,
            monsterId: state.combat.monsterId,
            items,
            claimed: true,
          },
        };
      }
      case 'leaveCombatLoot': {
        if (!state.combat) return state;
        const items = state.pendingLoot?.combatSeed === state.combat.seed
          ? state.pendingLoot.items
          : generateLoot(state.combat.monsterId, state.combat.seed, state.combat.outcome);
        return {
          ...state,
          pendingLoot: {
            combatSeed: state.combat.seed,
            monsterId: state.combat.monsterId,
            items,
            claimed: true,
          },
        };
      }
      case 'endCombat': {
        // Persist potions drunk during the fight back to the player's inventory,
        // reconciling each healing-potion grade by its own id.
        let player = state.player;
        if (player && state.combat) {
          const left = potionsRemainingById(state.combat);
          player = {
            ...player,
            inventory: player.inventory
              .map((item) => (getCatalogItem(item.id)?.heal ? { ...item, quantity: left[item.id] ?? 0 } : item))
              .filter((item) => item.quantity > 0),
          };
        }
        return { ...state, screen: 'map', combat: null, player, pendingLoot: null };
      }
      case 'openShop': {
        if (!state.player || action.vendors.length === 0) return state;
        return { ...state, screen: 'shop', shop: { vendors: action.vendors, index: 0, returnScreen: 'map' } };
      }
      case 'openTravelShop': {
        if (!state.player) return state;
        const seed = hash(state.ord, minuteOfDayOf(state.time), state.player.location.cellId, 0x5401);
        const shop = travellingTraderShop(seed);
        // Keep pendingEncounter so the journey can be resumed after trading.
        return { ...state, screen: 'shop', shop: { vendors: [shop], index: 0, returnScreen: 'map' } };
      }
      case 'switchVendor': {
        if (!state.shop) return state;
        const index = Math.max(0, Math.min(action.index, state.shop.vendors.length - 1));
        return { ...state, shop: { ...state.shop, index } };
      }
      case 'buyItem': {
        if (!state.player || !state.shop) return state;
        const vendor = state.shop.vendors[state.shop.index];
        const result = buyFromShop(state.player, vendor, action.entryIndex, action.qty ?? 1);
        if (result.error) return state;
        const vendors = state.shop.vendors.map((v, i) => (i === state.shop!.index ? result.shop : v));
        return { ...state, player: result.player, shop: { ...state.shop, vendors } };
      }
      case 'sellItem': {
        if (!state.player || !state.shop) return state;
        const vendor = state.shop.vendors[state.shop.index];
        const result = sellToShop(state.player, vendor, action.itemId, action.qty ?? 1);
        if (result.error) return state;
        return { ...state, player: result.player };
      }
      case 'equipItem': {
        if (!state.player) return state;
        return { ...state, player: equipInventory(state.player, action.itemId) };
      }
      case 'unequipItem': {
        if (!state.player) return state;
        return { ...state, player: unequipInventory(state.player, action.itemId) };
      }
      case 'closeShop':
        return { ...state, screen: 'map', shop: null };
      default:
        return state;
    }
  };
}

interface GameContextValue {
  state: GameState;
  dispatch: Dispatch<GameAction>;
  wd: WorldData;
}

const GameContext = createContext<GameContextValue | null>(null);

export function GameProvider({ wd, children }: { wd: WorldData; children: ReactNode }) {
  const reducer = useMemo(() => makeReducer(wd), [wd]);
  const [state, dispatch] = useReducer(reducer, wd, initialState);
  const value = useMemo(() => ({ state, dispatch, wd }), [state, dispatch, wd]);
  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGame(): GameContextValue {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame outside GameProvider');
  return ctx;
}
