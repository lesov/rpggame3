/**
 * Price formation (framework §4.2): a market's price for a good is its base
 * price bent by the local supply/demand ratio (with tier elasticity), scaled by
 * any event multiplier, jittered by deterministic weekly noise, and clamped to
 * a rubber band around base so nothing ever runs away or goes negative.
 */
import { ELASTICITY, type Good } from './goods';
import { hash, mulberry32 } from '../sim/rng';

/** Rubber-band clamp (§4.2, §7): price stays within [0.4, 3.0] × base. */
export const PRICE_FLOOR = 0.4;
export const PRICE_CEIL = 3.0;

const EPS = 1e-6;

/** Deterministic ±5% weekly noise, seeded from world/burg/good/week (§8). */
export function weekNoise(worldSeed: number, burgId: number, goodId: number, week: number): number {
  const rand = mulberry32(hash(worldSeed, burgId, goodId, week));
  return 0.95 + rand() * 0.1; // [0.95, 1.05)
}

/** Clamp a raw price into the rubber band for a good. */
export function clampPrice(good: Good, raw: number): number {
  const lo = good.basePrice * PRICE_FLOOR;
  const hi = good.basePrice * PRICE_CEIL;
  if (!Number.isFinite(raw)) return good.basePrice;
  return Math.min(hi, Math.max(lo, raw));
}

/**
 * Price for one good at one market from its current stock and weekly demand.
 * ratio > 1 (scarce) pushes price up; ratio < 1 (glut) pushes it down.
 */
export function priceFor(
  good: Good,
  stock: number,
  demand: number,
  eventMult: number,
  noise: number,
): number {
  const ratio = demand / Math.max(stock, EPS);
  const raw = good.basePrice * Math.pow(ratio, ELASTICITY[good.tier]) * eventMult * noise;
  return clampPrice(good, raw);
}
