/**
 * Supply model (framework §3): weekly production of each good is derived from
 * the world's cells — biome, state economic type, culture, mines and ports —
 * not hand-painted. We aggregate per province (the unit the market/diffusion
 * layer reasons about) and then hand a population-weighted share to each of the
 * province's burgs. Built once per WorldData and memoized.
 */
import type { WorldData } from '../data/worldLoader';
import type { Burg, Cell } from '../data/types';
import { GOODS, type Good, type MineResource, type StateEconType } from './goods';

/** provinceId → (goodId → weekly production units). */
export type ProvinceProduction = Map<number, Record<string, number>>;

export interface ProductionModel {
  byProvince: ProvinceProduction;
  /** provinceId → summed population of burgs sitting in it. */
  burgPopByProvince: Map<number, number>;
  /** burg.i → its province id (via its cell). */
  provinceOfBurg: Map<number, number>;
}

/** Weekly output a lone suitable-but-empty cell still yields (wilderness). */
const WILDERNESS_BASE = 1;

/** A mine is a concentrated point source: a fixed injection, not pop-weighted. */
const MINE_OUTPUT = 500;

const KNOWN_STATE_TYPES: StateEconType[] = ['Nomadic', 'Naval', 'Hunting', 'Highland', 'Generic'];

function stateEconType(wd: WorldData, stateId: number): StateEconType {
  const t = wd.stateById.get(stateId)?.type;
  return (KNOWN_STATE_TYPES as string[]).includes(t ?? '') ? (t as StateEconType) : 'Generic';
}

/** Map every mine marker to its cell and resource (parsed from its name). */
function mineCellsByResource(wd: WorldData): Map<number, MineResource> {
  const out = new Map<number, MineResource>();
  for (const m of wd.world.markers) {
    if (m.type !== 'mines') continue;
    const name = (m.name ?? '').toLowerCase();
    const res: MineResource | null = name.includes('iron')
      ? 'iron'
      : name.includes('salt')
        ? 'salt'
        : name.includes('silver')
          ? 'silver'
          : null;
    if (res) out.set(m.cell, res);
  }
  return out;
}

/**
 * Sum the pop-weighted production-rule multipliers that match this cell. Mines
 * are handled separately as an absolute point source (they would otherwise be
 * diluted to nothing across a whole province).
 */
function cellRuleMultiplier(
  good: Good,
  cell: Cell,
  econType: StateEconType,
  culturePrefix: string,
  cellIsPort: boolean,
): number {
  let mult = 0;
  for (const rule of good.productionRules) {
    switch (rule.kind) {
      case 'biome':
        if (cell.biome === rule.biome) mult += rule.mult;
        break;
      case 'stateType':
        if (econType === rule.stateType) mult += rule.mult;
        break;
      case 'culture':
        if (culturePrefix.startsWith(rule.culturePrefix)) mult += rule.mult;
        break;
      case 'port':
        if (cellIsPort) mult += rule.mult;
        break;
      case 'base':
        mult += rule.mult;
        break;
      case 'mine':
        break; // point source, added separately
    }
  }
  return mult;
}

const CACHE = new WeakMap<WorldData, ProductionModel>();

export function buildProduction(wd: WorldData): ProductionModel {
  const cached = CACHE.get(wd);
  if (cached) return cached;

  const mines = mineCellsByResource(wd);
  const byProvince: ProvinceProduction = new Map();

  for (const cell of wd.geometry.cells) {
    if (cell.h < 20) continue; // water produces nothing
    const provId = cell.province;
    if (provId <= 0) continue;

    const econType = stateEconType(wd, cell.state);
    const culturePrefix = wd.cultureById.get(cell.culture)?.name ?? '';
    const mineRes = mines.get(cell.i);
    const cellIsPort = cell.burg > 0 && (wd.burgById.get(cell.burg)?.port ?? false);
    const weight = cell.pop + WILDERNESS_BASE;

    let row = byProvince.get(provId);
    if (!row) {
      row = {};
      byProvince.set(provId, row);
    }
    for (const good of GOODS) {
      const mult = cellRuleMultiplier(good, cell, econType, culturePrefix, cellIsPort);
      if (mult > 0) row[good.id] = (row[good.id] ?? 0) + mult * weight;
      // Mine point source: an absolute injection where the seam actually is.
      if (mineRes) {
        for (const rule of good.productionRules) {
          if (rule.kind === 'mine' && rule.resource === mineRes) {
            row[good.id] = (row[good.id] ?? 0) + rule.mult * MINE_OUTPUT;
          }
        }
      }
    }
  }

  // Attribute each burg to its cell's province and tally burg population there.
  const provinceOfBurg = new Map<number, number>();
  const burgPopByProvince = new Map<number, number>();
  for (const burg of wd.world.burgs) {
    const provId = wd.geometry.cells[burg.cell]?.province ?? 0;
    if (provId <= 0) continue;
    provinceOfBurg.set(burg.i, provId);
    burgPopByProvince.set(provId, (burgPopByProvince.get(provId) ?? 0) + burg.population);
  }

  const model: ProductionModel = { byProvince, burgPopByProvince, provinceOfBurg };
  CACHE.set(wd, model);
  return model;
}

/**
 * A burg's weekly share of its province's production, split among the
 * province's burgs by population (so the trading towns get the goods).
 */
export function burgWeeklyProduction(model: ProductionModel, burg: Burg): Record<string, number> {
  const provId = model.provinceOfBurg.get(burg.i);
  if (provId == null) return {};
  const provProd = model.byProvince.get(provId);
  if (!provProd) return {};
  const provPop = model.burgPopByProvince.get(provId) ?? 0;
  const share = provPop > 0 ? burg.population / provPop : 1;
  const out: Record<string, number> = {};
  for (const [goodId, units] of Object.entries(provProd)) {
    out[goodId] = units * share;
  }
  return out;
}

/** Total production of a good across all provinces (for diagnostics/tests). */
export function totalProduction(model: ProductionModel, goodId: string): number {
  let sum = 0;
  for (const row of model.byProvince.values()) sum += row[goodId] ?? 0;
  return sum;
}
