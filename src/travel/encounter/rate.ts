/**
 * Question 1 — encounter frequency (λ), a multiplicative clamped hazard.
 *
 *   λ = base(biome) × M_road × M_remoteness × M_time × M_marker × M_war
 *       × M_season × M_weather × M_visibility     (clamped to CEIL × base)
 *   P(encounter over Δt hours) = 1 − e^(−λ·Δt)
 *
 * This is a Poisson process: it never exceeds 100%, scales to any duration,
 * and modifiers compose without edge cases. Inputs are actor-density only —
 * the function takes a RateContext, which by construction cannot carry
 * reputation/diplomacy/faith, so who the player is can never change λ.
 */
import type { RateContext } from './types';

export const RATE = {
  /** hard ceiling: stacked danger tops out at CEIL × the biome base */
  CEILING_MULT: 4,
  /** base encounters per hour of exposed travel, before multipliers */
  BASE_MIN: 0.06, // most habitable farmland
  BASE_MAX: 0.22, // waste / swamp / glacier
  /** per-biome base overrides (else derived from habitability) */
  BASE_BY_BIOME: {
    Marine: 0.05,
    Wetland: 0.2,
    Glacier: 0.2,
  } as Record<string, number>,
  POST_WAR_YEARS: 6, // disbanded soldiers turn bandit for years after a war
  MARKER_RADIUS_MI: 30,
  BURG_FAR_MI: 45, // beyond this, no civilisation suppression from a burg
  POP_HALF: 8, // pop at which the suppression curve is half-strength
} as const;

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

/** Base rate from biome habitability (inverse), with a few explicit overrides. */
export function baseRate(ctx: Pick<RateContext, 'biomeName' | 'habitability'>): number {
  const override = RATE.BASE_BY_BIOME[ctx.biomeName];
  if (override !== undefined) return override;
  const hab = clamp(ctx.habitability, 0, 100) / 100;
  return RATE.BASE_MAX - (RATE.BASE_MAX - RATE.BASE_MIN) * hab;
}

function roadMult(road: RateContext['road']): number {
  return road === 'roads' ? 0.5 : road === 'trails' ? 0.8 : 1.5;
}

/** Civilisation suppresses random hostiles — the strongest predictor. */
function remotenessMult(pop: number, nearestBurgMi: number): number {
  const popSuppress = Math.max(0, pop) / (Math.max(0, pop) + RATE.POP_HALF); // 0..1
  const burgSuppress = clamp(1 - nearestBurgMi / RATE.BURG_FAR_MI, 0, 1); // 1 at a burg, 0 far away
  return clamp(1.6 - 0.9 * popSuppress - 0.4 * burgSuppress, 0.35, 1.6);
}

function timeMult(hourOfDay: number): number {
  const h = ((hourOfDay % 24) + 24) % 24;
  if (h >= 22 || h < 5) return 1.8; // deep night
  if (h < 7 || h >= 19) return 1.25; // dawn / dusk
  return 1.0;
}

function markerMult(marker: RateContext['marker']): number {
  if (!marker || marker.distanceMi > RATE.MARKER_RADIUS_MI) return 1;
  const nearness = 1 - marker.distanceMi / RATE.MARKER_RADIUS_MI; // 0..1
  return 2 + nearness; // 2× at the edge, up to 3× at the marker
}

function warMult(war: RateContext['war']): number {
  if (war.active) return 2.0;
  // Aftermath: disbanded soldiers turn bandit — starts just under an active
  // campaign and decays to baseline over POST_WAR_YEARS.
  if (war.yearsSinceEnd !== null && war.yearsSinceEnd < RATE.POST_WAR_YEARS) {
    return 1 + 0.9 * (1 - war.yearsSinceEnd / RATE.POST_WAR_YEARS);
  }
  return 1;
}

export interface RateBreakdown {
  base: number;
  road: number;
  remoteness: number;
  time: number;
  marker: number;
  war: number;
  season: number;
  weather: number;
  visibility: number;
  lambda: number;
  /** the single largest multiplier above 1, for the "danger read" label */
  dominant: string;
}

export function rateBreakdown(ctx: RateContext): RateBreakdown {
  const base = baseRate(ctx);
  const road = roadMult(ctx.road);
  const remoteness = remotenessMult(ctx.pop, ctx.nearestBurgMi);
  const time = timeMult(ctx.hourOfDay);
  const marker = markerMult(ctx.marker);
  const war = warMult(ctx.war);
  const season = ctx.isWinter ? 1.15 : 1; // hungrier beasts (human suppression lives in the table)
  const weather = ctx.storm ? 0.5 : 1;
  const visibility = ctx.visibility;
  const raw = base * road * remoteness * time * marker * war * season * weather * visibility;
  const lambda = clamp(raw, 0, RATE.CEILING_MULT * base);

  const factors: [string, number][] = [
    ['open country', road],
    ['remoteness', remoteness],
    ['darkness', time],
    ['a nearby lair', marker],
    ['war', war],
    ['winter', season],
  ];
  const dominant = factors.reduce((a, b) => (b[1] > a[1] ? b : a), ['', 1] as [string, number]);

  return { base, road, remoteness, time, marker, war, season, weather, visibility, lambda, dominant: dominant[0] || 'the road itself' };
}

export function lambdaFor(ctx: RateContext): number {
  return rateBreakdown(ctx).lambda;
}

/** Poisson hit probability over a span of hours at a constant rate. */
export function poissonHit(lambda: number, hours: number): number {
  return 1 - Math.exp(-Math.max(0, lambda) * Math.max(0, hours));
}

/**
 * Closed-form P(at least one encounter) across a set of (λ, Δt) segments —
 * used for the pre-departure danger read (no RNG): 1 − e^(−Σ λ·Δt).
 */
export function cumulativeHitProbability(segments: { lambda: number; hours: number }[]): number {
  const total = segments.reduce((s, seg) => s + Math.max(0, seg.lambda) * Math.max(0, seg.hours), 0);
  return 1 - Math.exp(-total);
}
