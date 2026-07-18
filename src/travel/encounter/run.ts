/**
 * Orchestrator: walk a planned travel leg as a sequence of waypoints, assemble
 * the (disjoint) rate and disposition contexts for each from world data, and
 * run the clamped Poisson process with the pity governor. The first segment to
 * fire interrupts the leg; the actor is drawn and its hostility resolved.
 *
 * Fully deterministic in (seed, pacing, world, plan): the same leg always
 * plays out the same way, so it is straightforward to unit-test.
 */
import type { WorldData } from '../../data/worldLoader';
import type { PlayerCharacter } from '../../player/types';
import type { TravelPlan } from '../../player/travel';
import { findReputation } from '../../player/reputation';
import { addMinutes, season, type GameDateTime } from '../../sim/calendar';
import { weatherAt, isSevere } from '../../sim/weather';
import { mulberry32 } from '../../sim/rng';
import { lambdaFor, poissonHit, rateBreakdown } from './rate';
import { hostileChance } from './disposition';
import { pickActorKind, buildActor, type TableContext } from './tables';
import { pityFactor, advancePacing, type PacingState } from './pacing';
import type {
  ActorKind,
  DispositionContext,
  DiplomacyRelation,
  EncounterOutcome,
  RateContext,
  RoadTier,
} from './types';

const HOSTILE_MARKER_TYPES = new Set(['brigands', 'pirates', 'lake-monsters', 'sea-monsters', 'dungeons', 'ruins']);
const DIPLOMACY_VALUES = new Set<DiplomacyRelation>(['Ally', 'Friendly', 'Neutral', 'Suspicion', 'Enemy', 'Rival', 'Unknown', 'Self', 'Vassal', 'Suzerain']);

export interface EncounterInput {
  wd: WorldData;
  player: PlayerCharacter;
  plan: TravelPlan;
  start: GameDateTime;
  pacing: PacingState;
  seed: number;
}

function roadTier(plan: TravelPlan): RoadTier {
  return plan.routeGroup === 'roads' ? 'roads' : plan.routeGroup === 'trails' ? 'trails' : 'offroad';
}

function mapDiplomacy(raw: string | undefined, selfState: boolean): DiplomacyRelation {
  if (selfState) return 'Self';
  if (raw === 'x' || raw === 'X') return 'Self';
  return DIPLOMACY_VALUES.has(raw as DiplomacyRelation) ? (raw as DiplomacyRelation) : 'Unknown';
}

function nearestBurgMi(wd: WorldData, x: number, y: number): number {
  let best = Infinity;
  for (const b of wd.world.burgs) {
    const d = wd.distanceMi(x, y, b.x, b.y);
    if (d < best) best = d;
  }
  return best;
}

function nearestHostileMarker(wd: WorldData, x: number, y: number): { type: string; distanceMi: number } | undefined {
  let best: { type: string; distanceMi: number } | undefined;
  for (const m of wd.world.markers) {
    if (!HOSTILE_MARKER_TYPES.has(m.type)) continue;
    const d = wd.distanceMi(x, y, m.x, m.y);
    if (!best || d < best.distanceMi) best = { type: m.type, distanceMi: d };
  }
  return best;
}

function warStatus(wd: WorldData, stateId: number, year: number): { active: boolean; yearsSinceEnd: number | null } {
  let active = false;
  let yearsSinceEnd: number | null = null;
  for (const w of wd.wars) {
    if (w.attacker !== stateId && w.defender !== stateId) continue;
    if (w.start <= year && (w.end === null || w.end >= year)) {
      active = true;
    } else if (w.end !== null && w.end < year) {
      const since = year - w.end;
      if (yearsSinceEnd === null || since < yearsSinceEnd) yearsSinceEnd = since;
    }
  }
  return { active, yearsSinceEnd };
}

/** hour-of-day at trip fraction; day-only travel is folded into daylight. */
function hourAtFraction(start: GameDateTime, activeMinutes: number, frac: number, dayOnly: boolean): number {
  const activeHours = (activeMinutes * frac) / 60;
  if (dayOnly) {
    return 6 + (((start.time.hour - 6 + activeHours) % 12) + 12) % 12; // within 06:00–18:00
  }
  const h = (start.time.hour + start.time.minute / 60 + activeHours) % 24;
  return (h + 24) % 24;
}

interface Waypoint {
  frac: number;
  x: number;
  y: number;
  cellId: number;
  rate: RateContext;
  dispositionFor: (kind: ActorKind) => DispositionContext;
  table: TableContext;
  date: GameDateTime;
}

/** Build the ordered midpoints of the leg with both contexts attached. */
export function buildWaypoints(input: EncounterInput, steps: number): Waypoint[] {
  const { wd, player, plan, start } = input;
  const from = { x: player.location.x, y: player.location.y };
  const to = { x: plan.destination.x, y: plan.destination.y };
  const road = roadTier(plan);
  const activeMinutes = plan.travelHours * 60;
  const out: Waypoint[] = [];

  for (let i = 0; i < steps; i++) {
    const frac = (i + 0.5) / steps;
    const x = from.x + (to.x - from.x) * frac;
    const y = from.y + (to.y - from.y) * frac;
    const cellId = wd.cellIndex.cellAt(x, y) ?? plan.destination.cellId;
    const cell = wd.geometry.cells[cellId];
    const biome = wd.geometry.biomes[cell.biome];
    const climate = wd.climateOf(cellId);
    const dt = addMinutes(start, Math.round(plan.elapsedMinutes * frac));
    const weather = weatherAt(climate, dt.date);
    const isWinter = season(dt.date, climate.lat) === 'Winter';
    const hourOfDay = hourAtFraction(start, activeMinutes, frac, plan.dayOnly);
    const marker = nearestHostileMarker(wd, x, y);
    const burgDistance = nearestBurgMi(wd, x, y);
    const stateId = cell.state;
    const stateRec = stateId > 0 ? wd.stateById.get(stateId) : undefined;

    const rate: RateContext = {
      biomeName: biome?.name ?? 'Grassland',
      habitability: biome?.habitability ?? 50,
      pop: cell.pop,
      road,
      hourOfDay,
      isWinter,
      storm: isSevere(weather),
      nearestBurgMi: burgDistance,
      marker: marker && marker.distanceMi <= 60 ? marker : undefined,
      war: warStatus(wd, stateId, dt.date.year),
      visibility: 1, // solo traveller for now
    };

    const cultureRep = findReputation(player.reputations.cultures, cell.culture)?.score ?? 0;
    const religionRep = findReputation(player.reputations.religions, cell.religion)?.score ?? 0;
    const diplomacyRaw = stateRec?.diplomacy?.[player.nationalityId];
    const diplomacy = mapDiplomacy(diplomacyRaw, stateId === player.nationalityId);
    const dispositionFor = (kind: ActorKind): DispositionContext => ({
      actorKind: kind,
      cultureRep,
      religionRep,
      alert: stateRec?.alert,
      diplomacy,
      sameCulture: player.cultureId !== undefined && player.cultureId === cell.culture,
      sameReligion: player.religionId === cell.religion,
    });

    const table: TableContext = {
      biomeId: cell.biome,
      road,
      pop: cell.pop,
      nearestBurgMi: burgDistance,
      night: hourOfDay >= 21 || hourOfDay < 5,
      isWinter,
      markerType: rate.marker && rate.marker.distanceMi <= 30 ? rate.marker.type : undefined,
    };

    out.push({ frac, x, y, cellId, rate, dispositionFor, table, date: dt });
  }
  return out;
}

/** Number of sampling steps for a leg — roughly hourly, bounded. */
export function stepCount(plan: TravelPlan): number {
  return Math.min(40, Math.max(4, Math.ceil(plan.travelHours)));
}

export function rollTravelEncounters(input: EncounterInput): EncounterOutcome {
  const steps = stepCount(input.plan);
  const waypoints = buildWaypoints(input, steps);
  const rand = mulberry32(input.seed >>> 0);
  const hoursPerStep = input.plan.travelHours / steps;
  let pacing = input.pacing;

  for (const wp of waypoints) {
    const lambda = lambdaFor(wp.rate) * pityFactor(pacing);
    const p = poissonHit(lambda, hoursPerStep);
    if (rand() < p) {
      const kind = pickActorKind(wp.table, rand());
      const disp = wp.dispositionFor(kind);
      const chance = hostileChance(disp);
      const hostile = rand() < chance;
      const actor = buildActor(kind, wp.table.biomeId, hostile, rand(), wp.table);
      return {
        kind: 'encounter',
        encounter: {
          atFraction: wp.frac,
          elapsedMinutes: Math.round(input.plan.elapsedMinutes * wp.frac),
          x: wp.x,
          y: wp.y,
          cellId: wp.cellId,
          actor,
          lambda,
          hostileChance: chance,
          date: wp.date.date,
        },
      };
    }
    pacing = advancePacing(pacing, hoursPerStep);
  }
  return { kind: 'clear' };
}

export interface DangerFactor {
  label: string;
  /** the biome base is a rate (per hour); the rest are dimensionless multipliers */
  value: number;
  isRate?: boolean;
}

export interface DangerBreakdown {
  steps: number;
  activeHours: number;
  hoursPerStep: number;
  meanLambda: number;
  /** expected number of encounters over the leg, E[N] = Σ λ·Δt */
  expectedEncounters: number;
  chance: number;
  dominant: string;
  /** each factor averaged across the sampled waypoints */
  factors: DangerFactor[];
}

/**
 * Full danger calculation for the leg — the same expected-value math as
 * legDangerRead, but with every averaged factor exposed so the player (and
 * tests) can see exactly how the number was built.
 */
export function legDangerBreakdown(input: EncounterInput): DangerBreakdown {
  const steps = stepCount(input.plan);
  const waypoints = buildWaypoints(input, steps);
  const hoursPerStep = input.plan.travelHours / steps;
  const n = waypoints.length || 1;
  const agg = { base: 0, road: 0, remoteness: 0, time: 0, marker: 0, war: 0, season: 0, weather: 0 };
  let sumLambda = 0;
  for (const wp of waypoints) {
    const b = rateBreakdown(wp.rate);
    agg.base += b.base;
    agg.road += b.road;
    agg.remoteness += b.remoteness;
    agg.time += b.time;
    agg.marker += b.marker;
    agg.war += b.war;
    agg.season += b.season;
    agg.weather += b.weather;
    sumLambda += b.lambda;
  }
  const meanLambda = sumLambda / n;
  const expectedEncounters = sumLambda * hoursPerStep;
  const factors: DangerFactor[] = [
    { label: 'Biome base rate', value: agg.base / n, isRate: true },
    { label: 'Road / terrain', value: agg.road / n },
    { label: 'Remoteness', value: agg.remoteness / n },
    { label: 'Time of day', value: agg.time / n },
    { label: 'Nearby lair', value: agg.marker / n },
    { label: 'War', value: agg.war / n },
    { label: 'Season', value: agg.season / n },
    { label: 'Weather', value: agg.weather / n },
  ];
  return {
    steps,
    activeHours: input.plan.travelHours,
    hoursPerStep,
    meanLambda,
    expectedEncounters,
    chance: 1 - Math.exp(-expectedEncounters),
    dominant: legDangerRead(input).dominant,
    factors,
  };
}

/** Pre-departure danger read for the whole leg — expected value, no RNG. */
export function legDangerRead(input: EncounterInput): { chance: number; dominant: string } {
  const steps = stepCount(input.plan);
  const waypoints = buildWaypoints(input, steps);
  const hoursPerStep = input.plan.travelHours / steps;
  let total = 0;
  const dominantCount: Record<string, number> = {};
  for (const wp of waypoints) {
    total += lambdaFor(wp.rate) * hoursPerStep;
    // track the loudest driver across the route for a legible label
    const b = wp.rate;
    const drivers: [string, number][] = [
      ['open road', b.road === 'offroad' ? 1.5 : 1],
      ['remoteness', b.nearestBurgMi > 25 ? 1.4 : 1],
      ['darkness', b.hourOfDay >= 21 || b.hourOfDay < 5 ? 1.8 : 1],
      ['a nearby lair', b.marker && b.marker.distanceMi <= 30 ? 2.5 : 1],
      ['war', b.war.active ? 2 : b.war.yearsSinceEnd !== null && b.war.yearsSinceEnd < 6 ? 1.5 : 1],
    ];
    const top = drivers.reduce((a, c) => (c[1] > a[1] ? c : a));
    if (top[1] > 1) dominantCount[top[0]] = (dominantCount[top[0]] ?? 0) + 1;
  }
  const dominant = Object.entries(dominantCount).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'the road itself';
  return { chance: 1 - Math.exp(-total), dominant };
}
