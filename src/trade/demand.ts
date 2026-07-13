/**
 * Demand model (framework §3.5): how much of each stocked good a burg's market
 * consumes per week. Demand scales with population and is gated by market class
 * (a village wants only staples; a grand market wants a bit of everything), with
 * a light culture taste bump so a good's home culture keeps some appetite for it
 * and its source price doesn't collapse to the floor.
 */
import type { Burg } from '../data/types';
import type { WorldData } from '../data/worldLoader';
import { type Good, type GoodTier } from './goods';
import { marketClass, goodsStockedByBurg, type MarketClass } from './markets';

/** Per-capita weekly appetite of a market class for each good tier. */
const TIER_DEMAND: Record<MarketClass, Record<GoodTier, number>> = {
  grand: { staple: 1.0, commodity: 0.5, luxury: 0.25, special: 0.15 },
  town: { staple: 1.0, commodity: 0.4, luxury: 0.12, special: 0.05 },
  village: { staple: 1.0, commodity: 0.2, luxury: 0.06, special: 0.02 },
};

/** Population units so a 1,000-soul burg demands ~1 base unit of a staple. */
const POP_SCALE = 1000;

/** Local taste: a burg whose culture produces a good keeps demand for it. */
function cultureTaste(wd: WorldData, burg: Burg, good: Good): number {
  const culture = wd.cultureById.get(burg.culture)?.name ?? '';
  for (const rule of good.productionRules) {
    if (rule.kind === 'culture' && culture.startsWith(rule.culturePrefix)) return 1.3;
  }
  return 1.0;
}

/** Weekly demand for each good this burg's market carries. */
export function burgWeeklyDemand(wd: WorldData, burg: Burg): Record<string, number> {
  const cls = marketClass(burg);
  const popUnits = Math.max(0.2, burg.population / POP_SCALE);
  const out: Record<string, number> = {};
  for (const good of goodsStockedByBurg(burg)) {
    const perCapita = TIER_DEMAND[cls][good.tier];
    out[good.id] = perCapita * popUnits * cultureTaste(wd, burg, good);
  }
  return out;
}
