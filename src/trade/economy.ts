/**
 * The world economy state and its weekly simulation (framework §4, §8). Every
 * burg is a market holding stock and prices for the goods it trades. Each week
 * we run the §8 order — events → production → flow → price → clamp — advancing
 * from the last simulated week. State is seeded to a settled equilibrium at the
 * start date so day-one prices already show sensible regional spreads.
 *
 * This layer is pure and deterministic: given the same WorldData and target
 * week it always produces the same prices. The store owns an EconomyState and
 * ticks it as the clock advances; the player cannot trade yet (caravans unlock
 * later), so this is read-only from the UI's perspective.
 */
import type { WorldData } from '../data/worldLoader';
import { toOrdinal, START_DATE } from '../sim/calendar';
import { hash } from '../sim/rng';
import { GOODS, type Good } from './goods';
import { marketClass, goodsStockedByBurg, type MarketClass } from './markets';
import { buildProduction, burgWeeklyProduction } from './production';
import { burgWeeklyDemand } from './demand';
import { buildRouteGraph, type TradeGraph } from './graph';
import { economicModifiers, type EconMods } from './events';
import { diffuse } from './flow';
import { priceFor, weekNoise } from './pricing';

export interface MarketState {
  burgId: number;
  cls: MarketClass;
  stock: Record<string, number>;
  price: Record<string, number>;
  /** Price snapshot at the start of the most recent tick (for weekly movers). */
  prev: Record<string, number>;
}

export interface EconomyState {
  week: number; // last simulated week
  seed: number; // world seed for deterministic noise
  markets: Map<number, MarketState>;
}

// --- tuning ------------------------------------------------------------------
const STAPLE_FLOOR_WEEKS = 0.5; // staples never fully starve (§7.5)
const STOCK_CEIL_WEEKS = 8; // caps glut so producers don't hoard unbounded stock
const SETTLE_WEEKS = 26; // half a year of settling to build day-one spreads
const MAX_CATCHUP_WEEKS = 12; // bounded catch-up so big clock jumps stay cheap
const DAYS_PER_WEEK = 7;
const DAYS_PER_YEAR = 365;

const GOOD_IDX = new Map(GOODS.map((g, i) => [g.id, i]));

export function weekOf(ordinalDay: number): number {
  return Math.floor(ordinalDay / DAYS_PER_WEEK);
}

function yearOfWeek(week: number): number {
  return Math.floor((week * DAYS_PER_WEEK) / DAYS_PER_YEAR);
}

function worldSeed(wd: WorldData): number {
  const n = Number(wd.geometry.seed);
  if (Number.isFinite(n)) return n >>> 0;
  let h = 0;
  for (const ch of wd.geometry.seed) h = hash(h, ch.charCodeAt(0));
  return h;
}

// --- static per-world inputs (memoized) -------------------------------------
interface EconInputs {
  goods: Good[];
  prodByBurg: Map<number, Record<string, number>>;
  demandByBurg: Map<number, Record<string, number>>;
  clsByBurg: Map<number, MarketClass>;
  stateByBurg: Map<number, number>;
  cultureByBurg: Map<number, string>;
  graph: TradeGraph;
}

const INPUTS = new WeakMap<WorldData, EconInputs>();

function economyInputs(wd: WorldData): EconInputs {
  const cached = INPUTS.get(wd);
  if (cached) return cached;

  const prodModel = buildProduction(wd);
  const prodByBurg = new Map<number, Record<string, number>>();
  const demandByBurg = new Map<number, Record<string, number>>();
  const clsByBurg = new Map<number, MarketClass>();
  const stateByBurg = new Map<number, number>();
  const cultureByBurg = new Map<number, string>();

  for (const burg of wd.world.burgs) {
    const demand = burgWeeklyDemand(wd, burg);
    if (Object.keys(demand).length === 0) continue;
    const stocked = new Set(goodsStockedByBurg(burg).map((g) => g.id));
    // Only keep production of goods this market can actually sell.
    const rawProd = burgWeeklyProduction(prodModel, burg);
    const prod: Record<string, number> = {};
    for (const [id, v] of Object.entries(rawProd)) if (stocked.has(id)) prod[id] = v;

    prodByBurg.set(burg.i, prod);
    demandByBurg.set(burg.i, demand);
    clsByBurg.set(burg.i, marketClass(burg));
    stateByBurg.set(burg.i, burg.state);
    cultureByBurg.set(burg.i, wd.cultureById.get(burg.culture)?.name ?? '');
  }

  const inputs: EconInputs = {
    goods: GOODS,
    prodByBurg,
    demandByBurg,
    clsByBurg,
    stateByBurg,
    cultureByBurg,
    graph: buildRouteGraph(wd),
  };
  INPUTS.set(wd, inputs);
  return inputs;
}

// --- weekly step -------------------------------------------------------------
function stepWeek(econ: EconomyState, inputs: EconInputs, mods: EconMods, week: number): void {
  // §8 (2) production (net of consumption) & (1) event supply effects.
  for (const [burgId, m] of econ.markets) {
    const prod = inputs.prodByBurg.get(burgId) ?? {};
    const demand = inputs.demandByBurg.get(burgId) ?? {};
    const culture = inputs.cultureByBurg.get(burgId) ?? '';
    for (const good of inputs.goods) {
      const d = demand[good.id];
      if (d == null) continue;
      const supplyMult = mods.supplyMultFor(culture, good);
      m.stock[good.id] = (m.stock[good.id] ?? 0) + (prod[good.id] ?? 0) * supplyMult - d;
    }
  }

  // §8 (3) NPC flow.
  diffuse(econ.markets, inputs.graph, inputs.goods);

  // §8 (4) price & (5) clamps, plus stock floor/ceiling.
  for (const [burgId, m] of econ.markets) {
    const demand = inputs.demandByBurg.get(burgId)!;
    const stateId = inputs.stateByBurg.get(burgId) ?? 0;
    for (const good of inputs.goods) {
      const d = demand[good.id];
      if (d == null) continue;
      const floor = good.tier === 'staple' ? d * STAPLE_FLOOR_WEEKS : 0;
      const ceil = d * STOCK_CEIL_WEEKS;
      const s = Math.min(ceil, Math.max(floor, m.stock[good.id] ?? 0));
      m.stock[good.id] = s;
      const eventMult = mods.priceMultFor(stateId, good);
      const noise = weekNoise(econ.seed, burgId, GOOD_IDX.get(good.id)!, week);
      m.price[good.id] = priceFor(good, s, d, eventMult, noise);
    }
  }
}

// --- public API --------------------------------------------------------------
export function initEconomy(wd: WorldData): EconomyState {
  const inputs = economyInputs(wd);
  const seed = worldSeed(wd);
  const startWeek = weekOf(toOrdinal(START_DATE));
  const markets = new Map<number, MarketState>();

  for (const [burgId, demand] of inputs.demandByBurg) {
    const stock: Record<string, number> = {};
    const price: Record<string, number> = {};
    for (const good of inputs.goods) {
      const d = demand[good.id];
      if (d == null) continue;
      stock[good.id] = d; // one week of demand ⇒ ratio 1 ⇒ ~base price
      price[good.id] = good.basePrice;
    }
    markets.set(burgId, { burgId, cls: inputs.clsByBurg.get(burgId)!, stock, price, prev: { ...price } });
  }

  const econ: EconomyState = { week: startWeek, seed, markets };

  // Settle half a year (at start-date modifiers) so day-one spreads exist.
  const mods = economicModifiers(wd, START_DATE.year);
  for (let i = 1; i <= SETTLE_WEEKS; i++) stepWeek(econ, inputs, mods, startWeek - SETTLE_WEEKS + i);
  for (const m of econ.markets.values()) m.prev = { ...m.price };
  econ.week = startWeek;
  return econ;
}

function cloneEconomy(econ: EconomyState): EconomyState {
  const markets = new Map<number, MarketState>();
  for (const [id, m] of econ.markets) {
    markets.set(id, {
      burgId: m.burgId,
      cls: m.cls,
      stock: { ...m.stock },
      price: { ...m.price },
      prev: { ...m.price }, // snapshot before this tick, for weekly movers
    });
  }
  return { week: econ.week, seed: econ.seed, markets };
}

/**
 * Advance the economy to `targetWeek`. Returns a new EconomyState (the input is
 * left untouched). Jumps larger than MAX_CATCHUP_WEEKS coarse-settle: we only
 * simulate the trailing window so a multi-year skip stays cheap while still
 * landing on current-year events.
 */
export function worldTick(wd: WorldData, econ: EconomyState, targetWeek: number): EconomyState {
  if (targetWeek <= econ.week) return econ;
  const inputs = economyInputs(wd);
  const next = cloneEconomy(econ);
  let from = econ.week;
  if (targetWeek - from > MAX_CATCHUP_WEEKS) from = targetWeek - MAX_CATCHUP_WEEKS;
  for (let wk = from + 1; wk <= targetWeek; wk++) {
    const mods = economicModifiers(wd, yearOfWeek(wk));
    stepWeek(next, inputs, mods, wk);
  }
  next.week = targetWeek;
  return next;
}

// --- accessors (read-only views for the UI) ---------------------------------
export function marketOf(econ: EconomyState, burgId: number): MarketState | undefined {
  return econ.markets.get(burgId);
}

export interface Mover {
  goodId: string;
  price: number;
  base: number;
  vsBase: number; // fractional change from base price
  vsPrev: number; // fractional change from last tick
}

/** Biggest price movers at one market, ranked by absolute weekly change. */
export function moversAt(econ: EconomyState, burgId: number, n = 6): Mover[] {
  const m = econ.markets.get(burgId);
  if (!m) return [];
  const rows: Mover[] = [];
  for (const good of GOODS) {
    const price = m.price[good.id];
    if (price == null) continue;
    const prev = m.prev[good.id] ?? price;
    rows.push({
      goodId: good.id,
      price,
      base: good.basePrice,
      vsBase: price / good.basePrice - 1,
      vsPrev: prev > 0 ? price / prev - 1 : 0,
    });
  }
  rows.sort((a, b) => Math.abs(b.vsPrev) - Math.abs(a.vsPrev));
  return rows.slice(0, n);
}

export interface Spread {
  goodId: string;
  minBurg: number;
  minPrice: number;
  maxBurg: number;
  maxPrice: number;
  ratio: number; // maxPrice / minPrice
}

/** Widest global price spread per good — where arbitrage will pay best later. */
export function spreadsAcross(econ: EconomyState, n = 8): Spread[] {
  const acc = new Map<string, { minB: number; minP: number; maxB: number; maxP: number }>();
  for (const m of econ.markets.values()) {
    for (const good of GOODS) {
      const p = m.price[good.id];
      if (p == null) continue;
      const cur = acc.get(good.id);
      if (!cur) {
        acc.set(good.id, { minB: m.burgId, minP: p, maxB: m.burgId, maxP: p });
      } else {
        if (p < cur.minP) {
          cur.minP = p;
          cur.minB = m.burgId;
        }
        if (p > cur.maxP) {
          cur.maxP = p;
          cur.maxB = m.burgId;
        }
      }
    }
  }
  const rows: Spread[] = [];
  for (const [goodId, v] of acc) {
    rows.push({
      goodId,
      minBurg: v.minB,
      minPrice: v.minP,
      maxBurg: v.maxB,
      maxPrice: v.maxP,
      ratio: v.minP > 0 ? v.maxP / v.minP : 1,
    });
  }
  rows.sort((a, b) => b.ratio - a.ratio);
  return rows.slice(0, n);
}
