/**
 * Save/load persistence for the game (4 browser localStorage slots).
 *
 * GameState is JSON-serializable except economy.markets (a Map). We encode the
 * economy compactly — per burg, stock/price value arrays in the deterministic
 * goodsStockedByBurg() order rather than repeating good-name keys across 1,245
 * markets — so four full-world saves fit comfortably under the ~5MB storage cap
 * while still restoring the world exactly as it was left. Every envelope carries
 * a schema version and the world seed; incompatible saves are rejected, not
 * upgraded.
 *
 * Pure functions here (serialize/deserialize + the economy codec) are testable
 * in the node vitest env; the slot wrappers take an injectable Storage so they
 * are too.
 */
import type { WorldData } from '../data/worldLoader';
import type { GameState } from '../ui/store';
import type { GameDate } from '../sim/calendar';
import type { EconomyState, MarketState } from '../trade/economy';
import { goodsStockedByBurg, type MarketClass } from '../trade/markets';

export const SAVE_VERSION = 1;
export const SLOT_COUNT = 4;

const slotKey = (i: number) => `lepasoul.save.${i}`;
const round2 = (n: number) => Math.round(n * 100) / 100;

interface EncodedMarket {
  b: number; // burg id
  c: MarketClass;
  s: number[]; // stock, in goodsStockedByBurg order
  p: number[]; // price, same order
}

interface EncodedEconomy {
  week: number;
  seed: number;
  markets: EncodedMarket[];
}

/** Everything in GameState except the economy Map (encoded) and render-only fields. */
type SerializedState = Omit<GameState, 'economy' | 'jump' | 'focus'> & { economy: EncodedEconomy };

export interface SaveMeta {
  savedAt: number; // real-world epoch ms
  inGameDate: GameDate;
  playerName: string;
  className: string;
  locationName: string;
}

export interface SaveEnvelope {
  version: number;
  worldSeed: string;
  meta: SaveMeta;
  state: SerializedState;
}

// --- economy codec -----------------------------------------------------------
export function encodeEconomy(econ: EconomyState, wd: WorldData): EncodedEconomy {
  const markets: EncodedMarket[] = [];
  for (const m of econ.markets.values()) {
    const burg = wd.burgById.get(m.burgId);
    if (!burg) continue;
    const ids = goodsStockedByBurg(burg);
    const s: number[] = [];
    const p: number[] = [];
    for (const good of ids) {
      s.push(round2(m.stock[good.id] ?? 0));
      p.push(round2(m.price[good.id] ?? 0));
    }
    markets.push({ b: m.burgId, c: m.cls, s, p });
  }
  return { week: econ.week, seed: econ.seed, markets };
}

export function decodeEconomy(enc: EncodedEconomy, wd: WorldData): EconomyState {
  const markets = new Map<number, MarketState>();
  for (const em of enc.markets) {
    const burg = wd.burgById.get(em.b);
    if (!burg) continue;
    const ids = goodsStockedByBurg(burg);
    const stock: Record<string, number> = {};
    const price: Record<string, number> = {};
    for (let i = 0; i < ids.length; i++) {
      stock[ids[i].id] = em.s[i] ?? 0;
      price[ids[i].id] = em.p[i] ?? 0;
    }
    markets.set(em.b, { burgId: em.b, cls: em.c, stock, price, prev: { ...price } });
  }
  return { week: enc.week, seed: enc.seed, markets };
}

// --- envelope (de)serialization ---------------------------------------------
function locationName(state: GameState, wd: WorldData): string {
  const p = state.player;
  if (!p) return 'Unknown';
  const cell = wd.geometry.cells[p.location.cellId];
  const burg = cell?.burg ? wd.burgById.get(cell.burg) : undefined;
  return burg?.name ?? p.location.placeName ?? p.location.stateName ?? 'the wilds';
}

export function serializeGame(state: GameState, wd: WorldData): SaveEnvelope {
  const { economy, jump: _jump, focus: _focus, ...rest } = state;
  const meta: SaveMeta = {
    savedAt: Date.now(),
    inGameDate: state.date,
    playerName: state.player?.name ?? 'Unnamed',
    className: state.player?.className ?? '',
    locationName: locationName(state, wd),
  };
  return {
    version: SAVE_VERSION,
    worldSeed: wd.geometry.seed,
    meta,
    state: { ...rest, economy: encodeEconomy(economy, wd) },
  };
}

/** True if an envelope can be loaded into the currently-loaded world. */
export function isCompatible(env: SaveEnvelope, wd: WorldData): boolean {
  return env.version === SAVE_VERSION && env.worldSeed === wd.geometry.seed;
}

/** Reconstruct a full GameState, or null if the save is incompatible. */
export function deserializeGame(env: SaveEnvelope, wd: WorldData): GameState | null {
  if (!isCompatible(env, wd)) return null;
  const { economy, ...rest } = env.state;
  return {
    ...rest,
    economy: decodeEconomy(economy, wd),
    jump: null,
    focus: null,
  };
}

// --- slot storage (injectable) ----------------------------------------------
type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

function defaultStorage(): StorageLike | null {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null; // access can throw in sandboxed/SSR contexts
  }
}

export interface WriteResult {
  ok: boolean;
  error?: string;
}

export function writeSlot(
  i: number,
  env: SaveEnvelope,
  storage: StorageLike | null = defaultStorage(),
): WriteResult {
  if (!storage) return { ok: false, error: 'Browser storage is unavailable.' };
  try {
    storage.setItem(slotKey(i), JSON.stringify(env));
    return { ok: true };
  } catch (e) {
    const quota = e instanceof Error && /quota|exceeded/i.test(`${e.name} ${e.message}`);
    return { ok: false, error: quota ? 'Not enough browser storage for this save.' : String(e) };
  }
}

export function readSlot(i: number, storage: StorageLike | null = defaultStorage()): SaveEnvelope | null {
  if (!storage) return null;
  const raw = storage.getItem(slotKey(i));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SaveEnvelope;
  } catch {
    return null; // corrupt slot
  }
}

export function deleteSlot(i: number, storage: StorageLike | null = defaultStorage()): void {
  storage?.removeItem(slotKey(i));
}

export function listSlotMeta(storage: StorageLike | null = defaultStorage()): (SaveMeta | null)[] {
  return Array.from({ length: SLOT_COUNT }, (_, i) => readSlot(i, storage)?.meta ?? null);
}
