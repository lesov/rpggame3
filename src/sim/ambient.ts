/**
 * Ambient flavor events: deterministic per day (same day always produces the
 * same events). Sources: severe local weather at settlements, annual
 * religious festivals, trade rumors between portal-guild cities, and
 * sightings near the map's lore markers. Tuned to ~1–3 events per week
 * world-wide.
 */
import { type GameDate, dayOfYear, fromOrdinal } from './calendar';
import { hash, mulberry32, pick } from './rng';
import { type CellClimate, weatherAt, isSevere } from './weather';
import type { WorldEvent } from './events';

export interface AmbientBurg {
  i: number;
  name: string;
  cell: number;
  population: number;
  hasPortal: boolean;
}

export interface AmbientMarker {
  i: number;
  type: string;
  icon: string;
  cell: number;
  name?: string;
  legend?: string;
}

export interface AmbientReligion {
  i: number;
  name: string;
  type: string;
  deity?: string;
  centerBurg?: number; // burg nearest the faith's center cell, resolved by the loader
}

export interface AmbientContext {
  burgs: AmbientBurg[]; // major burgs (towns and up), for weather + rumors
  markers: AmbientMarker[];
  religions: AmbientReligion[];
  climateOf: (cellId: number) => CellClimate;
}

const RUMOR_TEMPLATES = [
  (a: string, b: string) => `Caravan masters in ${a} pay premium rates for guarded runs to ${b}.`,
  (a: string, b: string) => `Merchants whisper that the ${a}–${b} portal route has grown unusually busy.`,
  (a: string, b: string) => `A trade delegation from ${a} arrived in ${b} under heavy escort.`,
  (a: string, b: string) => `Grain prices in ${a} jumped after rumors of trouble on the road to ${b}.`,
  (a: string, b: string) => `Adventurers' guild notices in ${a} seek escorts for a valuable shipment to ${b}.`,
];

const SIGHTING_TEMPLATES: Record<string, (name: string) => string> = {
  brigands: (n) => `Travelers report fresh brigand activity near ${n}.`,
  pirates: (n) => `Sailors speak of pirate sails sighted off ${n}.`,
  'lake-monsters': (n) => `Fisherfolk swear something vast moved beneath the waters near ${n}.`,
  'sea-monsters': (n) => `A merchant crew returned pale, telling of a creature near ${n}.`,
  dungeons: (n) => `Strange lights were seen around ${n} after dark.`,
  ruins: (n) => `Shepherds report unfamiliar figures picking through ${n}.`,
  encounters: (n) => `Word spreads of strange happenings near ${n}.`,
};

function sightingText(type: string, name: string): string {
  const fn = SIGHTING_TEMPLATES[type] ?? SIGHTING_TEMPLATES.encounters;
  return fn(name);
}

/** All ambient events for a single day. Deterministic in (ord, ctx). */
export function ambientEventsForDay(ord: number, ctx: AmbientContext): WorldEvent[] {
  const date: GameDate = fromOrdinal(ord);
  const doy = dayOfYear(date);
  const rand = mulberry32(hash(ord, 0xa3b1e7));
  const events: WorldEvent[] = [];

  // Festivals: each faith keeps one fixed feast day per year.
  for (const r of ctx.religions) {
    if (r.type === 'Folk' && hash(r.i, 7) % 2 === 0) continue; // some folk faiths keep no public feast
    const feastDoy = 1 + (hash(r.i, 0xfe57) % 365);
    if (feastDoy === doy && r.centerBurg !== undefined) {
      events.push({
        id: `festival-${r.i}-${date.year}`,
        ord,
        date,
        title: `Feast of ${r.deity ?? r.name}`,
        description: `The faithful of the ${r.name} hold their great annual feast${r.deity ? ` in honor of ${r.deity}` : ''}.`,
        kind: 'festival',
        location: { burg: r.centerBurg },
      });
    }
  }

  // Severe weather: sample a few large settlements; report the first storm.
  if (ctx.burgs.length > 0) {
    for (let i = 0; i < 3; i++) {
      const b = pick(rand, ctx.burgs);
      const w = weatherAt(ctx.climateOf(b.cell), date);
      if (isSevere(w)) {
        events.push({
          id: `weather-${b.i}-${ord}`,
          ord,
          date,
          title: `${w.condition} strikes ${b.name}`,
          description: `${w.description} Winds near ${w.windMph} mph batter the settlement.`,
          kind: 'weather',
          location: { burg: b.i },
        });
        break;
      }
    }
  }

  // Trade rumors between portal-guild cities.
  const portalCities = ctx.burgs.filter((b) => b.hasPortal);
  if (portalCities.length >= 2 && rand() < 0.09) {
    const a = pick(rand, portalCities);
    let b = pick(rand, portalCities);
    if (b.i === a.i) b = portalCities[(portalCities.indexOf(a) + 1) % portalCities.length];
    events.push({
      id: `rumor-${ord}`,
      ord,
      date,
      title: `Word from the trade roads`,
      description: pick(rand, RUMOR_TEMPLATES)(a.name, b.name),
      kind: 'rumor',
      location: { burg: a.i },
    });
  }

  // Sightings near lore markers.
  if (ctx.markers.length > 0 && rand() < 0.07) {
    const m = pick(rand, ctx.markers);
    events.push({
      id: `sighting-${m.i}-${ord}`,
      ord,
      date,
      title: `${m.icon} ${m.name ?? 'Strange reports'}`,
      description: sightingText(m.type, m.name ?? 'a remote place'),
      kind: 'sighting',
      location: { cell: m.cell },
    });
  }

  return events;
}

/** Ambient events across a span of days, prevOrd exclusive .. newOrd inclusive. */
export function ambientEventsBetween(
  prevOrd: number,
  newOrd: number,
  ctx: AmbientContext,
  maxDays = 400,
): WorldEvent[] {
  const events: WorldEvent[] = [];
  // For very large jumps, only simulate the trailing window — the feed
  // doesn't need years of ambient noise.
  const from = Math.max(prevOrd + 1, newOrd - maxDays + 1);
  for (let ord = from; ord <= newOrd; ord++) {
    events.push(...ambientEventsForDay(ord, ctx));
  }
  return events;
}
