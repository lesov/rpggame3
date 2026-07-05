/**
 * World events. Two scripted sources — the hand-authored campaign-bible
 * timeline and the wars extracted from the map's state campaigns — merge
 * into one ordered stream; ambient events (ambient.ts) are generated on the
 * fly per day. Advancing time fires every event in (prevOrd, newOrd].
 */
import { type GameDate, fromOrdinal, toOrdinal } from './calendar';
import { hash } from './rng';

export type EventKind =
  | 'anchor' // era-defining scripted moments
  | 'story' // flavored scripted events
  | 'war'
  | 'weather'
  | 'festival'
  | 'rumor'
  | 'sighting';

export interface EventLocation {
  burg?: number;
  cell?: number;
  x?: number;
  y?: number;
}

export interface WorldEvent {
  id: string;
  ord: number;
  date: GameDate;
  title: string;
  description?: string;
  kind: EventKind;
  anchor?: boolean;
  location?: EventLocation;
  states?: number[];
}

/** Shape of data/events.timeline.json entries. */
export interface TimelineEntry {
  id: string;
  year: number;
  month: number;
  day: number;
  title: string;
  description: string;
  kind?: 'anchor' | 'story';
  burg?: number;
  cell?: number;
  states?: number[];
}

export interface WarEntry {
  id: string;
  name: string;
  start: number;
  end: number | null;
  attacker: number;
  defender: number;
}

/** Deterministic pseudo-date within a year for events that only have a year. */
function dateInYear(year: number, seed: number): GameDate {
  const doy = 60 + (hash(seed, year) % 245); // Mar..Oct, campaign season
  return fromOrdinal(toOrdinal({ year, month: 1, day: 1 }) + doy);
}

export function buildScriptedEvents(
  timeline: TimelineEntry[],
  wars: WarEntry[],
  stateName: (id: number) => string,
): WorldEvent[] {
  const events: WorldEvent[] = [];

  for (const e of timeline) {
    const date: GameDate = { year: e.year, month: e.month, day: e.day };
    events.push({
      id: e.id,
      ord: toOrdinal(date),
      date,
      title: e.title,
      description: e.description,
      kind: e.kind === 'anchor' ? 'anchor' : 'story',
      anchor: e.kind === 'anchor',
      location: e.burg !== undefined || e.cell !== undefined ? { burg: e.burg, cell: e.cell } : undefined,
      states: e.states,
    });
  }

  for (const w of wars) {
    const startDate = dateInYear(w.start, hash(1, w.attacker, w.defender));
    events.push({
      id: `${w.id}-begins`,
      ord: toOrdinal(startDate),
      date: startDate,
      title: `${w.name} begins`,
      description: `${stateName(w.attacker)} takes up arms against ${stateName(w.defender)}.`,
      kind: 'war',
      states: [w.attacker, w.defender],
    });
    if (w.end !== null && w.end !== undefined) {
      const endDate = dateInYear(w.end, hash(2, w.attacker, w.defender));
      events.push({
        id: `${w.id}-ends`,
        ord: Math.max(toOrdinal(endDate), toOrdinal(startDate) + 30),
        date: endDate,
        title: `${w.name} ends`,
        description: `Peace between ${stateName(w.attacker)} and ${stateName(w.defender)}; the ${w.name} is over.`,
        kind: 'war',
        states: [w.attacker, w.defender],
      });
    }
  }

  events.sort((a, b) => a.ord - b.ord || a.id.localeCompare(b.id));
  return events;
}

/** All scripted events with prevOrd < ord <= newOrd (events list must be sorted). */
export function fireBetween(events: WorldEvent[], prevOrd: number, newOrd: number): WorldEvent[] {
  if (newOrd <= prevOrd) return [];
  // binary search for first ord > prevOrd
  let lo = 0;
  let hi = events.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (events[mid].ord <= prevOrd) lo = mid + 1;
    else hi = mid;
  }
  const fired: WorldEvent[] = [];
  for (let i = lo; i < events.length && events[i].ord <= newOrd; i++) fired.push(events[i]);
  return fired;
}

/** Wars already running at game start (started, no end before the date). */
export function ongoingWarsAt(wars: WarEntry[], year: number): WarEntry[] {
  return wars.filter((w) => w.start <= year && (w.end === null || w.end === undefined || w.end >= year));
}
