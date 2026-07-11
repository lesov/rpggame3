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
import { createCombat, initialPendingRoll, potionsRemaining } from '../combat/engine';
import { getMonster, defaultOpponentFor } from '../combat/monsters';
import { buildScene } from '../combat/scene';
import { hash } from '../sim/rng';
import { rollTravelEncounters } from '../travel/encounter/run';
import { initialPacing, advancePacing, resetPacing, type PacingState } from '../travel/encounter/pacing';
import type { TravelEncounter } from '../travel/encounter/types';

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

export interface GameState {
  date: GameDate;
  time: GameTime;
  ord: number;
  feed: WorldEvent[]; // newest first
  playing: boolean;
  speed: Speed;
  selection: Selection | null;
  panelTab: 'events' | 'inspector' | 'character' | 'inventory' | 'travel';
  options: RenderOptions;
  jump: JumpCommand | null;
  focus: { x: number; y: number } | null;
  player: PlayerCharacter | null;
  screen: 'map' | 'combat' | 'encounter';
  combat: CombatState | null;
  pacing: PacingState;
  pendingEncounter: PendingEncounter | null;
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

export type GameAction =
  | { type: 'advance'; minutes: number }
  | { type: 'setPlaying'; playing: boolean }
  | { type: 'setSpeed'; speed: Speed }
  | { type: 'select'; selection: Selection }
  | { type: 'setTab'; tab: GameState['panelTab'] }
  | { type: 'setOptions'; options: Partial<RenderOptions> }
  | { type: 'jumpTo'; x: number; y: number; minZoom?: number; selectCell?: number }
  | { type: 'setPlayer'; player: PlayerCharacter }
  | { type: 'travel'; plan: TravelPlan }
  | { type: 'resumeTravel' }
  | { type: 'attackEncounter' }
  | { type: 'dismissEncounter' }
  | { type: 'startCombat'; monsterId?: string; seed?: number }
  | { type: 'setCombat'; combat: CombatState }
  | { type: 'endCombat' };

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
    player: null,
    screen: 'map',
    combat: null,
    pacing: initialPacing,
    pendingEncounter: null,
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
  return { ...state, ord: newOrd, date: fromOrdinal(newOrd), time: next.time, feed };
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
        return { ...state, selection: action.selection, panelTab: 'inspector', focus: null };
      case 'setTab':
        return { ...state, panelTab: action.tab };
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
          selection,
          panelTab: action.selectCell !== undefined ? 'inspector' : state.panelTab,
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
          selection: { cellId: location.cellId, x: location.x, y: location.y },
          panelTab: 'character',
        };
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
        return { ...state, screen: 'combat', combat, playing: false };
      }
      case 'setCombat':
        return { ...state, combat: action.combat };
      case 'endCombat': {
        // Persist potions drunk during the fight back to the player's inventory.
        let player = state.player;
        if (player && state.combat) {
          const left = potionsRemaining(state.combat);
          player = {
            ...player,
            inventory: player.inventory.map((item) =>
              item.id === 'healing-potion' ? { ...item, quantity: left } : item,
            ),
          };
        }
        return { ...state, screen: 'map', combat: null, player };
      }
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
