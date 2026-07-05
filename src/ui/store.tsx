/**
 * Game state: current date, event feed, selection, map options. The reducer
 * is a closure over the loaded WorldData so advancing time can fire scripted
 * and ambient events.
 */
import { createContext, useContext, useMemo, useReducer, type ReactNode, type Dispatch } from 'react';
import { type GameDate, START_DATE, toOrdinal, fromOrdinal } from '../sim/calendar';
import { fireBetween, ongoingWarsAt, type WorldEvent } from '../sim/events';
import { ambientEventsBetween } from '../sim/ambient';
import type { WorldData } from '../data/worldLoader';
import type { RenderOptions } from '../map/renderer';

export type Speed = 'day' | 'week' | 'month';
export const SPEED_DAYS: Record<Speed, number> = { day: 1, week: 7, month: 30 };

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
  ord: number;
  feed: WorldEvent[]; // newest first
  playing: boolean;
  speed: Speed;
  selection: Selection | null;
  panelTab: 'events' | 'inspector';
  options: RenderOptions;
  jump: JumpCommand | null;
  focus: { x: number; y: number } | null;
}

export type GameAction =
  | { type: 'advance'; days: number }
  | { type: 'setPlaying'; playing: boolean }
  | { type: 'setSpeed'; speed: Speed }
  | { type: 'select'; selection: Selection }
  | { type: 'setTab'; tab: GameState['panelTab'] }
  | { type: 'setOptions'; options: Partial<RenderOptions> }
  | { type: 'jumpTo'; x: number; y: number; minZoom?: number; selectCell?: number };

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
    ord,
    feed,
    playing: false,
    speed: 'day',
    selection: null,
    panelTab: 'events',
    options: { mode: 'biome', showMarkers: true, showRoutes: true, showLabels: true },
    jump: null,
    focus: null,
  };
}

export function makeReducer(wd: WorldData) {
  return function reducer(state: GameState, action: GameAction): GameState {
    switch (action.type) {
      case 'advance': {
        const newOrd = state.ord + Math.max(1, Math.round(action.days));
        const scripted = fireBetween(wd.scriptedEvents, state.ord, newOrd);
        const ambient = ambientEventsBetween(state.ord, newOrd, wd.ambientCtx);
        const fired = [...scripted, ...ambient].sort((a, b) => a.ord - b.ord);
        const feed = fired.length > 0 ? [...fired.reverse(), ...state.feed].slice(0, FEED_CAP) : state.feed;
        return { ...state, ord: newOrd, date: fromOrdinal(newOrd), feed };
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
